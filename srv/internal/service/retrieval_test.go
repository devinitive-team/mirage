package service

import (
	"context"
	"fmt"
	"io"
	"strings"
	"testing"
	"time"

	"github.com/devinitive-team/mirage/internal/domain"
	"github.com/devinitive-team/mirage/internal/port"
)

type mockLLM struct {
	responses []string
	idx       int
}

func (m *mockLLM) Complete(_ context.Context, _ []port.ChatMessage) (string, error) {
	return "", nil
}

func (m *mockLLM) CompleteJSON(_ context.Context, _ []port.ChatMessage, _ string) (string, error) {
	if m.idx >= len(m.responses) {
		return "", fmt.Errorf("missing response at index %d", m.idx)
	}
	resp := m.responses[m.idx]
	m.idx++
	return resp, nil
}

type mockStorage struct {
	docs  map[string]domain.Document
	trees map[string]domain.TreeIndex
	pages map[string][]domain.Page
}

func (m *mockStorage) SaveDocument(_ context.Context, _ domain.Document) error { return nil }
func (m *mockStorage) ListDocuments(_ context.Context, _, _ int) ([]domain.Document, error) {
	return nil, nil
}
func (m *mockStorage) DeleteDocument(_ context.Context, _ string) error { return nil }
func (m *mockStorage) SavePDF(_ context.Context, _ string, _ io.Reader) error {
	return nil
}
func (m *mockStorage) OpenPDF(_ context.Context, _ string) (io.ReadCloser, error) {
	return nil, domain.ErrNotFound
}
func (m *mockStorage) SavePages(_ context.Context, _ string, _ []domain.Page) error {
	return nil
}
func (m *mockStorage) SaveTree(_ context.Context, _ domain.TreeIndex) error { return nil }

func (m *mockStorage) GetDocument(_ context.Context, id string) (domain.Document, error) {
	doc, ok := m.docs[id]
	if !ok {
		return domain.Document{}, domain.ErrNotFound
	}
	return doc, nil
}

func (m *mockStorage) GetTree(_ context.Context, docID string) (domain.TreeIndex, error) {
	tree, ok := m.trees[docID]
	if !ok {
		return domain.TreeIndex{}, domain.ErrNotFound
	}
	return tree, nil
}

func (m *mockStorage) GetPages(_ context.Context, docID string) ([]domain.Page, error) {
	pages, ok := m.pages[docID]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return pages, nil
}

func (m *mockStorage) GetPageRange(_ context.Context, docID string, start, end int) ([]domain.Page, error) {
	pages, ok := m.pages[docID]
	if !ok {
		return nil, domain.ErrNotFound
	}
	if start < 0 || end < start || start >= len(pages) {
		return nil, nil
	}
	if end >= len(pages) {
		end = len(pages) - 1
	}
	return pages[start : end+1], nil
}

func makeDoc(id, name string) domain.Document {
	now := time.Now().UTC()
	return domain.Document{
		ID:        id,
		Name:      name,
		Status:    domain.DocumentStatusComplete,
		PageCount: 2,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

func TestAnswerBuildsEvidenceFromVisitedLeafPages(t *testing.T) {
	llm := &mockLLM{
		responses: []string{
			`{"selected_nodes":["leaf-1"],"reasoning":"relevant"}`,
			`{"sufficient":true,"reasoning":"enough"}`,
			`{"answer":"Revenue improved year-over-year."}`,
		},
	}
	storage := &mockStorage{
		docs: map[string]domain.Document{
			"doc-1": makeDoc("doc-1", "Quarterly Report.pdf"),
		},
		trees: map[string]domain.TreeIndex{
			"doc-1": {
				DocumentID: "doc-1",
				Root: domain.TreeNode{
					NodeID: "root",
					Children: []domain.TreeNode{
						{
							NodeID:    "leaf-1",
							Title:     "Financial Results",
							StartPage: 0,
							EndPage:   1,
						},
					},
				},
			},
		},
		pages: map[string][]domain.Page{
			"doc-1": {
				{Index: 0, Markdown: "Revenue increased by 14%."},
				{Index: 1, Markdown: "Margins expanded to 22%."},
			},
		},
	}

	svc := NewRetrieval(llm, storage, 3)
	result, err := svc.Answer(context.Background(), domain.Query{
		Question:    "How did financial performance change?",
		DocumentIDs: []string{"doc-1"},
	})
	if err != nil {
		t.Fatalf("Answer returned error: %v", err)
	}

	if result.Answer != "Revenue improved year-over-year." {
		t.Fatalf("answer = %q", result.Answer)
	}
	if len(result.Evidence) != 1 {
		t.Fatalf("len(evidence) = %d, want 1", len(result.Evidence))
	}
	evidence := result.Evidence[0]
	if evidence.DocumentID != "doc-1" {
		t.Fatalf("document_id = %q, want doc-1", evidence.DocumentID)
	}
	if evidence.DocumentName != "Quarterly Report.pdf" {
		t.Fatalf("document_name = %q", evidence.DocumentName)
	}
	if evidence.NodeID != "leaf-1" || evidence.NodeTitle != "Financial Results" {
		t.Fatalf("node = %q/%q", evidence.NodeID, evidence.NodeTitle)
	}
	if evidence.PageStart != 0 || evidence.PageEnd != 1 {
		t.Fatalf("page range = %d-%d, want 0-1", evidence.PageStart, evidence.PageEnd)
	}
	expectedSnippet := "Revenue increased by 14%.\n\nMargins expanded to 22%."
	if evidence.Snippet != expectedSnippet {
		t.Fatalf("snippet = %q, want %q", evidence.Snippet, expectedSnippet)
	}
}

func TestAnswerEvidenceIncludesOnlyLeafNodes(t *testing.T) {
	llm := &mockLLM{
		responses: []string{
			`{"selected_nodes":["parent"],"reasoning":"drill down"}`,
			`{"sufficient":false,"reasoning":"need details"}`,
			`{"selected_nodes":["leaf"],"reasoning":"exact section"}`,
			`{"sufficient":true,"reasoning":"done"}`,
			`{"answer":"The policy changed in Q2."}`,
		},
	}
	storage := &mockStorage{
		docs: map[string]domain.Document{
			"doc-1": makeDoc("doc-1", "Policy.pdf"),
		},
		trees: map[string]domain.TreeIndex{
			"doc-1": {
				DocumentID: "doc-1",
				Root: domain.TreeNode{
					NodeID: "root",
					Children: []domain.TreeNode{
						{
							NodeID:    "parent",
							Title:     "Operations",
							StartPage: 0,
							EndPage:   1,
							Children: []domain.TreeNode{
								{
									NodeID:    "leaf",
									Title:     "Policy Update",
									StartPage: 1,
									EndPage:   1,
								},
							},
						},
					},
				},
			},
		},
		pages: map[string][]domain.Page{
			"doc-1": {
				{Index: 0, Markdown: "Intro"},
				{Index: 1, Markdown: "Policy changed in Q2."},
			},
		},
	}

	svc := NewRetrieval(llm, storage, 5)
	result, err := svc.Answer(context.Background(), domain.Query{
		Question:    "When did policy change?",
		DocumentIDs: []string{"doc-1"},
	})
	if err != nil {
		t.Fatalf("Answer returned error: %v", err)
	}

	if len(result.Evidence) != 1 {
		t.Fatalf("len(evidence) = %d, want 1", len(result.Evidence))
	}
	if result.Evidence[0].NodeID != "leaf" {
		t.Fatalf("node_id = %q, want leaf", result.Evidence[0].NodeID)
	}
}

func TestAnswerDeduplicatesEvidenceByLeafKey(t *testing.T) {
	llm := &mockLLM{
		responses: []string{
			`{"selected_nodes":["dup"],"reasoning":"both match"}`,
			`{"sufficient":true,"reasoning":"enough"}`,
			`{"answer":"Duplicated branches were handled."}`,
		},
	}
	storage := &mockStorage{
		docs: map[string]domain.Document{
			"doc-1": makeDoc("doc-1", "Duplicate.pdf"),
		},
		trees: map[string]domain.TreeIndex{
			"doc-1": {
				DocumentID: "doc-1",
				Root: domain.TreeNode{
					NodeID: "root",
					Children: []domain.TreeNode{
						{
							NodeID:    "dup",
							Title:     "First Duplicate",
							StartPage: 0,
							EndPage:   0,
						},
						{
							NodeID:    "dup",
							Title:     "Second Duplicate",
							StartPage: 0,
							EndPage:   0,
						},
					},
				},
			},
		},
		pages: map[string][]domain.Page{
			"doc-1": {
				{Index: 0, Markdown: "Duplicated content."},
			},
		},
	}

	svc := NewRetrieval(llm, storage, 2)
	result, err := svc.Answer(context.Background(), domain.Query{
		Question:    "Is duplicate evidence deduped?",
		DocumentIDs: []string{"doc-1"},
	})
	if err != nil {
		t.Fatalf("Answer returned error: %v", err)
	}

	if len(result.Evidence) != 1 {
		t.Fatalf("len(evidence) = %d, want 1", len(result.Evidence))
	}
	if !strings.Contains(result.Evidence[0].Snippet, "Duplicated content.") {
		t.Fatalf("snippet did not include expected content")
	}
}
