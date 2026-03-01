package service

import (
	"context"
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

func TestExtractMatchingTOCPagePairs_FiltersByStartPageAndUnknownLabels(t *testing.T) {
	labels := []tocPageLabel{
		{Title: "Intro", Page: 1},
		{Title: "Methods", Page: 5},
		{Title: "Appendix", Page: -1},
	}
	physical := []tocPhysicalSection{
		{Title: "Intro", PhysicalStartPage: 9},
		{Title: "Methods", PhysicalStartPage: 4},
		{Title: "Methods", PhysicalStartPage: 13},
		{Title: "Unknown", PhysicalStartPage: 20},
	}

	pairs := extractMatchingTOCPagePairs(labels, physical, 8)
	if len(pairs) != 2 {
		t.Fatalf("expected 2 pairs, got %d", len(pairs))
	}
	if pairs[0].Title != "Intro" || pairs[0].Page != 1 || pairs[0].PhysicalStartPage != 9 {
		t.Fatalf("unexpected first pair: %+v", pairs[0])
	}
	if pairs[1].Title != "Methods" || pairs[1].Page != 5 || pairs[1].PhysicalStartPage != 13 {
		t.Fatalf("unexpected second pair: %+v", pairs[1])
	}
}

func TestCalculateTOCPageOffset_UsesMostFrequentDifference(t *testing.T) {
	offset, ok := calculateTOCPageOffset([]tocPagePair{
		{Title: "A", Page: 1, PhysicalStartPage: 9},  // diff 8
		{Title: "B", Page: 5, PhysicalStartPage: 13}, // diff 8
		{Title: "C", Page: 3, PhysicalStartPage: 12}, // diff 9
	})

	if !ok {
		t.Fatal("expected offset to be found")
	}
	if offset != 8 {
		t.Fatalf("expected offset 8, got %d", offset)
	}
}

func TestApplyTOCPageOffset_RecursivelyShiftsSections(t *testing.T) {
	sections := []tocSection{
		{
			Title:     "Top",
			StartPage: 1,
			EndPage:   4,
			Subsections: []tocSection{
				{Title: "Child", StartPage: 2, EndPage: 2},
			},
		},
	}

	applyTOCPageOffset(sections, 7)

	if sections[0].StartPage != 8 || sections[0].EndPage != 11 {
		t.Fatalf("top section range = %d-%d, want 8-11", sections[0].StartPage, sections[0].EndPage)
	}
	child := sections[0].Subsections[0]
	if child.StartPage != 9 || child.EndPage != 9 {
		t.Fatalf("child section range = %d-%d, want 9-9", child.StartPage, child.EndPage)
	}
}

func TestCalibrateTOCPageOffset_ShiftsSectionsUsingModeOffset(t *testing.T) {
	pages := make([]domain.Page, 30)
	for i := range pages {
		pages[i] = domain.Page{Index: i, Markdown: "Page content"}
	}

	toc := tocResult{
		HasTOC:     true,
		TOCEndPage: 1,
		Sections: []tocSection{
			{Title: "Intro", StartPage: 1, EndPage: 4},
			{
				Title:     "Methods",
				StartPage: 5,
				EndPage:   8,
				Subsections: []tocSection{
					{Title: "Methods - Details", StartPage: 6, EndPage: 7},
				},
			},
		},
	}
	llm := &mockLLM{
		responses: []string{
			`{"sections":[{"title":"Intro","physical_start_page":9},{"title":"Methods","physical_start_page":13}]}`,
		},
	}

	s := &Indexer{llm: llm}
	calibrated := s.calibrateTOCPageOffset(context.Background(), toc, pages)

	if calibrated[0].StartPage != 9 || calibrated[0].EndPage != 12 {
		t.Fatalf("intro range = %d-%d, want 9-12", calibrated[0].StartPage, calibrated[0].EndPage)
	}
	if calibrated[1].StartPage != 13 || calibrated[1].EndPage != 16 {
		t.Fatalf("methods range = %d-%d, want 13-16", calibrated[1].StartPage, calibrated[1].EndPage)
	}
	if calibrated[1].Subsections[0].StartPage != 14 || calibrated[1].Subsections[0].EndPage != 15 {
		t.Fatalf("methods detail range = %d-%d, want 14-15", calibrated[1].Subsections[0].StartPage, calibrated[1].Subsections[0].EndPage)
	}

	// Ensure original TOC remains unchanged.
	if toc.Sections[0].StartPage != 1 || toc.Sections[1].StartPage != 5 {
		t.Fatalf("original toc mutated: %+v", toc.Sections)
	}
}

func TestCalibrateTOCPageOffset_LeavesSectionsUnchangedWithoutPairs(t *testing.T) {
	pages := make([]domain.Page, 10)
	for i := range pages {
		pages[i] = domain.Page{Index: i, Markdown: "Page content"}
	}

	toc := tocResult{
		HasTOC:     true,
		TOCEndPage: 1,
		Sections: []tocSection{
			{Title: "Intro", StartPage: 1, EndPage: 2},
		},
	}
	llm := &mockLLM{
		responses: []string{
			`{"sections":[]}`,
		},
	}

	s := &Indexer{llm: llm}
	calibrated := s.calibrateTOCPageOffset(context.Background(), toc, pages)
	if calibrated[0].StartPage != 1 || calibrated[0].EndPage != 2 {
		t.Fatalf("unexpected calibrated range %d-%d", calibrated[0].StartPage, calibrated[0].EndPage)
	}
}

func TestDetectTOCRejectsFencedJSON(t *testing.T) {
	pages := []domain.Page{
		{Index: 0, Markdown: "Preface"},
	}
	llm := &mockLLM{
		responses: []string{
			"```json\n{\"has_toc\":false,\"toc_end_page\":-1,\"sections\":[]}\n```",
		},
	}

	s := &Indexer{llm: llm}
	if _, err := s.detectTOC(context.Background(), pages); err == nil {
		t.Fatal("detectTOC error = nil, want strict decode error")
	}
}

func TestInferStructureRejectsInvalidJSON(t *testing.T) {
	pages := []domain.Page{
		{Index: 0, Markdown: "Page zero"},
	}
	llm := &mockLLM{
		responses: []string{
			`not-json`,
		},
	}

	s := &Indexer{llm: llm}
	if _, err := s.inferStructure(context.Background(), pages); err == nil {
		t.Fatal("inferStructure error = nil, want invalid json error")
	}
}

func TestCalibrateTOCPageOffsetInvalidJSONFallsBackUnchanged(t *testing.T) {
	pages := make([]domain.Page, 10)
	for i := range pages {
		pages[i] = domain.Page{Index: i, Markdown: "Page content"}
	}

	toc := tocResult{
		HasTOC:     true,
		TOCEndPage: 1,
		Sections: []tocSection{
			{Title: "Intro", StartPage: 1, EndPage: 2},
		},
	}
	llm := &mockLLM{
		responses: []string{
			`not-json`,
		},
	}

	s := &Indexer{llm: llm}
	calibrated := s.calibrateTOCPageOffset(context.Background(), toc, pages)
	if calibrated[0].StartPage != 1 || calibrated[0].EndPage != 2 {
		t.Fatalf("calibrated range = %d-%d, want 1-2", calibrated[0].StartPage, calibrated[0].EndPage)
	}
}
