package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sort"
	"strings"

	"github.com/devinitive-team/mirage/internal/domain"
	"github.com/devinitive-team/mirage/internal/port"
)

const (
	defaultMaxRetrievalIterations = 3
	maxCollectedContentChars      = 120000
	maxEvidenceItems              = 32
)

type Retrieval struct {
	llm           port.LLMProvider
	storage       port.Storage
	maxIterations int
}

func NewRetrieval(llm port.LLMProvider, storage port.Storage, maxIterations int) *Retrieval {
	return &Retrieval{
		llm:           llm,
		storage:       storage,
		maxIterations: maxIterations,
	}
}

type branchSelection struct {
	SelectedCandidates []selectedCandidate `json:"selected_candidates"`
	Reasoning          string              `json:"reasoning"`
}

type selectedCandidate struct {
	DocumentID string `json:"document_id"`
	NodeID     string `json:"node_id"`
	PageStart  int    `json:"page_start"`
	PageEnd    int    `json:"page_end"`
}

type answerResponse struct {
	Answer json.RawMessage `json:"answer"`
}

type candidateNode struct {
	DocumentID string
	NodeID     string
	Title      string
	Summary    string
	StartPage  int
	EndPage    int
	Children   []candidateNode
}

func (c candidateNode) selectionKey() string {
	return fmt.Sprintf("%s|%s|%d|%d", c.DocumentID, c.NodeID, c.StartPage, c.EndPage)
}

func (c selectedCandidate) selectionKey() string {
	return fmt.Sprintf(
		"%s|%s|%d|%d",
		strings.TrimSpace(c.DocumentID),
		strings.TrimSpace(c.NodeID),
		c.PageStart,
		c.PageEnd,
	)
}

func (s *Retrieval) Answer(ctx context.Context, query domain.Query) (domain.QueryResult, error) {
	if strings.TrimSpace(query.Question) == "" {
		err := fmt.Errorf("question is required")
		slog.ErrorContext(ctx, "retrieval failed", "stage", "validate_query", "error", err)
		return domain.QueryResult{}, err
	}

	trees, docs, err := s.loadQueryContext(ctx, query.DocumentIDs)
	if err != nil {
		slog.ErrorContext(
			ctx,
			"retrieval failed",
			"stage",
			"load_query_context",
			"error",
			err,
			"document_count",
			len(query.DocumentIDs),
		)
		return domain.QueryResult{}, err
	}

	frontier := s.initialCandidates(trees)
	if len(frontier) == 0 {
		err := fmt.Errorf("no retrieval candidates available")
		slog.ErrorContext(ctx, "retrieval failed", "stage", "initialize_frontier", "error", err)
		return domain.QueryResult{}, err
	}
	maxIterations := normalizeMaxIterations(s.maxIterations)

	var collectedContent strings.Builder
	evidence := make([]domain.Evidence, 0)
	evidenceByKey := make(map[string]struct{})

	for iteration := 0; iteration < maxIterations && len(frontier) > 0; iteration++ {
		slog.InfoContext(
			ctx,
			"retrieval frontier",
			"iteration",
			iteration,
			"frontier_size",
			len(frontier),
			"frontier",
			summarizeCandidates(frontier, 24),
		)

		selection, err := s.selectBranches(ctx, query.Question, frontier, iteration)
		if err != nil {
			slog.ErrorContext(
				ctx,
				"retrieval failed",
				"stage",
				"select_branches",
				"iteration",
				iteration,
				"error",
				err,
			)
			return domain.QueryResult{}, err
		}
		slog.InfoContext(
			ctx,
			"retrieval selected_candidates response",
			"iteration",
			iteration,
			"selected_candidate_count",
			len(selection.SelectedCandidates),
			"selected_candidate_keys",
			summarizeSelectedCandidateKeys(selection.SelectedCandidates, 24),
		)

		selected := normalizeSelectedCandidates(frontier, selection.SelectedCandidates)
		slog.InfoContext(
			ctx,
			"retrieval selected candidates normalized",
			"iteration",
			iteration,
			"selected_size",
			len(selected),
			"selected",
			summarizeCandidates(selected, 24),
		)
		if len(selected) == 0 {
			err := fmt.Errorf("selected_candidates did not match available candidates")
			slog.ErrorContext(
				ctx,
				"retrieval failed",
				"stage",
				"validate_branch_selection",
				"iteration",
				iteration,
				"error",
				err,
				"available_candidates",
				len(frontier),
				"frontier",
				summarizeCandidates(frontier, 24),
				"selected_candidate_keys",
				summarizeSelectedCandidateKeys(selection.SelectedCandidates, 24),
			)
			return domain.QueryResult{}, err
		}

		nextFrontier := make([]candidateNode, 0)
		nextFrontierByKey := make(map[string]struct{})

		for _, cand := range selected {
			if len(cand.Children) == 0 {
				pages, err := s.storage.GetPageRange(ctx, cand.DocumentID, cand.StartPage, cand.EndPage)
				if err != nil {
					wrappedErr := fmt.Errorf("get pages %s [%d-%d]: %w", cand.DocumentID, cand.StartPage, cand.EndPage, err)
					slog.ErrorContext(
						ctx,
						"retrieval failed",
						"stage",
						"load_leaf_pages",
						"iteration",
						iteration,
						"document_id",
						cand.DocumentID,
						"node_id",
						cand.NodeID,
						"page_start",
						cand.StartPage,
						"page_end",
						cand.EndPage,
						"error",
						wrappedErr,
					)
					return domain.QueryResult{}, wrappedErr
				}
				appendCollectedContent(&collectedContent, cand, pages)

				key := cand.selectionKey()
				if _, exists := evidenceByKey[key]; exists {
					continue
				}

				docName := ""
				if doc, ok := docs[cand.DocumentID]; ok {
					docName = doc.Name
				}

				evidence = append(evidence, domain.Evidence{
					DocumentID:   cand.DocumentID,
					DocumentName: docName,
					NodeID:       cand.NodeID,
					NodeTitle:    cand.Title,
					PageStart:    cand.StartPage,
					PageEnd:      cand.EndPage,
				})
				evidenceByKey[key] = struct{}{}
				if len(evidence) >= maxEvidenceItems {
					break
				}
				continue
			}

			for _, child := range cand.Children {
				key := child.selectionKey()
				if _, exists := nextFrontierByKey[key]; exists {
					continue
				}
				nextFrontierByKey[key] = struct{}{}
				nextFrontier = append(nextFrontier, child)
			}
		}

		if len(evidence) >= maxEvidenceItems {
			break
		}
		if len(nextFrontier) == 0 {
			break
		}

		frontier = nextFrontier
	}

	if len(evidence) == 0 {
		err := fmt.Errorf("retrieval completed without evidence")
		slog.ErrorContext(
			ctx,
			"retrieval failed",
			"stage",
			"finalize_evidence",
			"error",
			err,
			"max_iterations",
			maxIterations,
		)
		return domain.QueryResult{}, err
	}

	answer, err := s.generateAnswer(ctx, query.Question, collectedContent.String())
	if err != nil {
		slog.ErrorContext(ctx, "retrieval failed", "stage", "generate_answer", "error", err)
		return domain.QueryResult{}, err
	}
	answer = strings.TrimSpace(answer)
	if answer == "" {
		err := fmt.Errorf("answer is empty")
		slog.ErrorContext(ctx, "retrieval failed", "stage", "validate_answer", "error", err)
		return domain.QueryResult{}, err
	}

	return domain.QueryResult{
		Answer:   answer,
		Evidence: evidence,
	}, nil
}

func (s *Retrieval) loadQueryContext(ctx context.Context, documentIDs []string) (map[string]domain.TreeIndex, map[string]domain.Document, error) {
	trees := make(map[string]domain.TreeIndex)
	docs := make(map[string]domain.Document)
	for _, docID := range documentIDs {
		tree, err := s.storage.GetTree(ctx, docID)
		if err != nil {
			return nil, nil, fmt.Errorf("get tree %s: %w", docID, err)
		}
		trees[docID] = tree

		doc, err := s.storage.GetDocument(ctx, docID)
		if err != nil {
			return nil, nil, fmt.Errorf("get document %s: %w", docID, err)
		}
		docs[docID] = doc
	}
	return trees, docs, nil
}

func normalizeMaxIterations(value int) int {
	if value < 1 {
		return defaultMaxRetrievalIterations
	}
	return value
}

func appendCollectedContent(collected *strings.Builder, candidate candidateNode, pages []domain.Page) {
	for _, page := range pages {
		chunk := fmt.Sprintf("[Doc:%s Page:%d Node:%s]\n%s\n\n", candidate.DocumentID, page.Index, candidate.NodeID, page.Markdown)
		if collected.Len()+len(chunk) > maxCollectedContentChars {
			return
		}
		collected.WriteString(chunk)
	}
}

func (s *Retrieval) initialCandidates(trees map[string]domain.TreeIndex) []candidateNode {
	var candidates []candidateNode
	docIDs := make([]string, 0, len(trees))
	for docID := range trees {
		docIDs = append(docIDs, docID)
	}
	sort.Strings(docIDs)

	for _, docID := range docIDs {
		tree := trees[docID]
		for _, child := range tree.Root.Children {
			candidates = append(candidates, treeNodeToCandidate(docID, child))
		}
	}
	return candidates
}

func treeNodeToCandidate(docID string, node domain.TreeNode) candidateNode {
	cand := candidateNode{
		DocumentID: docID,
		NodeID:     node.NodeID,
		Title:      node.Title,
		Summary:    node.Summary,
		StartPage:  node.StartPage,
		EndPage:    node.EndPage,
	}
	for _, child := range node.Children {
		cand.Children = append(cand.Children, treeNodeToCandidate(docID, child))
	}
	return cand
}

func (s *Retrieval) selectBranches(ctx context.Context, question string, candidates []candidateNode, iteration int) (branchSelection, error) {
	var sb strings.Builder
	for _, c := range candidates {
		fmt.Fprintf(&sb, "- [%s] %s (doc %s, pages %d-%d): %s\n", c.selectionKey(), c.Title, c.DocumentID, c.StartPage, c.EndPage, c.Summary)
	}

	messages := []port.ChatMessage{
		{
			Role:    "system",
			Content: "Select relevant sections. Return JSON only.",
		},
		{
			Role: "user",
			Content: fmt.Sprintf(
				"Question: %s\n\nAvailable sections (iteration %d):\n%s\n\nReturn selected_candidates as objects with these exact fields copied from the list: document_id, node_id, page_start, page_end. Do not return labels or extra text.",
				question,
				iteration,
				sb.String(),
			),
		},
	}

	schema := `{
		"type": "object",
		"additionalProperties": false,
		"properties": {
			"selected_candidates": {
				"type": "array",
				"items": {
					"type": "object",
					"additionalProperties": false,
					"properties": {
						"document_id": { "type": "string" },
						"node_id": { "type": "string" },
						"page_start": { "type": "integer" },
						"page_end": { "type": "integer" }
					},
					"required": ["document_id", "node_id", "page_start", "page_end"]
				}
			},
			"reasoning": { "type": "string" }
		},
		"required": ["selected_candidates", "reasoning"]
	}`

	var result branchSelection
	if err := s.completeAndDecodeJSON(ctx, messages, schema, &result); err != nil {
		return branchSelection{}, fmt.Errorf("decode branch selection: %w", err)
	}

	return result, nil
}

func normalizeSelectedCandidates(candidates []candidateNode, selected []selectedCandidate) []candidateNode {
	candidateByKey := make(map[string]candidateNode, len(candidates))
	for _, cand := range candidates {
		candidateByKey[cand.selectionKey()] = cand
	}

	filtered := make([]candidateNode, 0, len(selected))
	seen := make(map[string]struct{}, len(selected))
	for _, raw := range selected {
		key := raw.selectionKey()
		if key == "" {
			continue
		}

		cand, ok := candidateByKey[key]
		if !ok {
			continue
		}

		selectionKey := cand.selectionKey()
		if _, exists := seen[selectionKey]; exists {
			continue
		}
		seen[selectionKey] = struct{}{}
		filtered = append(filtered, cand)
	}
	return filtered
}

func summarizeCandidates(candidates []candidateNode, limit int) []string {
	if limit < 1 {
		limit = 1
	}

	summary := make([]string, 0, min(limit, len(candidates)))
	for i, cand := range candidates {
		if i >= limit {
			break
		}

		title := strings.TrimSpace(cand.Title)
		if title == "" {
			title = "<untitled>"
		}

		summary = append(summary, fmt.Sprintf("%s [%s]", cand.selectionKey(), title))
	}

	if len(candidates) > limit {
		summary = append(summary, fmt.Sprintf("... +%d more", len(candidates)-limit))
	}

	return summary
}

func summarizeSelectedCandidateKeys(candidates []selectedCandidate, limit int) []string {
	if limit < 1 {
		limit = 1
	}

	summary := make([]string, 0, min(limit, len(candidates)))
	for i, cand := range candidates {
		if i >= limit {
			break
		}
		summary = append(summary, cand.selectionKey())
	}

	if len(candidates) > limit {
		summary = append(summary, fmt.Sprintf("... +%d more", len(candidates)-limit))
	}

	return summary
}

func (s *Retrieval) generateAnswer(ctx context.Context, question, collected string) (string, error) {
	messages := []port.ChatMessage{
		{Role: "system", Content: "Answer the question from source content. Return JSON only."},
		{
			Role: "user",
			Content: fmt.Sprintf(
				"Question: %s\n\nSource content:\n%s\n\nReturn {\"answer\": \"...\"} with answer as a plain string.",
				question,
				collected,
			),
		},
	}

	schema := `{
		"type": "object",
		"additionalProperties": false,
		"properties": {
			"answer": { "type": "string" }
		},
		"required": ["answer"]
	}`

	var resp answerResponse
	if err := s.completeAndDecodeJSON(ctx, messages, schema, &resp); err != nil {
		return "", fmt.Errorf("decode answer: %w", err)
	}

	answer, err := parseAnswerText(resp.Answer)
	if err != nil {
		return "", fmt.Errorf("parse answer text: %w", err)
	}

	return answer, nil
}

func (s *Retrieval) completeAndDecodeJSON(ctx context.Context, messages []port.ChatMessage, schema string, out any) error {
	raw, err := s.llm.CompleteJSON(ctx, messages, schema)
	if err != nil {
		return fmt.Errorf("llm complete json: %w", err)
	}
	if err := unmarshalLLMJSON(raw, out); err != nil {
		return fmt.Errorf("unmarshal llm json: %w", err)
	}
	return nil
}

func parseAnswerText(raw json.RawMessage) (string, error) {
	if len(raw) == 0 {
		return "", fmt.Errorf("answer field missing")
	}

	var plain string
	if err := json.Unmarshal(raw, &plain); err == nil {
		return plain, nil
	}

	var wrapped struct {
		Text    string `json:"text"`
		Content string `json:"content"`
		Answer  string `json:"answer"`
	}
	if err := json.Unmarshal(raw, &wrapped); err == nil {
		switch {
		case wrapped.Text != "":
			return wrapped.Text, nil
		case wrapped.Content != "":
			return wrapped.Content, nil
		case wrapped.Answer != "":
			return wrapped.Answer, nil
		}
	}

	return "", fmt.Errorf("unsupported answer format")
}

func unmarshalLLMJSON(raw string, out any) error {
	candidates := []string{strings.TrimSpace(raw)}

	extracted := extractJSONPayload(raw)
	if extracted != "" && extracted != candidates[0] {
		candidates = append(candidates, extracted)
	}

	for _, candidate := range candidates {
		if err := json.Unmarshal([]byte(candidate), out); err == nil {
			return nil
		}

		normalized := normalizeJSON(candidate)
		if normalized != candidate {
			if err := json.Unmarshal([]byte(normalized), out); err == nil {
				return nil
			}
		}
	}

	return fmt.Errorf("invalid json payload")
}

func extractJSONPayload(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}

	if start := strings.Index(trimmed, "```json"); start >= 0 {
		block := trimmed[start+len("```json"):]
		if end := strings.Index(block, "```"); end >= 0 {
			return strings.TrimSpace(block[:end])
		}
	}

	if start := strings.Index(trimmed, "```"); start >= 0 {
		block := trimmed[start+len("```"):]
		if end := strings.Index(block, "```"); end >= 0 {
			block = strings.TrimSpace(block[:end])
			block = strings.TrimPrefix(block, "json")
			block = strings.TrimSpace(block)
			if block != "" {
				return block
			}
		}
	}

	if start, end := strings.Index(trimmed, "{"), strings.LastIndex(trimmed, "}"); start >= 0 && end > start {
		return strings.TrimSpace(trimmed[start : end+1])
	}
	if start, end := strings.Index(trimmed, "["), strings.LastIndex(trimmed, "]"); start >= 0 && end > start {
		return strings.TrimSpace(trimmed[start : end+1])
	}

	return trimmed
}

func normalizeJSON(raw string) string {
	cleaned := strings.TrimSpace(raw)
	if cleaned == "" {
		return ""
	}

	cleaned = strings.NewReplacer("None", "null", "\r", " ", "\n", " ").Replace(cleaned)
	cleaned = strings.Join(strings.Fields(cleaned), " ")
	cleaned = strings.ReplaceAll(cleaned, ",}", "}")
	cleaned = strings.ReplaceAll(cleaned, ",]", "]")

	return cleaned
}
