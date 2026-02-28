package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/devinitive-team/mirage/internal/domain"
	"github.com/devinitive-team/mirage/internal/port"
)

type Indexer struct {
	llm              port.LLMProvider
	storage          port.Storage
	maxPagesPerNode  int
	maxTokensPerNode int
}

func NewIndexer(llm port.LLMProvider, storage port.Storage, maxPagesPerNode, maxTokensPerNode int) *Indexer {
	return &Indexer{
		llm:              llm,
		storage:          storage,
		maxPagesPerNode:  maxPagesPerNode,
		maxTokensPerNode: maxTokensPerNode,
	}
}

type tocResult struct {
	HasTOC   bool         `json:"has_toc"`
	Sections []tocSection `json:"sections"`
}

type tocSection struct {
	Title       string       `json:"title"`
	StartPage   int          `json:"start_page"`
	EndPage     int          `json:"end_page"`
	Subsections []tocSection `json:"subsections"`
}

type inferredStructure struct {
	Sections []tocSection `json:"sections"`
}

func (s *Indexer) Build(ctx context.Context, docID string, pages []domain.Page) (domain.TreeIndex, error) {
	toc, err := s.detectTOC(ctx, pages)
	if err != nil {
		return domain.TreeIndex{}, fmt.Errorf("detect toc: %w", err)
	}

	var root domain.TreeNode
	if toc.HasTOC && len(toc.Sections) > 0 {
		root = s.buildFromTOC(toc.Sections, pages)
	} else {
		structure, err := s.inferStructure(ctx, pages)
		if err != nil {
			return domain.TreeIndex{}, fmt.Errorf("infer structure: %w", err)
		}
		root = s.buildFromTOC(structure.Sections, pages)
	}

	root.Title = "Root"
	root.StartPage = 0
	root.EndPage = len(pages) - 1

	counter := 0
	assignNodeIDs(&root, &counter)

	if err := s.generateSummaries(ctx, &root, pages); err != nil {
		return domain.TreeIndex{}, fmt.Errorf("generate summaries: %w", err)
	}

	tree := domain.TreeIndex{
		DocumentID: docID,
		Root:       root,
	}
	if err := s.storage.SaveTree(ctx, tree); err != nil {
		return domain.TreeIndex{}, fmt.Errorf("save tree: %w", err)
	}

	return tree, nil
}

func (s *Indexer) detectTOC(ctx context.Context, pages []domain.Page) (tocResult, error) {
	n := min(5, len(pages))
	var sb strings.Builder
	for _, p := range pages[:n] {
		fmt.Fprintf(&sb, "--- Page %d ---\n%s\n", p.Index, p.Markdown)
	}

	messages := []port.ChatMessage{
		{Role: "system", Content: "You are a document analysis assistant. Analyze the following pages and determine if they contain a table of contents."},
		{Role: "user", Content: fmt.Sprintf("Analyze these pages and determine if there is a table of contents. If found, extract the section structure with page ranges.\n\n%s", sb.String())},
	}

	schema := `{"has_toc": true, "sections": [{"title": "string", "start_page": 0, "end_page": 0, "subsections": []}]}`

	raw, err := s.llm.CompleteJSON(ctx, messages, schema)
	if err != nil {
		return tocResult{}, fmt.Errorf("llm complete json: %w", err)
	}

	var result tocResult
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		return tocResult{}, fmt.Errorf("unmarshal toc result: %w", err)
	}

	return result, nil
}

func (s *Indexer) inferStructure(ctx context.Context, pages []domain.Page) (inferredStructure, error) {
	var sb strings.Builder
	for _, p := range pages {
		preview := p.Markdown
		if len(preview) > 200 {
			preview = preview[:200]
		}
		fmt.Fprintf(&sb, "Page %d: %s\n", p.Index, preview)
	}

	messages := []port.ChatMessage{
		{Role: "system", Content: "You are a document analysis assistant. Group the following pages into logical sections and chapters."},
		{Role: "user", Content: fmt.Sprintf("Group these pages into logical sections. Each section should have a title, start_page, end_page, and optional subsections.\n\n%s", sb.String())},
	}

	schema := `{"sections": [{"title": "string", "start_page": 0, "end_page": 0, "subsections": []}]}`

	raw, err := s.llm.CompleteJSON(ctx, messages, schema)
	if err != nil {
		return inferredStructure{}, fmt.Errorf("llm complete json: %w", err)
	}

	var result inferredStructure
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		return inferredStructure{}, fmt.Errorf("unmarshal inferred structure: %w", err)
	}

	return result, nil
}

func (s *Indexer) buildFromTOC(sections []tocSection, pages []domain.Page) domain.TreeNode {
	var root domain.TreeNode
	root.Children = make([]domain.TreeNode, 0, len(sections))
	for _, sec := range sections {
		root.Children = append(root.Children, s.sectionToNode(sec))
	}
	return root
}

func (s *Indexer) sectionToNode(sec tocSection) domain.TreeNode {
	node := domain.TreeNode{
		Title:     sec.Title,
		StartPage: sec.StartPage,
		EndPage:   sec.EndPage,
	}
	if len(sec.Subsections) > 0 {
		node.Children = make([]domain.TreeNode, 0, len(sec.Subsections))
		for _, sub := range sec.Subsections {
			node.Children = append(node.Children, s.sectionToNode(sub))
		}
	}
	return node
}

func assignNodeIDs(node *domain.TreeNode, counter *int) {
	*counter++
	node.NodeID = fmt.Sprintf("%04d", *counter)
	for i := range node.Children {
		assignNodeIDs(&node.Children[i], counter)
	}
}

func (s *Indexer) generateSummaries(ctx context.Context, node *domain.TreeNode, pages []domain.Page) error {
	for i := range node.Children {
		if err := s.generateSummaries(ctx, &node.Children[i], pages); err != nil {
			return err
		}
	}

	if len(node.Children) == 0 {
		return s.summarizeLeaf(ctx, node, pages)
	}
	return s.summarizeParent(ctx, node)
}

func (s *Indexer) summarizeLeaf(ctx context.Context, node *domain.TreeNode, pages []domain.Page) error {
	var sb strings.Builder
	for _, p := range pages {
		if p.Index >= node.StartPage && p.Index <= node.EndPage {
			fmt.Fprintf(&sb, "--- Page %d ---\n%s\n", p.Index, p.Markdown)
		}
	}

	messages := []port.ChatMessage{
		{Role: "system", Content: "You are a document summarization assistant. Provide a concise 2-3 sentence summary of the following content."},
		{Role: "user", Content: fmt.Sprintf("Summarize the following section titled %q:\n\n%s", node.Title, sb.String())},
	}

	summary, err := s.llm.Complete(ctx, messages)
	if err != nil {
		return fmt.Errorf("summarize leaf node %s: %w", node.NodeID, err)
	}

	node.Summary = summary
	return nil
}

func (s *Indexer) summarizeParent(ctx context.Context, node *domain.TreeNode) error {
	var sb strings.Builder
	for _, child := range node.Children {
		fmt.Fprintf(&sb, "- %s: %s\n", child.Title, child.Summary)
	}

	messages := []port.ChatMessage{
		{Role: "system", Content: "You are a document summarization assistant. Provide a concise 2-3 sentence summary based on the following subsection summaries."},
		{Role: "user", Content: fmt.Sprintf("Summarize the section %q based on its subsections:\n\n%s", node.Title, sb.String())},
	}

	summary, err := s.llm.Complete(ctx, messages)
	if err != nil {
		return fmt.Errorf("summarize parent node %s: %w", node.NodeID, err)
	}

	node.Summary = summary
	return nil
}
