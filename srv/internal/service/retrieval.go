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
	storage       retrievalStore
	maxIterations int
}

type retrievalStore interface {
	GetTree(ctx context.Context, docID string) (domain.TreeIndex, error)
	GetDocument(ctx context.Context, id string) (domain.Document, error)
	GetPageRange(ctx context.Context, docID string, start, end int) ([]domain.Page, error)
}

func NewRetrieval(llm port.LLMProvider, storage retrievalStore, maxIterations int) *Retrieval {
	return &Retrieval{
		llm:           llm,
		storage:       storage,
		maxIterations: maxIterations,
	}
}

type branchSelection struct {
	NodeList []string `json:"node_list"`
	Thinking string   `json:"thinking"`
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

func (c candidateNode) nodeRef() string {
	return fmt.Sprintf("%s:%s", c.DocumentID, c.NodeID)
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
		slog.InfoContext(ctx, "retrieval frontier", "iteration", iteration, "frontier_size", len(frontier))

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
		slog.InfoContext(ctx, "retrieval branch selection", "iteration", iteration, "node_count", len(selection.NodeList))

		selected := normalizeSelectedCandidates(frontier, selection.NodeList)
		slog.InfoContext(ctx, "retrieval candidates matched", "iteration", iteration, "selected", len(selected))
		if len(selected) == 0 {
			err := fmt.Errorf("node_list did not match available candidates")
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

				key := cand.nodeRef()
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
				key := child.nodeRef()
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
		fmt.Fprintf(&sb, "- [%s] %s (doc %s, pages %d-%d): %s\n", c.nodeRef(), c.Title, c.DocumentID, c.StartPage, c.EndPage, c.Summary)
	}

	messages := []port.ChatMessage{
		{
			Role:    "system",
			Content: "Select relevant sections. Return JSON only.",
		},
		{
			Role: "user",
			Content: fmt.Sprintf(
				"Question: %s\n\nAvailable sections (iteration %d):\n%s\n\nReturn JSON only with keys \"thinking\" and \"node_list\". node_list must be an array of node refs copied exactly from the bracketed refs in Available sections.",
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
			"node_list": {
				"type": "array",
				"items": { "type": "string" }
			},
			"thinking": { "type": "string" }
		},
		"required": ["node_list", "thinking"]
	}`

	var result branchSelection
	if err := completeAndDecodeJSON(ctx, s.llm, messages, schema, &result); err != nil {
		return branchSelection{}, fmt.Errorf("decode branch selection: %w", err)
	}

	return result, nil
}

func normalizeSelectedCandidates(candidates []candidateNode, nodeList []string) []candidateNode {
	candidateByNodeRef := make(map[string]candidateNode, len(candidates))
	for _, cand := range candidates {
		candidateByNodeRef[cand.nodeRef()] = cand
	}

	filtered := make([]candidateNode, 0, len(nodeList))
	seen := make(map[string]struct{}, len(nodeList))
	for _, raw := range nodeList {
		nodeRef := strings.TrimSpace(raw)
		if nodeRef == "" {
			continue
		}

		cand, ok := candidateByNodeRef[nodeRef]
		if !ok {
			continue
		}

		if _, exists := seen[nodeRef]; exists {
			continue
		}
		seen[nodeRef] = struct{}{}
		filtered = append(filtered, cand)
	}
	return filtered
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
	if err := completeAndDecodeJSON(ctx, s.llm, messages, schema, &resp); err != nil {
		return "", fmt.Errorf("decode answer: %w", err)
	}

	answer, err := parseAnswerText(resp.Answer)
	if err != nil {
		return "", fmt.Errorf("parse answer text: %w", err)
	}

	return answer, nil
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
