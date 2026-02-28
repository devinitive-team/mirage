package service

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	"github.com/devinitive-team/mirage/internal/domain"
	"github.com/devinitive-team/mirage/internal/port"
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
	SelectedNodes []string `json:"selected_nodes"`
	Reasoning     string   `json:"reasoning"`
}

type sufficiencyCheck struct {
	Sufficient bool   `json:"sufficient"`
	Reasoning  string `json:"reasoning"`
}

type answerResponse struct {
	Answer json.RawMessage `json:"answer"`
}

func (s *Retrieval) Answer(ctx context.Context, query domain.Query) (domain.QueryResult, error) {
	trees := make(map[string]domain.TreeIndex)
	docs := make(map[string]domain.Document)
	for _, docID := range query.DocumentIDs {
		tree, err := s.storage.GetTree(ctx, docID)
		if err != nil {
			return domain.QueryResult{}, fmt.Errorf("get tree %s: %w", docID, err)
		}
		trees[docID] = tree

		doc, err := s.storage.GetDocument(ctx, docID)
		if err != nil {
			return domain.QueryResult{}, fmt.Errorf("get document %s: %w", docID, err)
		}
		docs[docID] = doc
	}

	var collectedContent strings.Builder
	evidenceByKey := make(map[string]struct{})
	evidence := make([]domain.Evidence, 0)
	explorationQueue := s.initialCandidates(trees)

	for iteration := range s.maxIterations {
		if len(explorationQueue) == 0 {
			break
		}

		selection, err := s.selectBranches(ctx, query.Question, explorationQueue, &collectedContent, iteration)
		if err != nil {
			selection = branchSelection{
				SelectedNodes: selectAllCandidateNodeIDs(explorationQueue),
				Reasoning:     "fallback: select all nodes due to select branch error",
			}
		}
		selection.SelectedNodes = normalizeSelectedNodeIDs(explorationQueue, selection.SelectedNodes)
		if len(selection.SelectedNodes) == 0 {
			selection.SelectedNodes = selectAllCandidateNodeIDs(explorationQueue)
		}

		selectedMap := make(map[string]bool)
		for _, id := range selection.SelectedNodes {
			selectedMap[id] = true
		}

		var nextQueue []candidateNode
		for _, cand := range explorationQueue {
			if !selectedMap[cand.NodeID] {
				continue
			}

			if len(cand.Children) == 0 {
				pages, err := s.storage.GetPageRange(ctx, cand.DocumentID, cand.StartPage, cand.EndPage)
				if err != nil {
					return domain.QueryResult{}, fmt.Errorf("get pages %s [%d-%d]: %w", cand.DocumentID, cand.StartPage, cand.EndPage, err)
				}
				for _, p := range pages {
					fmt.Fprintf(&collectedContent, "[Doc:%s Page:%d Node:%s]\n%s\n\n", cand.DocumentID, p.Index, cand.NodeID, p.Markdown)
				}

				key := fmt.Sprintf("%s|%s|%d|%d", cand.DocumentID, cand.NodeID, cand.StartPage, cand.EndPage)
				if _, exists := evidenceByKey[key]; !exists {
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
						Snippet:      buildEvidenceSnippet(pages),
					})
					evidenceByKey[key] = struct{}{}
				}
			} else {
				nextQueue = append(nextQueue, cand.Children...)
			}
		}

		sufficient, err := s.checkSufficiency(ctx, query.Question, &collectedContent)
		if err != nil {
			sufficient = sufficiencyCheck{
				Sufficient: len(nextQueue) == 0,
				Reasoning:  "fallback: sufficiency unavailable",
			}
		}
		if sufficient.Sufficient {
			break
		}

		explorationQueue = nextQueue
	}

	answer, err := s.generateAnswer(ctx, query, &collectedContent)
	if err != nil || strings.TrimSpace(answer) == "" {
		answer = fallbackAnswerText(query.Question, &collectedContent, evidence)
	}

	return domain.QueryResult{
		Answer:   answer,
		Evidence: evidence,
	}, nil
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

func (s *Retrieval) selectBranches(ctx context.Context, question string, candidates []candidateNode, collected *strings.Builder, iteration int) (branchSelection, error) {
	var sb strings.Builder
	for _, c := range candidates {
		fmt.Fprintf(&sb, "- [%s] %s (pages %d-%d): %s\n", c.NodeID, c.Title, c.StartPage, c.EndPage, c.Summary)
	}

	contextNote := ""
	if collected.Len() > 0 {
		contextNote = fmt.Sprintf("\n\nContent already collected:\n%s", collected.String())
	}

	messages := []port.ChatMessage{
		{Role: "system", Content: "You are a research assistant. Select the most relevant document sections to answer the user's question."},
		{Role: "user", Content: fmt.Sprintf("Question: %s\n\nAvailable sections (iteration %d):\n%s%s\n\nSelect the node IDs most likely to contain relevant information.", question, iteration, sb.String(), contextNote)},
	}

	schema := `{"selected_nodes": ["string"], "reasoning": "string"}`

	var result branchSelection
	if err := s.completeAndDecodeJSON(ctx, messages, schema, &result); err != nil {
		return branchSelection{}, fmt.Errorf("decode branch selection: %w", err)
	}

	return result, nil
}

func (s *Retrieval) checkSufficiency(ctx context.Context, question string, collected *strings.Builder) (sufficiencyCheck, error) {
	messages := []port.ChatMessage{
		{Role: "system", Content: "You are a research assistant. Determine if the collected content is sufficient to answer the user's question."},
		{Role: "user", Content: fmt.Sprintf("Question: %s\n\nCollected content:\n%s\n\nIs this content sufficient to provide a comprehensive answer?", question, collected.String())},
	}

	schema := `{"sufficient": true, "reasoning": "string"}`

	var result sufficiencyCheck
	if err := s.completeAndDecodeJSON(ctx, messages, schema, &result); err != nil {
		return sufficiencyCheck{}, fmt.Errorf("decode sufficiency check: %w", err)
	}

	return result, nil
}

func buildEvidenceSnippet(pages []domain.Page) string {
	var sb strings.Builder
	for _, page := range pages {
		text := strings.TrimSpace(page.Markdown)
		if text == "" {
			continue
		}
		if sb.Len() > 0 {
			sb.WriteString("\n\n")
		}
		sb.WriteString(text)
	}
	return sb.String()
}

func (s *Retrieval) generateAnswer(ctx context.Context, query domain.Query, collected *strings.Builder) (string, error) {
	messages := []port.ChatMessage{
		{Role: "system", Content: "You are a research assistant. Answer the question based on the provided content."},
		{Role: "user", Content: fmt.Sprintf("Question: %s\n\nSource content:\n%s\n\nProvide a comprehensive answer.", query.Question, collected.String())},
	}

	schema := `{"answer": "string"}`

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

func selectAllCandidateNodeIDs(candidates []candidateNode) []string {
	selected := make([]string, 0, len(candidates))
	for _, cand := range candidates {
		selected = append(selected, cand.NodeID)
	}
	return selected
}

func normalizeSelectedNodeIDs(candidates []candidateNode, selected []string) []string {
	allowed := make(map[string]struct{}, len(candidates))
	for _, cand := range candidates {
		allowed[cand.NodeID] = struct{}{}
	}

	filtered := make([]string, 0, len(selected))
	seen := make(map[string]struct{}, len(selected))
	for _, nodeID := range selected {
		if _, ok := allowed[nodeID]; !ok {
			continue
		}
		if _, dup := seen[nodeID]; dup {
			continue
		}
		seen[nodeID] = struct{}{}
		filtered = append(filtered, nodeID)
	}
	return filtered
}

func fallbackAnswerText(question string, collected *strings.Builder, evidence []domain.Evidence) string {
	const maxLen = 800

	clip := func(text string) string {
		text = strings.TrimSpace(text)
		if len(text) <= maxLen {
			return text
		}
		return text[:maxLen] + "..."
	}

	for _, item := range evidence {
		if snippet := clip(item.Snippet); snippet != "" {
			return fmt.Sprintf("I could not synthesize a complete answer for %q, but this retrieved content is relevant:\n\n%s", question, snippet)
		}
	}

	if snippet := clip(collected.String()); snippet != "" {
		return fmt.Sprintf("I could not synthesize a complete answer for %q, but this retrieved content is relevant:\n\n%s", question, snippet)
	}

	return fmt.Sprintf("I could not synthesize a complete answer for %q, and no relevant source content was retrieved.", question)
}
