package service

import (
	"context"
	"encoding/json"
	"fmt"
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
	Answer    string           `json:"answer"`
	Citations []answerCitation `json:"citations"`
}

type answerCitation struct {
	DocumentID string `json:"document_id"`
	PageNumber int    `json:"page_number"`
	NodeID     string `json:"node_id"`
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
	var visitedNodes []string
	explorationQueue := s.initialCandidates(trees)

	for iteration := range s.maxIterations {
		if len(explorationQueue) == 0 {
			break
		}

		selection, err := s.selectBranches(ctx, query.Question, explorationQueue, &collectedContent, iteration)
		if err != nil {
			return domain.QueryResult{}, fmt.Errorf("select branches iteration %d: %w", iteration, err)
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
			visitedNodes = append(visitedNodes, cand.NodeID)

			if len(cand.Children) == 0 {
				pages, err := s.storage.GetPageRange(ctx, cand.DocumentID, cand.StartPage, cand.EndPage)
				if err != nil {
					return domain.QueryResult{}, fmt.Errorf("get pages %s [%d-%d]: %w", cand.DocumentID, cand.StartPage, cand.EndPage, err)
				}
				for _, p := range pages {
					fmt.Fprintf(&collectedContent, "[Doc:%s Page:%d Node:%s]\n%s\n\n", cand.DocumentID, p.Index, cand.NodeID, p.Markdown)
				}
			} else {
				nextQueue = append(nextQueue, cand.Children...)
			}
		}

		sufficient, err := s.checkSufficiency(ctx, query.Question, &collectedContent)
		if err != nil {
			return domain.QueryResult{}, fmt.Errorf("sufficiency check iteration %d: %w", iteration, err)
		}
		if sufficient.Sufficient {
			break
		}

		explorationQueue = nextQueue
	}

	return s.generateAnswer(ctx, query, docs, &collectedContent)
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
	for docID, tree := range trees {
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

	raw, err := s.llm.CompleteJSON(ctx, messages, schema)
	if err != nil {
		return branchSelection{}, fmt.Errorf("llm complete json: %w", err)
	}

	var result branchSelection
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		return branchSelection{}, fmt.Errorf("unmarshal branch selection: %w", err)
	}

	return result, nil
}

func (s *Retrieval) checkSufficiency(ctx context.Context, question string, collected *strings.Builder) (sufficiencyCheck, error) {
	messages := []port.ChatMessage{
		{Role: "system", Content: "You are a research assistant. Determine if the collected content is sufficient to answer the user's question."},
		{Role: "user", Content: fmt.Sprintf("Question: %s\n\nCollected content:\n%s\n\nIs this content sufficient to provide a comprehensive answer?", question, collected.String())},
	}

	schema := `{"sufficient": true, "reasoning": "string"}`

	raw, err := s.llm.CompleteJSON(ctx, messages, schema)
	if err != nil {
		return sufficiencyCheck{}, fmt.Errorf("llm complete json: %w", err)
	}

	var result sufficiencyCheck
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		return sufficiencyCheck{}, fmt.Errorf("unmarshal sufficiency check: %w", err)
	}

	return result, nil
}

func (s *Retrieval) generateAnswer(ctx context.Context, query domain.Query, docs map[string]domain.Document, collected *strings.Builder) (domain.QueryResult, error) {
	messages := []port.ChatMessage{
		{Role: "system", Content: "You are a research assistant. Answer the question based on the provided content. Include specific page citations."},
		{Role: "user", Content: fmt.Sprintf("Question: %s\n\nSource content:\n%s\n\nProvide a comprehensive answer with citations referencing specific document IDs and page numbers.", query.Question, collected.String())},
	}

	schema := `{"answer": "string", "citations": [{"document_id": "string", "page_number": 0, "node_id": "string"}]}`

	raw, err := s.llm.CompleteJSON(ctx, messages, schema)
	if err != nil {
		return domain.QueryResult{}, fmt.Errorf("llm generate answer: %w", err)
	}

	var resp answerResponse
	if err := json.Unmarshal([]byte(raw), &resp); err != nil {
		return domain.QueryResult{}, fmt.Errorf("unmarshal answer: %w", err)
	}

	result := domain.QueryResult{
		Answer:    resp.Answer,
		Citations: make([]domain.Citation, 0, len(resp.Citations)),
	}
	for _, c := range resp.Citations {
		docName := ""
		if doc, ok := docs[c.DocumentID]; ok {
			docName = doc.Name
		}
		result.Citations = append(result.Citations, domain.Citation{
			DocumentID:   c.DocumentID,
			DocumentName: docName,
			PageNumber:   c.PageNumber,
			NodeID:       c.NodeID,
		})
	}

	return result, nil
}
