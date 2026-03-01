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
	maxCollectedContentChars = 120000
	maxEvidenceItems         = 32
)

type Retrieval struct {
	llm     port.LLMProvider
	storage retrievalStore
}

type retrievalStore interface {
	GetTree(ctx context.Context, docID string) (domain.TreeIndex, error)
	GetDocument(ctx context.Context, id string) (domain.Document, error)
	GetPageRange(ctx context.Context, docID string, start, end int) ([]domain.Page, error)
}

func NewRetrieval(llm port.LLMProvider, storage retrievalStore) *Retrieval {
	return &Retrieval{
		llm:     llm,
		storage: storage,
	}
}

// nodeEntry is a flat lookup entry for a tree node, keyed by "doc-id:node-id".
type nodeEntry struct {
	DocumentID string
	NodeID     string
	Title      string
	StartPage  int
	EndPage    int
}

func (e nodeEntry) ref() string {
	return fmt.Sprintf("%s:%s", e.DocumentID, e.NodeID)
}

// searchTreeDoc is the LLM-facing JSON for a document's tree.
type searchTreeDoc struct {
	DocumentID string           `json:"document_id"`
	Title      string           `json:"title"`
	Children   []searchTreeNode `json:"children"`
}

// searchTreeNode is the LLM-facing JSON for a single tree node.
type searchTreeNode struct {
	NodeRef   string           `json:"node_ref"`
	Title     string           `json:"title"`
	Summary   string           `json:"summary"`
	PageIndex int              `json:"page_index"`
	Children  []searchTreeNode `json:"children,omitempty"`
}

type searchResponse struct {
	NodeList []string `json:"node_list"`
	Thinking string   `json:"thinking"`
}

type answerResponse struct {
	Answer json.RawMessage `json:"answer"`
}

func (s *Retrieval) Answer(ctx context.Context, query domain.Query) (domain.QueryResult, error) {
	if strings.TrimSpace(query.Question) == "" {
		err := fmt.Errorf("question is required")
		slog.ErrorContext(ctx, "retrieval failed", "stage", "validate_query", "error", err)
		return domain.QueryResult{}, err
	}

	slog.InfoContext(ctx, "retrieval started", "question_len", len(query.Question), "document_count", len(query.DocumentIDs))

	trees, docs, err := s.loadQueryContext(ctx, query.DocumentIDs)
	if err != nil {
		slog.ErrorContext(ctx, "retrieval failed", "stage", "load_query_context", "error", err, "document_count", len(query.DocumentIDs))
		return domain.QueryResult{}, err
	}
	slog.InfoContext(ctx, "query context loaded", "tree_count", len(trees), "doc_count", len(docs))

	nodeMap := buildNodeMap(trees)
	if len(nodeMap) == 0 {
		err := fmt.Errorf("no retrieval candidates available")
		slog.ErrorContext(ctx, "retrieval failed", "stage", "build_node_map", "error", err)
		return domain.QueryResult{}, err
	}
	slog.InfoContext(ctx, "node map built", "candidate_count", len(nodeMap))

	searchTrees := buildSearchTrees(trees, docs)

	slog.InfoContext(ctx, "searching tree", "search_tree_count", len(searchTrees))
	selection, err := s.searchTree(ctx, query.Question, searchTrees)
	if err != nil {
		slog.ErrorContext(ctx, "retrieval failed", "stage", "search_tree", "error", err)
		return domain.QueryResult{}, err
	}
	slog.InfoContext(ctx, "retrieval search complete", "node_count", len(selection.NodeList))

	entries := resolveNodeRefs(selection.NodeList, nodeMap)
	if len(entries) == 0 {
		err := fmt.Errorf("node_list did not match available candidates")
		slog.ErrorContext(ctx, "retrieval failed", "stage", "resolve_node_refs", "error", err, "raw_count", len(selection.NodeList))
		return domain.QueryResult{}, err
	}
	slog.InfoContext(ctx, "nodes resolved", "resolved", len(entries), "requested", len(selection.NodeList))

	content, err := s.collectContent(ctx, entries)
	if err != nil {
		slog.ErrorContext(ctx, "retrieval failed", "stage", "collect_content", "error", err)
		return domain.QueryResult{}, err
	}
	slog.InfoContext(ctx, "content collected", "content_len", len(content))

	evidence := buildEvidence(entries, docs)
	slog.InfoContext(ctx, "evidence built", "evidence_count", len(evidence))

	slog.InfoContext(ctx, "generating answer")
	answer, err := s.generateAnswer(ctx, query.Question, content)
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

	slog.InfoContext(ctx, "retrieval complete", "answer_len", len(answer), "evidence_count", len(evidence))
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

// buildNodeMap walks all trees into a flat map keyed by "doc-id:node-id".
func buildNodeMap(trees map[string]domain.TreeIndex) map[string]nodeEntry {
	m := make(map[string]nodeEntry)
	for docID, tree := range trees {
		walkNodes(docID, tree.Root.Children, m)
	}
	return m
}

func walkNodes(docID string, nodes []domain.TreeNode, m map[string]nodeEntry) {
	for _, node := range nodes {
		entry := nodeEntry{
			DocumentID: docID,
			NodeID:     node.NodeID,
			Title:      node.Title,
			StartPage:  node.StartPage,
			EndPage:    node.EndPage,
		}
		m[entry.ref()] = entry
		walkNodes(docID, node.Children, m)
	}
}

// buildSearchTrees converts trees+docs into the LLM-facing JSON (no page numbers).
func buildSearchTrees(trees map[string]domain.TreeIndex, docs map[string]domain.Document) []searchTreeDoc {
	docIDs := make([]string, 0, len(trees))
	for docID := range trees {
		docIDs = append(docIDs, docID)
	}
	sort.Strings(docIDs)

	result := make([]searchTreeDoc, 0, len(docIDs))
	for _, docID := range docIDs {
		tree := trees[docID]
		docName := docID
		if doc, ok := docs[docID]; ok {
			docName = doc.Name
		}
		result = append(result, searchTreeDoc{
			DocumentID: docID,
			Title:      docName,
			Children:   convertNodes(docID, tree.Root.Children),
		})
	}
	return result
}

func convertNodes(docID string, nodes []domain.TreeNode) []searchTreeNode {
	result := make([]searchTreeNode, 0, len(nodes))
	for _, node := range nodes {
		sn := searchTreeNode{
			NodeRef:   fmt.Sprintf("%s:%s", docID, node.NodeID),
			Title:     node.Title,
			Summary:   node.Summary,
			PageIndex: node.StartPage,
		}
		if len(node.Children) > 0 {
			sn.Children = convertNodes(docID, node.Children)
		}
		result = append(result, sn)
	}
	return result
}

// searchTree performs a single LLM call with the full hierarchical tree JSON.
func (s *Retrieval) searchTree(ctx context.Context, question string, trees []searchTreeDoc) (searchResponse, error) {
	treeJSON, err := json.Marshal(trees)
	if err != nil {
		return searchResponse{}, fmt.Errorf("marshal search trees: %w", err)
	}

	messages := []port.ChatMessage{
		{
			Role: "system",
			Content: "You are given a question and the tree structures of one or more documents.\n" +
				"Each node contains a node ref, a title, and a summary.\n" +
				"Your task is to find all nodes that are likely to contain the answer.",
		},
		{
			Role: "user",
			Content: fmt.Sprintf(
				"Question: %s\n\nDocument tree structures:\n%s\n\nReturn JSON with \"thinking\" and \"node_list\" keys.\nnode_list entries must be node refs exactly as they appear in the tree.",
				question,
				string(treeJSON),
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

	var result searchResponse
	if err := completeAndDecodeJSON(ctx, s.llm, messages, schema, &result); err != nil {
		return searchResponse{}, fmt.Errorf("decode search response: %w", err)
	}
	return result, nil
}

// resolveNodeRefs looks up the LLM's node_list in the flat map, deduplicating.
func resolveNodeRefs(nodeList []string, nodeMap map[string]nodeEntry) []nodeEntry {
	var entries []nodeEntry
	seen := make(map[string]struct{})
	for _, raw := range nodeList {
		ref := strings.TrimSpace(raw)
		if ref == "" {
			continue
		}
		if _, exists := seen[ref]; exists {
			continue
		}
		entry, ok := nodeMap[ref]
		if !ok {
			continue
		}
		seen[ref] = struct{}{}
		entries = append(entries, entry)
	}
	return entries
}

// collectContent fetches pages per entry and concatenates with "\n\n" (no metadata headers).
func (s *Retrieval) collectContent(ctx context.Context, entries []nodeEntry) (string, error) {
	var sb strings.Builder
	for _, entry := range entries {
		pages, err := s.storage.GetPageRange(ctx, entry.DocumentID, entry.StartPage, entry.EndPage)
		if err != nil {
			return "", fmt.Errorf("get pages %s [%d-%d]: %w", entry.DocumentID, entry.StartPage, entry.EndPage, err)
		}
		for _, page := range pages {
			chunk := page.Markdown + "\n\n"
			if sb.Len()+len(chunk) > maxCollectedContentChars {
				return sb.String(), nil
			}
			sb.WriteString(chunk)
		}
	}
	return sb.String(), nil
}

// buildEvidence converts entries to domain.Evidence with dedup.
func buildEvidence(entries []nodeEntry, docs map[string]domain.Document) []domain.Evidence {
	evidence := make([]domain.Evidence, 0, len(entries))
	seen := make(map[string]struct{})
	for _, entry := range entries {
		key := entry.ref()
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}

		docName := ""
		if doc, ok := docs[entry.DocumentID]; ok {
			docName = doc.Name
		}
		evidence = append(evidence, domain.Evidence{
			DocumentID:   entry.DocumentID,
			DocumentName: docName,
			NodeID:       entry.NodeID,
			NodeTitle:    entry.Title,
			PageStart:    entry.StartPage,
			PageEnd:      entry.EndPage,
		})
		if len(evidence) >= maxEvidenceItems {
			break
		}
	}
	return evidence
}

func (s *Retrieval) generateAnswer(ctx context.Context, question, collected string) (string, error) {
	messages := []port.ChatMessage{
		{Role: "system", Content: "Provide a clear, concise answer based only on the context provided. Return JSON only."},
		{
			Role: "user",
			Content: fmt.Sprintf(
				"Question: %s\n\nContext:\n%s\n\nReturn {\"answer\": \"...\"} with answer as a plain string.",
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
