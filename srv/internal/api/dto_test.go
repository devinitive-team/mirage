package api

import (
	"testing"

	"github.com/devinitive-team/mirage/internal/domain"
)

func TestQueryResultToBodyConvertsEvidenceToOneIndexedPages(t *testing.T) {
	body := queryResultToBody(domain.QueryResult{
		Answer: "ok",
		Evidence: []domain.Evidence{
			{
				DocumentID:   "doc-1",
				DocumentName: "Quarterly.pdf",
				NodeID:       "n1",
				NodeTitle:    "Financial Results",
				PageStart:    0,
				PageEnd:      2,
				Snippet:      "evidence snippet",
			},
		},
	})

	if body.Answer != "ok" {
		t.Fatalf("answer = %q, want ok", body.Answer)
	}
	if len(body.Evidence) != 1 {
		t.Fatalf("len(evidence) = %d, want 1", len(body.Evidence))
	}
	if body.Evidence[0].PageStart != 1 || body.Evidence[0].PageEnd != 3 {
		t.Fatalf("page range = %d-%d, want 1-3", body.Evidence[0].PageStart, body.Evidence[0].PageEnd)
	}
}

func TestTreeToBodyConvertsPagesRecursively(t *testing.T) {
	tree := domain.TreeIndex{
		DocumentID: "doc-1",
		Root: domain.TreeNode{
			NodeID:    "root",
			Title:     "Root",
			StartPage: 0,
			EndPage:   5,
			Summary:   "root summary",
			Children: []domain.TreeNode{
				{
					NodeID:    "child",
					Title:     "Child",
					StartPage: 2,
					EndPage:   2,
					Summary:   "child summary",
				},
			},
		},
	}

	body := treeToBody(tree)
	if body.Root.StartPage != 1 || body.Root.EndPage != 6 {
		t.Fatalf("root pages = %d-%d, want 1-6", body.Root.StartPage, body.Root.EndPage)
	}
	if len(body.Root.Children) != 1 {
		t.Fatalf("len(root.children) = %d, want 1", len(body.Root.Children))
	}
	if body.Root.Children[0].StartPage != 3 || body.Root.Children[0].EndPage != 3 {
		t.Fatalf(
			"child pages = %d-%d, want 3-3",
			body.Root.Children[0].StartPage,
			body.Root.Children[0].EndPage,
		)
	}
}
