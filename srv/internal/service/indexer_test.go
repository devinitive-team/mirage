package service

import (
	"context"
	"testing"

	"github.com/devinitive-team/mirage/internal/domain"
)

// ---------------------------------------------------------------------------
// computeEndPages
// ---------------------------------------------------------------------------

func TestComputeEndPages_Basic(t *testing.T) {
	items := []tocItem{
		{Title: "A", StartPage: 0, AppearStart: true},
		{Title: "B", StartPage: 3, AppearStart: true},
		{Title: "C", StartPage: 7, AppearStart: false},
	}
	computeEndPages(items, 10)

	if items[0].EndPage != 2 {
		t.Errorf("A.EndPage = %d, want 2", items[0].EndPage)
	}
	// C.AppearStart is false, so B shares page 7 with C.
	if items[1].EndPage != 7 {
		t.Errorf("B.EndPage = %d, want 7", items[1].EndPage)
	}
	if items[2].EndPage != 9 {
		t.Errorf("C.EndPage = %d, want 9", items[2].EndPage)
	}
}

func TestComputeEndPages_AppearStartFalse(t *testing.T) {
	items := []tocItem{
		{Title: "A", StartPage: 0},
		{Title: "B", StartPage: 5, AppearStart: false},
	}
	computeEndPages(items, 10)

	// When next item's AppearStart is false, EndPage = next.StartPage (shared page).
	if items[0].EndPage != 5 {
		t.Errorf("A.EndPage = %d, want 5", items[0].EndPage)
	}
	if items[1].EndPage != 9 {
		t.Errorf("B.EndPage = %d, want 9", items[1].EndPage)
	}
}

func TestComputeEndPages_SingleItem(t *testing.T) {
	items := []tocItem{
		{Title: "Only", StartPage: 0},
	}
	computeEndPages(items, 5)

	if items[0].EndPage != 4 {
		t.Errorf("Only.EndPage = %d, want 4", items[0].EndPage)
	}
}

// ---------------------------------------------------------------------------
// addPrefaceIfNeeded
// ---------------------------------------------------------------------------

func TestAddPrefaceIfNeeded_PrependWhenFirstPageNonZero(t *testing.T) {
	items := []tocItem{
		{Structure: "1", Title: "Chapter 1", StartPage: 3},
	}
	result := addPrefaceIfNeeded(items)

	if len(result) != 2 {
		t.Fatalf("len = %d, want 2", len(result))
	}
	if result[0].Title != "Preface" || result[0].StartPage != 0 || result[0].Structure != "0" {
		t.Errorf("preface = %+v", result[0])
	}
}

func TestAddPrefaceIfNeeded_NoPrefaceWhenStartsAtZero(t *testing.T) {
	items := []tocItem{
		{Structure: "1", Title: "Intro", StartPage: 0},
	}
	result := addPrefaceIfNeeded(items)

	if len(result) != 1 {
		t.Fatalf("len = %d, want 1", len(result))
	}
}

func TestAddPrefaceIfNeeded_EmptyItems(t *testing.T) {
	result := addPrefaceIfNeeded(nil)
	if len(result) != 0 {
		t.Fatalf("len = %d, want 0", len(result))
	}
}

// ---------------------------------------------------------------------------
// listToTree
// ---------------------------------------------------------------------------

func TestListToTree_FlatStructure(t *testing.T) {
	items := []tocItem{
		{Structure: "1", Title: "A", StartPage: 0, EndPage: 2},
		{Structure: "2", Title: "B", StartPage: 3, EndPage: 5},
		{Structure: "3", Title: "C", StartPage: 6, EndPage: 9},
	}
	root := listToTree(items, 10)

	if root.Title != "Root" {
		t.Errorf("root.Title = %q, want Root", root.Title)
	}
	if len(root.Children) != 3 {
		t.Fatalf("root.Children = %d, want 3", len(root.Children))
	}
	if root.Children[0].Title != "A" || root.Children[1].Title != "B" || root.Children[2].Title != "C" {
		t.Errorf("children = %v", root.Children)
	}
}

func TestListToTree_NestedStructure(t *testing.T) {
	items := []tocItem{
		{Structure: "1", Title: "Chapter 1", StartPage: 0, EndPage: 4},
		{Structure: "1.1", Title: "Section 1.1", StartPage: 0, EndPage: 2},
		{Structure: "1.2", Title: "Section 1.2", StartPage: 3, EndPage: 4},
		{Structure: "2", Title: "Chapter 2", StartPage: 5, EndPage: 9},
	}
	root := listToTree(items, 10)

	if len(root.Children) != 2 {
		t.Fatalf("root.Children = %d, want 2", len(root.Children))
	}
	ch1 := root.Children[0]
	if ch1.Title != "Chapter 1" {
		t.Errorf("ch1.Title = %q", ch1.Title)
	}
	if len(ch1.Children) != 2 {
		t.Fatalf("ch1.Children = %d, want 2", len(ch1.Children))
	}
	if ch1.Children[0].Title != "Section 1.1" {
		t.Errorf("ch1.Children[0].Title = %q", ch1.Children[0].Title)
	}
}

func TestListToTree_InvalidStructureFallback(t *testing.T) {
	items := []tocItem{
		{Structure: "abc", Title: "A", StartPage: 0, EndPage: 2},
		{Structure: "def", Title: "B", StartPage: 3, EndPage: 5},
	}
	root := listToTree(items, 6)

	if len(root.Children) != 2 {
		t.Fatalf("root.Children = %d, want 2", len(root.Children))
	}
}

func TestListToTree_EmptyItems(t *testing.T) {
	root := listToTree(nil, 10)
	if root.Title != "Root" {
		t.Errorf("root.Title = %q", root.Title)
	}
	if len(root.Children) != 0 {
		t.Errorf("root.Children = %d, want 0", len(root.Children))
	}
}

// ---------------------------------------------------------------------------
// pageListToGroups
// ---------------------------------------------------------------------------

func TestPageListToGroups_SingleGroup(t *testing.T) {
	pages := []domain.Page{
		{Index: 0, Markdown: "short"},
		{Index: 1, Markdown: "also short"},
	}
	groups := pageListToGroups(pages, 1000)
	if len(groups) != 1 {
		t.Fatalf("groups = %d, want 1", len(groups))
	}
}

func TestPageListToGroups_MultipleGroups(t *testing.T) {
	pages := make([]domain.Page, 10)
	for i := range pages {
		// ~30 chars per page entry + tags
		pages[i] = domain.Page{Index: i, Markdown: "content that takes some space here"}
	}
	groups := pageListToGroups(pages, 200)
	if len(groups) < 2 {
		t.Fatalf("groups = %d, want >= 2", len(groups))
	}
}

func TestPageListToGroups_EmptyPages(t *testing.T) {
	groups := pageListToGroups(nil, 1000)
	if len(groups) != 0 {
		t.Fatalf("groups = %d, want 0", len(groups))
	}
}

// ---------------------------------------------------------------------------
// flattenToItems
// ---------------------------------------------------------------------------

func TestFlattenToItems_NestedSections(t *testing.T) {
	sections := []tocSection{
		{
			Title:     "Chapter 1",
			StartPage: 0,
			EndPage:   10,
			Subsections: []tocSection{
				{Title: "Section 1.1", StartPage: 0, EndPage: 5},
				{Title: "Section 1.2", StartPage: 6, EndPage: 10},
			},
		},
		{Title: "Chapter 2", StartPage: 11, EndPage: 20},
	}

	items := flattenToItems(sections)
	if len(items) != 4 {
		t.Fatalf("len = %d, want 4", len(items))
	}

	expected := []struct {
		structure string
		title     string
	}{
		{"1", "Chapter 1"},
		{"1.1", "Section 1.1"},
		{"1.2", "Section 1.2"},
		{"2", "Chapter 2"},
	}
	for i, e := range expected {
		if items[i].Structure != e.structure || items[i].Title != e.title {
			t.Errorf("items[%d] = {%s, %s}, want {%s, %s}",
				i, items[i].Structure, items[i].Title, e.structure, e.title)
		}
	}
}

// ---------------------------------------------------------------------------
// filterInvalidItems
// ---------------------------------------------------------------------------

func TestFilterInvalidItems(t *testing.T) {
	items := []tocItem{
		{Title: "A", StartPage: 0},
		{Title: "B", StartPage: -1},
		{Title: "C", StartPage: 5},
	}
	result := filterInvalidItems(items)
	if len(result) != 2 {
		t.Fatalf("len = %d, want 2", len(result))
	}
	if result[0].Title != "A" || result[1].Title != "C" {
		t.Errorf("result = %+v", result)
	}
}

// ---------------------------------------------------------------------------
// sectionHasPageNumbers
// ---------------------------------------------------------------------------

func TestSectionHasPageNumbers_DirectMatch(t *testing.T) {
	sec := tocSection{StartPage: 5}
	if !sectionHasPageNumbers(sec) {
		t.Error("expected true for StartPage >= 0")
	}
}

func TestSectionHasPageNumbers_NestedMatch(t *testing.T) {
	sec := tocSection{
		StartPage: -1,
		Subsections: []tocSection{
			{StartPage: 3},
		},
	}
	if !sectionHasPageNumbers(sec) {
		t.Error("expected true for nested StartPage >= 0")
	}
}

func TestSectionHasPageNumbers_NoMatch(t *testing.T) {
	sec := tocSection{StartPage: -1}
	if sectionHasPageNumbers(sec) {
		t.Error("expected false for StartPage -1")
	}
}

// ---------------------------------------------------------------------------
// parseStructure
// ---------------------------------------------------------------------------

func TestParseStructure_Valid(t *testing.T) {
	parts, err := parseStructure("1.2.3")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(parts) != 3 || parts[0] != 1 || parts[1] != 2 || parts[2] != 3 {
		t.Errorf("parts = %v", parts)
	}
}

func TestParseStructure_Invalid(t *testing.T) {
	_, err := parseStructure("abc")
	if err == nil {
		t.Fatal("expected error for non-numeric structure")
	}
}

func TestParseStructure_Empty(t *testing.T) {
	_, err := parseStructure("")
	if err == nil {
		t.Fatal("expected error for empty structure")
	}
}

// ---------------------------------------------------------------------------
// Preserved tests: clampPageRanges
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Preserved tests: TOC calibration
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// detectTOC HasPageNumbers inference
// ---------------------------------------------------------------------------

func TestDetectTOC_SetsHasPageNumbers(t *testing.T) {
	pages := []domain.Page{
		{Index: 0, Markdown: "Table of Contents\n1. Intro ... 1\n2. Methods ... 5"},
	}
	llm := &mockLLM{
		responses: []string{
			`{"has_toc":true}`,
			`{"has_toc":true,"toc_end_page":0,"sections":[{"title":"Intro","start_page":1,"end_page":4,"subsections":[]},{"title":"Methods","start_page":5,"end_page":10,"subsections":[]}]}`,
		},
	}

	s := &Indexer{llm: llm}
	result, err := s.detectTOC(context.Background(), pages)
	if err != nil {
		t.Fatalf("detectTOC error: %v", err)
	}
	if !result.HasPageNumbers {
		t.Error("expected HasPageNumbers = true")
	}
}

func TestDetectTOC_NoPageNumbers(t *testing.T) {
	pages := []domain.Page{
		{Index: 0, Markdown: "Table of Contents\n1. Intro\n2. Methods"},
	}
	llm := &mockLLM{
		responses: []string{
			`{"has_toc":true}`,
			`{"has_toc":true,"toc_end_page":0,"sections":[{"title":"Intro","start_page":-1,"end_page":-1,"subsections":[]},{"title":"Methods","start_page":-1,"end_page":-1,"subsections":[]}]}`,
		},
	}

	s := &Indexer{llm: llm}
	result, err := s.detectTOC(context.Background(), pages)
	if err != nil {
		t.Fatalf("detectTOC error: %v", err)
	}
	if result.HasPageNumbers {
		t.Error("expected HasPageNumbers = false")
	}
}

func TestDetectTOC_AdditionalScanFindsPageNumbers(t *testing.T) {
	pages := []domain.Page{
		{Index: 0, Markdown: "Table of Contents\n1 Intro"},
		{Index: 1, Markdown: "Body page"},
		{Index: 2, Markdown: "Table of Contents\n1 Intro .... 4"},
		{Index: 3, Markdown: "Body page"},
	}
	llm := &mockLLM{
		responses: []string{
			// first scan from page 0
			`{"has_toc":true}`,
			`{"has_toc":false}`,
			// first TOC extraction: no page numbers
			`{"has_toc":true,"toc_end_page":0,"sections":[{"title":"Intro","start_page":-1,"end_page":-1,"subsections":[]}]}`,
			// second scan from page 1
			`{"has_toc":false}`,
			`{"has_toc":true}`,
			`{"has_toc":false}`,
			// second TOC extraction: has page numbers
			`{"has_toc":true,"toc_end_page":2,"sections":[{"title":"Intro","start_page":4,"end_page":6,"subsections":[]}]}`,
		},
	}

	s := &Indexer{llm: llm}
	result, err := s.detectTOC(context.Background(), pages)
	if err != nil {
		t.Fatalf("detectTOC error: %v", err)
	}
	if !result.HasTOC {
		t.Fatal("expected HasTOC = true")
	}
	if !result.HasPageNumbers {
		t.Fatal("expected HasPageNumbers = true from additional TOC scan")
	}
	if result.TOCEndPage != 2 {
		t.Fatalf("TOCEndPage = %d, want 2", result.TOCEndPage)
	}
}

func TestDetectTOC_StopsAfterTOCEnd(t *testing.T) {
	pages := []domain.Page{
		{Index: 0, Markdown: "TOC page 1"},
		{Index: 1, Markdown: "TOC page 2"},
		{Index: 2, Markdown: "Body page"},
		{Index: 3, Markdown: "Body page"},
	}
	llm := &mockLLM{
		responses: []string{
			`{"has_toc":true}`,
			`{"has_toc":true}`,
			`{"has_toc":false}`,
			`{"has_toc":true,"toc_end_page":1,"sections":[{"title":"Intro","start_page":1,"end_page":2,"subsections":[]}]}`,
		},
	}

	s := &Indexer{llm: llm}
	result, err := s.detectTOC(context.Background(), pages)
	if err != nil {
		t.Fatalf("detectTOC error: %v", err)
	}
	if !result.HasTOC {
		t.Fatal("expected HasTOC = true")
	}
	if llm.idx != 4 {
		t.Fatalf("llm calls = %d, want 4", llm.idx)
	}
}

// ---------------------------------------------------------------------------
// Build integration tests
// ---------------------------------------------------------------------------

func TestBuild_NoTOCMode(t *testing.T) {
	pages := []domain.Page{
		{Index: 0, Markdown: "Introduction to the report"},
		{Index: 1, Markdown: "Chapter 1: Analysis details"},
		{Index: 2, Markdown: "Chapter 2: Conclusion"},
	}

	llm := &mockLLM{
		responses: []string{
			// detectTOC page scan: no TOC found on all pages
			`{"has_toc":false}`,
			`{"has_toc":false}`,
			`{"has_toc":false}`,
			// processNoTOC → generateTOCInit
			`{"sections":[{"structure":"1","title":"Introduction","start_page":0},{"structure":"2","title":"Analysis","start_page":1},{"structure":"3","title":"Conclusion","start_page":2}]}`,
			// mode 3 verification: 3 calls
			`{"title_found":true,"appear_start":true}`,
			`{"title_found":true,"appear_start":true}`,
			`{"title_found":true,"appear_start":true}`,
			// checkAppearStart: 3 calls
			`{"appear_start":true}`,
			`{"appear_start":true}`,
			`{"appear_start":true}`,
		},
	}

	storage := &mockStorage{}
	s := NewIndexer(llm, storage, 50, 50000)
	tree, err := s.Build(context.Background(), "doc-1", pages)
	if err != nil {
		t.Fatalf("Build error: %v", err)
	}

	if tree.Root.Title != "Root" {
		t.Errorf("root.Title = %q", tree.Root.Title)
	}
	if len(tree.Root.Children) != 3 {
		t.Fatalf("root.Children = %d, want 3", len(tree.Root.Children))
	}
	if tree.Root.Children[0].Title != "Introduction" {
		t.Errorf("child[0].Title = %q", tree.Root.Children[0].Title)
	}
}

func TestBuild_TOCWithoutPageNumbers_StartsInNoTOCMode(t *testing.T) {
	pages := []domain.Page{
		{Index: 0, Markdown: "Table of Contents\n1 Intro"},
		{Index: 1, Markdown: "Chapter 1 content"},
		{Index: 2, Markdown: "Chapter 2 content"},
	}

	llm := &mockLLM{
		responses: []string{
			// detectTOC page scan
			`{"has_toc":true}`,
			`{"has_toc":false}`,
			// detectTOC extraction: no page numbers
			`{"has_toc":true,"toc_end_page":0,"sections":[{"title":"Intro","start_page":-1,"end_page":-1,"subsections":[]}]}`,
			// second TOC scan from next page: no more TOC pages
			`{"has_toc":false}`,
			`{"has_toc":false}`,
			// mode 3 generation
			`{"sections":[{"structure":"1","title":"Chapter 1","start_page":1},{"structure":"2","title":"Chapter 2","start_page":2}]}`,
			// mode 3 verification
			`{"title_found":true,"appear_start":true}`,
			`{"title_found":true,"appear_start":true}`,
			// appear_start checks
			`{"appear_start":true}`,
			`{"appear_start":true}`,
		},
	}

	storage := &mockStorage{}
	s := NewIndexer(llm, storage, 50, 50000)
	tree, err := s.Build(context.Background(), "doc-1", pages)
	if err != nil {
		t.Fatalf("Build error: %v", err)
	}

	if len(tree.Root.Children) != 3 {
		t.Fatalf("root.Children = %d, want 3 (preface + 2 sections)", len(tree.Root.Children))
	}
	if llm.idx != 8 {
		t.Fatalf("llm idx = %d, want 8 (single combined verify+appear pass)", llm.idx)
	}
}

func TestBuild_TOCWithPageNumbers(t *testing.T) {
	pages := make([]domain.Page, 15)
	for i := range pages {
		pages[i] = domain.Page{Index: i, Markdown: "Page content"}
	}

	llm := &mockLLM{
		responses: []string{
			// detectTOC page scan
			`{"has_toc":true}`,
			`{"has_toc":true}`,
			`{"has_toc":false}`,
			// detectTOC extraction: has TOC with page numbers
			`{"has_toc":true,"toc_end_page":1,"sections":[{"title":"Intro","start_page":1,"end_page":5,"subsections":[]},{"title":"Methods","start_page":6,"end_page":10,"subsections":[]}]}`,
			// calibrateTOCPageOffset LLM call
			`{"sections":[{"title":"Intro","physical_start_page":3},{"title":"Methods","physical_start_page":8}]}`,
			// verifyItems: 2 calls
			`{"title_found":true,"appear_start":true}`,
			`{"title_found":true,"appear_start":true}`,
			// checkAppearStart: preface + 2 section calls
			`{"appear_start":true}`,
			`{"appear_start":true}`,
			`{"appear_start":true}`,
		},
	}

	storage := &mockStorage{}
	s := NewIndexer(llm, storage, 50, 50000)
	tree, err := s.Build(context.Background(), "doc-1", pages)
	if err != nil {
		t.Fatalf("Build error: %v", err)
	}

	if tree.Root.Title != "Root" {
		t.Errorf("root.Title = %q", tree.Root.Title)
	}
	// Should have 2 sections + preface (since calibrated Intro starts at page 3)
	if len(tree.Root.Children) < 2 {
		t.Fatalf("root.Children = %d, want >= 2", len(tree.Root.Children))
	}
}

func TestBuild_CascadeFallback(t *testing.T) {
	pages := make([]domain.Page, 10)
	for i := range pages {
		pages[i] = domain.Page{Index: i, Markdown: "Page content"}
	}

	llm := &mockLLM{
		responses: []string{
			// detectTOC page scan
			`{"has_toc":true}`,
			`{"has_toc":false}`,
			// detectTOC extraction: has TOC with page numbers
			`{"has_toc":true,"toc_end_page":0,"sections":[{"title":"Chapter 1","start_page":8,"end_page":9,"subsections":[]}]}`,
			// calibrateTOCPageOffset
			`{"sections":[{"title":"Chapter 1","physical_start_page":8}]}`,
			// verifyItems for Mode 1: title NOT found → accuracy < 1.0
			`{"title_found":false,"appear_start":false}`,
			// accuracy < 0.6 (0/1 = 0.0), so fall through to Mode 2

			// processTOCNoPageNumbers: locate sections in pages
			`{"sections":[{"structure":"1","title":"Chapter 1","start_page":8}]}`,
			// verifyItems for Mode 2: found
			`{"title_found":true,"appear_start":true}`,

			// checkAppearStart: preface + chapter
			`{"appear_start":true}`,
			`{"appear_start":true}`,
		},
	}

	storage := &mockStorage{}
	s := NewIndexer(llm, storage, 50, 50000)
	tree, err := s.Build(context.Background(), "doc-1", pages)
	if err != nil {
		t.Fatalf("Build error: %v", err)
	}

	if tree.Root.Title != "Root" {
		t.Errorf("root.Title = %q", tree.Root.Title)
	}
	if len(tree.Root.Children) == 0 {
		t.Fatalf("root.Children = %d, want > 0", len(tree.Root.Children))
	}
}

func TestProcessNoTOC_MultipleGroupsUsesContinue(t *testing.T) {
	long := make([]byte, 50000)
	for i := range long {
		long[i] = 'a'
	}
	longText := string(long)

	pages := []domain.Page{
		{Index: 0, Markdown: longText},
		{Index: 1, Markdown: longText},
		{Index: 2, Markdown: longText},
	}

	llm := &mockLLM{
		responses: []string{
			`{"sections":[{"structure":"1","title":"A","start_page":0}]}`,
			`{"sections":[{"structure":"2","title":"B","start_page":1}]}`,
			`{"sections":[{"structure":"3","title":"C","start_page":2}]}`,
		},
	}

	s := &Indexer{llm: llm}
	items, err := s.processNoTOC(context.Background(), pages)
	if err != nil {
		t.Fatalf("processNoTOC error: %v", err)
	}
	if len(items) != 3 {
		t.Fatalf("items = %d, want 3", len(items))
	}
	if items[0].Title != "A" || items[1].Title != "B" || items[2].Title != "C" {
		t.Fatalf("unexpected titles: %+v", items)
	}
	if llm.idx != 3 {
		t.Fatalf("llm idx = %d, want 3 (init + 2 continue)", llm.idx)
	}
}
