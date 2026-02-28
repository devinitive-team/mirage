package service

import (
	"testing"

	"github.com/devinitive-team/mirage/internal/domain"
)

func TestVerifyTree_CorrectPageUnchanged(t *testing.T) {
	pages := []domain.Page{
		{Index: 0, Markdown: "Introduction to the report"},
		{Index: 1, Markdown: "SolarWinds analysis and details"},
		{Index: 2, Markdown: "Conclusion of the report"},
	}

	node := domain.TreeNode{
		Title:     "SolarWinds",
		StartPage: 1,
		EndPage:   1,
	}

	s := &Indexer{}
	s.verifyTree(&node, pages)

	if node.StartPage != 1 || node.EndPage != 1 {
		t.Errorf("expected pages 1-1, got %d-%d", node.StartPage, node.EndPage)
	}
}

func TestVerifyTree_ShiftsToCorrectPage(t *testing.T) {
	pages := []domain.Page{
		{Index: 0, Markdown: "Introduction"},
		{Index: 1, Markdown: "Riverbed details"},
		{Index: 2, Markdown: "More Riverbed content"},
		{Index: 3, Markdown: "SolarWinds analysis begins here"},
		{Index: 4, Markdown: "SolarWinds continued"},
	}

	// LLM incorrectly assigned SolarWinds to pages 1-2
	node := domain.TreeNode{
		Title:     "SolarWinds",
		StartPage: 1,
		EndPage:   2,
	}

	s := &Indexer{}
	s.verifyTree(&node, pages)

	if node.StartPage != 3 || node.EndPage != 4 {
		t.Errorf("expected pages 3-4, got %d-%d", node.StartPage, node.EndPage)
	}
}

func TestVerifyTree_SkipsParentNodes(t *testing.T) {
	pages := []domain.Page{
		{Index: 0, Markdown: "Content about something else"},
	}

	node := domain.TreeNode{
		Title:     "Parent",
		StartPage: 0,
		EndPage:   0,
		Children: []domain.TreeNode{
			{Title: "Child", StartPage: 0, EndPage: 0},
		},
	}

	s := &Indexer{}
	s.verifyTree(&node, pages)

	// Parent should not be modified even though title not found
	if node.StartPage != 0 || node.EndPage != 0 {
		t.Errorf("parent should be unchanged, got %d-%d", node.StartPage, node.EndPage)
	}
}

func TestVerifyTree_SkipsEmptyTitle(t *testing.T) {
	pages := []domain.Page{
		{Index: 0, Markdown: "Some content"},
	}

	node := domain.TreeNode{
		Title:     "",
		StartPage: 0,
		EndPage:   0,
	}

	s := &Indexer{}
	s.verifyTree(&node, pages)

	if node.StartPage != 0 || node.EndPage != 0 {
		t.Errorf("empty title node should be unchanged, got %d-%d", node.StartPage, node.EndPage)
	}
}

func TestVerifyTree_CaseInsensitive(t *testing.T) {
	pages := []domain.Page{
		{Index: 0, Markdown: "Introduction"},
		{Index: 1, Markdown: "SOLARWINDS ANALYSIS"},
	}

	node := domain.TreeNode{
		Title:     "SolarWinds Analysis",
		StartPage: 0,
		EndPage:   0,
	}

	s := &Indexer{}
	s.verifyTree(&node, pages)

	if node.StartPage != 1 || node.EndPage != 1 {
		t.Errorf("expected pages 1-1, got %d-%d", node.StartPage, node.EndPage)
	}
}

func TestVerifyTree_NoMatchLeavesUnchanged(t *testing.T) {
	pages := []domain.Page{
		{Index: 0, Markdown: "Introduction"},
		{Index: 1, Markdown: "Other content"},
	}

	node := domain.TreeNode{
		Title:     "NonexistentSection",
		StartPage: 0,
		EndPage:   0,
	}

	s := &Indexer{}
	s.verifyTree(&node, pages)

	if node.StartPage != 0 || node.EndPage != 0 {
		t.Errorf("expected unchanged pages 0-0, got %d-%d", node.StartPage, node.EndPage)
	}
}

func TestClampPageRanges_ClampsNegativeStart(t *testing.T) {
	node := domain.TreeNode{StartPage: -2, EndPage: 3}
	clampPageRanges(&node, 10)

	if node.StartPage != 0 {
		t.Errorf("expected StartPage 0, got %d", node.StartPage)
	}
}

func TestClampPageRanges_ClampsEndBeyondCount(t *testing.T) {
	node := domain.TreeNode{StartPage: 5, EndPage: 15}
	clampPageRanges(&node, 10)

	if node.EndPage != 9 {
		t.Errorf("expected EndPage 9, got %d", node.EndPage)
	}
}

func TestClampPageRanges_FixesInvertedRange(t *testing.T) {
	node := domain.TreeNode{StartPage: 8, EndPage: 3}
	clampPageRanges(&node, 10)

	if node.StartPage != 3 || node.EndPage != 3 {
		t.Errorf("expected 3-3, got %d-%d", node.StartPage, node.EndPage)
	}
}

func TestClampPageRanges_ClampsChildren(t *testing.T) {
	node := domain.TreeNode{
		StartPage: 0,
		EndPage:   5,
		Children: []domain.TreeNode{
			{StartPage: -1, EndPage: 20},
		},
	}
	clampPageRanges(&node, 10)

	child := node.Children[0]
	if child.StartPage != 0 || child.EndPage != 9 {
		t.Errorf("expected child 0-9, got %d-%d", child.StartPage, child.EndPage)
	}
}

func TestClampPageRanges_ValidRangeUnchanged(t *testing.T) {
	node := domain.TreeNode{StartPage: 2, EndPage: 7}
	clampPageRanges(&node, 10)

	if node.StartPage != 2 || node.EndPage != 7 {
		t.Errorf("expected 2-7, got %d-%d", node.StartPage, node.EndPage)
	}
}
