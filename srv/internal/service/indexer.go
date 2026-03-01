package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strconv"
	"strings"

	"github.com/devinitive-team/mirage/internal/domain"
	"github.com/devinitive-team/mirage/internal/port"
)

type Indexer struct {
	llm              port.LLMProvider
	storage          indexStore
	maxPagesPerNode  int
	maxTokensPerNode int
}

type indexStore interface {
	SaveTree(ctx context.Context, tree domain.TreeIndex) error
}

func NewIndexer(llm port.LLMProvider, storage indexStore, maxPagesPerNode, maxTokensPerNode int) *Indexer {
	return &Indexer{
		llm:              llm,
		storage:          storage,
		maxPagesPerNode:  maxPagesPerNode,
		maxTokensPerNode: maxTokensPerNode,
	}
}

// tocItem is the flat intermediate produced by all processing modes.
type tocItem struct {
	Structure   string // hierarchical label: "1", "1.1", "1.2"
	Title       string
	StartPage   int  // physical page index (0-based)
	EndPage     int  // computed in post-processing
	AppearStart bool // true if section starts at beginning of its page
}

type tocResult struct {
	HasTOC         bool         `json:"has_toc"`
	HasPageNumbers bool         `json:"has_page_numbers"`
	TOCEndPage     int          `json:"toc_end_page"`
	Sections       []tocSection `json:"sections"`
}

type tocSection struct {
	Title       string       `json:"title"`
	StartPage   int          `json:"start_page"`
	EndPage     int          `json:"end_page"`
	Subsections []tocSection `json:"subsections"`
}

type tocPageLabel struct {
	Title string `json:"title"`
	Page  int    `json:"page"`
}

type tocPhysicalResult struct {
	Sections []tocPhysicalSection `json:"sections"`
}

type tocPhysicalSection struct {
	Title             string `json:"title"`
	PhysicalStartPage int    `json:"physical_start_page"`
}

type tocPagePair struct {
	Title             string
	Page              int
	PhysicalStartPage int
}

const (
	tocDetectPageCount       = 20
	tocCalibrationPageWindow = 20
	maxGroupChars           = 80000 // ~20k tokens
	verifyAccuracyThreshold = 0.6
	maxFixRetries            = 3
)

const tocSectionDefsJSONSchema = `
"$defs": {
	"sections": {
		"type": "array",
		"items": { "$ref": "#/$defs/section" }
	},
	"section": {
		"type": "object",
		"additionalProperties": false,
		"properties": {
			"title": { "type": "string" },
			"start_page": { "type": "integer" },
			"end_page": { "type": "integer" },
			"subsections": { "$ref": "#/$defs/sections" }
		},
		"required": ["title", "start_page", "end_page", "subsections"]
	}
}`

// ---------------------------------------------------------------------------
// Build — main entry point
// ---------------------------------------------------------------------------

func (s *Indexer) Build(ctx context.Context, docID string, pages []domain.Page) (domain.TreeIndex, error) {
	slog.InfoContext(ctx, "indexer started", "doc_id", docID, "page_count", len(pages))

	toc, err := s.detectTOC(ctx, pages)
	if err != nil {
		slog.ErrorContext(ctx, "indexer failed", "stage", "detect_toc", "error", err)
		return domain.TreeIndex{}, fmt.Errorf("detect toc: %w", err)
	}
	slog.InfoContext(ctx, "toc detected", "has_toc", toc.HasTOC, "has_page_numbers", toc.HasPageNumbers, "section_count", len(toc.Sections), "toc_end_page", toc.TOCEndPage)

	items, err := s.processWithFallback(ctx, toc, pages)
	if err != nil {
		slog.ErrorContext(ctx, "indexer failed", "stage", "process_structure", "error", err)
		return domain.TreeIndex{}, fmt.Errorf("process structure: %w", err)
	}
	slog.InfoContext(ctx, "structure processed", "item_count", len(items))

	items = addPrefaceIfNeeded(items)

	if err := s.checkAppearStart(ctx, items, pages); err != nil {
		slog.ErrorContext(ctx, "indexer failed", "stage", "check_appear_start", "error", err)
		return domain.TreeIndex{}, fmt.Errorf("check appear start: %w", err)
	}

	computeEndPages(items, len(pages))
	beforeFilter := len(items)
	items = filterInvalidItems(items)
	slog.InfoContext(ctx, "items finalized", "valid", len(items), "filtered", beforeFilter-len(items))

	root := listToTree(items, len(pages))
	slog.InfoContext(ctx, "tree built", "child_count", len(root.Children))

	if err := s.splitLargeNodes(ctx, &root, pages); err != nil {
		slog.ErrorContext(ctx, "indexer failed", "stage", "split_large_nodes", "error", err)
		return domain.TreeIndex{}, fmt.Errorf("split large nodes: %w", err)
	}

	clampPageRanges(&root, len(pages))

	counter := 0
	assignNodeIDs(&root, &counter)
	slog.InfoContext(ctx, "node ids assigned", "total_nodes", counter)

	if err := s.generateSummaries(ctx, &root, pages); err != nil {
		slog.ErrorContext(ctx, "indexer failed", "stage", "generate_summaries", "error", err)
		return domain.TreeIndex{}, fmt.Errorf("generate summaries: %w", err)
	}
	slog.InfoContext(ctx, "summaries generated", "total_nodes", counter)

	tree := domain.TreeIndex{
		DocumentID: docID,
		Root:       root,
	}
	if err := s.storage.SaveTree(ctx, tree); err != nil {
		slog.ErrorContext(ctx, "indexer failed", "stage", "save_tree", "error", err)
		return domain.TreeIndex{}, fmt.Errorf("save tree: %w", err)
	}

	slog.InfoContext(ctx, "indexer complete", "doc_id", docID, "total_nodes", counter)
	return tree, nil
}

// ---------------------------------------------------------------------------
// TOC detection
// ---------------------------------------------------------------------------

func (s *Indexer) detectTOC(ctx context.Context, pages []domain.Page) (tocResult, error) {
	n := min(tocDetectPageCount, len(pages))
	var sb strings.Builder
	for _, p := range pages[:n] {
		fmt.Fprintf(&sb, "<page_%d>\n%s\n</page_%d>\n\n", p.Index, p.Markdown, p.Index)
	}

	messages := []port.ChatMessage{
		{Role: "system", Content: "You are a document analysis assistant. Analyze the following pages and determine if they contain a table of contents. Each page is wrapped in <page_N> tags where N is the physical page index. If a TOC is present, extract sections using page labels printed in the TOC itself (not physical tag numbers). Return only integer page labels; if a label is missing or non-numeric, use -1. Also return toc_end_page as the N of the last TOC page in the provided input. If no TOC exists, return has_toc=false, toc_end_page=-1, sections=[]."},
		{Role: "user", Content: fmt.Sprintf("Analyze these pages for a table of contents. If found, return section title/start_page/end_page/subsections using printed TOC page labels (integers) and return toc_end_page from <page_N> tags.\n\n%s", sb.String())},
	}

	schema := `{
		"type": "object",
		"additionalProperties": false,
		"properties": {
			"has_toc": { "type": "boolean" },
			"toc_end_page": { "type": "integer" },
			"sections": { "$ref": "#/$defs/sections" }
		},
		"required": ["has_toc", "toc_end_page", "sections"],
	` + tocSectionDefsJSONSchema + `
	}`

	var result tocResult
	if err := completeAndDecodeJSON(ctx, s.llm, messages, schema, &result); err != nil {
		return tocResult{}, fmt.Errorf("unmarshal toc result: %w", err)
	}

	// Infer HasPageNumbers from section data.
	if result.HasTOC {
		for _, sec := range result.Sections {
			if sectionHasPageNumbers(sec) {
				result.HasPageNumbers = true
				break
			}
		}
	}

	return result, nil
}

func sectionHasPageNumbers(sec tocSection) bool {
	if sec.StartPage >= 0 {
		return true
	}
	for _, sub := range sec.Subsections {
		if sectionHasPageNumbers(sub) {
			return true
		}
	}
	return false
}

// ---------------------------------------------------------------------------
// Cascade fallback
// ---------------------------------------------------------------------------

func (s *Indexer) processWithFallback(ctx context.Context, toc tocResult, pages []domain.Page) ([]tocItem, error) {
	if toc.HasTOC && toc.HasPageNumbers {
		slog.InfoContext(ctx, "trying mode 1: toc with page numbers")
		items, err := s.processTOCWithPageNumbersCalibrated(ctx, toc, pages)
		if err == nil {
			accuracy, incorrectIndices, verr := s.verifyItems(ctx, items, pages)
			if verr == nil {
				slog.InfoContext(ctx, "mode 1 verified", "accuracy", accuracy, "incorrect", len(incorrectIndices), "total", len(items))
				if accuracy == 1.0 {
					return items, nil
				}
				if accuracy >= verifyAccuracyThreshold {
					if ferr := s.fixIncorrectItems(ctx, items, incorrectIndices, pages); ferr == nil {
						return items, nil
					}
					slog.WarnContext(ctx, "mode 1 fix failed, falling through")
				} else {
					slog.WarnContext(ctx, "mode 1 accuracy too low, falling through", "accuracy", accuracy)
				}
			} else {
				slog.WarnContext(ctx, "mode 1 verification failed, falling through", "error", verr)
			}
		} else {
			slog.WarnContext(ctx, "mode 1 processing failed, falling through", "error", err)
		}
	}

	if toc.HasTOC {
		slog.InfoContext(ctx, "trying mode 2: toc without page numbers")
		items, err := s.processTOCNoPageNumbers(ctx, toc, pages)
		if err == nil {
			accuracy, incorrectIndices, verr := s.verifyItems(ctx, items, pages)
			if verr == nil {
				slog.InfoContext(ctx, "mode 2 verified", "accuracy", accuracy, "incorrect", len(incorrectIndices), "total", len(items))
				if accuracy == 1.0 {
					return items, nil
				}
				if accuracy >= verifyAccuracyThreshold {
					if ferr := s.fixIncorrectItems(ctx, items, incorrectIndices, pages); ferr == nil {
						return items, nil
					}
					slog.WarnContext(ctx, "mode 2 fix failed, falling through")
				} else {
					slog.WarnContext(ctx, "mode 2 accuracy too low, falling through", "accuracy", accuracy)
				}
			} else {
				slog.WarnContext(ctx, "mode 2 verification failed, falling through", "error", verr)
			}
		} else {
			slog.WarnContext(ctx, "mode 2 processing failed, falling through", "error", err)
		}
	}

	slog.InfoContext(ctx, "using mode 3: no toc (chunked incremental)")
	return s.processNoTOC(ctx, pages)
}

// ---------------------------------------------------------------------------
// Mode 1: TOC with page numbers
// ---------------------------------------------------------------------------

func (s *Indexer) processTOCWithPageNumbersCalibrated(ctx context.Context, toc tocResult, pages []domain.Page) ([]tocItem, error) {
	calibrated := s.calibrateTOCPageOffset(ctx, toc, pages)
	return flattenToItems(calibrated), nil
}

// flattenToItems converts nested tocSections into a flat []tocItem with
// structure labels generated during the recursive walk.
func flattenToItems(sections []tocSection) []tocItem {
	var items []tocItem
	var walk func(secs []tocSection, prefix string)
	walk = func(secs []tocSection, prefix string) {
		for i, sec := range secs {
			label := fmt.Sprintf("%s%d", prefix, i+1)
			items = append(items, tocItem{
				Structure: label,
				Title:     sec.Title,
				StartPage: sec.StartPage,
				EndPage:   sec.EndPage,
			})
			if len(sec.Subsections) > 0 {
				walk(sec.Subsections, label+".")
			}
		}
	}
	walk(sections, "")
	return items
}

// ---------------------------------------------------------------------------
// Mode 2: TOC without page numbers
// ---------------------------------------------------------------------------

func (s *Indexer) processTOCNoPageNumbers(ctx context.Context, toc tocResult, pages []domain.Page) ([]tocItem, error) {
	// Build title list from TOC sections.
	type titleEntry struct {
		Structure string `json:"structure"`
		Title     string `json:"title"`
	}
	var titles []titleEntry
	var walk func(secs []tocSection, prefix string)
	walk = func(secs []tocSection, prefix string) {
		for i, sec := range secs {
			label := fmt.Sprintf("%s%d", prefix, i+1)
			titles = append(titles, titleEntry{Structure: label, Title: sec.Title})
			if len(sec.Subsections) > 0 {
				walk(sec.Subsections, label+".")
			}
		}
	}
	walk(toc.Sections, "")

	titlesJSON, err := json.Marshal(titles)
	if err != nil {
		return nil, fmt.Errorf("marshal titles: %w", err)
	}

	groups := pageListToGroups(pages, maxGroupChars)

	type locateResult struct {
		Sections []struct {
			Structure string `json:"structure"`
			Title     string `json:"title"`
			StartPage int    `json:"start_page"`
		} `json:"sections"`
	}

	schema := `{
		"type": "object",
		"additionalProperties": false,
		"properties": {
			"sections": {
				"type": "array",
				"items": {
					"type": "object",
					"additionalProperties": false,
					"properties": {
						"structure": { "type": "string" },
						"title": { "type": "string" },
						"start_page": { "type": "integer" }
					},
					"required": ["structure", "title", "start_page"]
				}
			}
		},
		"required": ["sections"]
	}`

	slog.InfoContext(ctx, "locating sections in pages", "title_count", len(titles), "group_count", len(groups))

	found := make(map[string]tocItem)
	for gi, group := range groups {
		messages := []port.ChatMessage{
			{Role: "system", Content: "You are a document analysis assistant. Given a list of section titles and document pages wrapped in <page_N> tags, find the physical page where each section starts. Only return sections that start within the provided pages. Use -1 for sections not found."},
			{Role: "user", Content: fmt.Sprintf("Section titles:\n%s\n\nDocument pages:\n%s\n\nReturn the physical start page for each section found in these pages.", string(titlesJSON), group.text)},
		}

		var result locateResult
		if err := completeAndDecodeJSON(ctx, s.llm, messages, schema, &result); err != nil {
			slog.WarnContext(ctx, "locate group failed", "group", gi, "error", err)
			continue
		}
		for _, sec := range result.Sections {
			if sec.StartPage >= 0 {
				found[sec.Structure] = tocItem{
					Structure: sec.Structure,
					Title:     sec.Title,
					StartPage: sec.StartPage,
				}
			}
		}
	}

	slog.InfoContext(ctx, "sections located", "found", len(found), "total", len(titles))

	// Build final list in original order.
	var items []tocItem
	for _, t := range titles {
		if item, ok := found[t.Structure]; ok {
			items = append(items, item)
		} else {
			items = append(items, tocItem{
				Structure: t.Structure,
				Title:     t.Title,
				StartPage: -1,
			})
		}
	}

	return items, nil
}

// ---------------------------------------------------------------------------
// Mode 3: No TOC — chunked incremental
// ---------------------------------------------------------------------------

func (s *Indexer) processNoTOC(ctx context.Context, pages []domain.Page) ([]tocItem, error) {
	groups := pageListToGroups(pages, maxGroupChars)
	if len(groups) == 0 {
		return nil, nil
	}

	slog.InfoContext(ctx, "process no-toc", "page_count", len(pages), "group_count", len(groups))

	items, err := s.generateTOCInit(ctx, groups[0].text)
	if err != nil {
		return nil, fmt.Errorf("generate toc init: %w", err)
	}
	slog.InfoContext(ctx, "toc init complete", "item_count", len(items))

	for gi, group := range groups[1:] {
		more, err := s.generateTOCContinue(ctx, group.text, items)
		if err != nil {
			slog.WarnContext(ctx, "toc continue failed", "group", gi+1, "error", err)
			continue
		}
		items = append(items, more...)
		slog.InfoContext(ctx, "toc continue complete", "group", gi+1, "new_items", len(more), "total_items", len(items))
	}

	return items, nil
}

type tocInitResult struct {
	Sections []struct {
		Structure string `json:"structure"`
		Title     string `json:"title"`
		StartPage int    `json:"start_page"`
	} `json:"sections"`
}

const tocItemsJSONSchema = `{
	"type": "object",
	"additionalProperties": false,
	"properties": {
		"sections": {
			"type": "array",
			"items": {
				"type": "object",
				"additionalProperties": false,
				"properties": {
					"structure": { "type": "string" },
					"title": { "type": "string" },
					"start_page": { "type": "integer" }
				},
				"required": ["structure", "title", "start_page"]
			}
		}
	},
	"required": ["sections"]
}`

func (s *Indexer) generateTOCInit(ctx context.Context, groupText string) ([]tocItem, error) {
	messages := []port.ChatMessage{
		{Role: "system", Content: "You are a document analysis assistant. Group the following pages into logical sections and chapters. Each page is wrapped in <page_N> tags where N is the physical page number. Return a flat list of sections with structure labels (e.g. '1', '1.1', '2'), titles, and the physical start_page from the <page_N> tags."},
		{Role: "user", Content: fmt.Sprintf("Group these pages into logical sections. Return structure, title, and start_page for each.\n\n%s", groupText)},
	}

	var result tocInitResult
	if err := completeAndDecodeJSON(ctx, s.llm, messages, tocItemsJSONSchema, &result); err != nil {
		return nil, err
	}

	items := make([]tocItem, len(result.Sections))
	for i, sec := range result.Sections {
		items[i] = tocItem{
			Structure: sec.Structure,
			Title:     sec.Title,
			StartPage: sec.StartPage,
		}
	}
	return items, nil
}

func (s *Indexer) generateTOCContinue(ctx context.Context, groupText string, existing []tocItem) ([]tocItem, error) {
	existingJSON, err := json.Marshal(existing)
	if err != nil {
		return nil, err
	}

	messages := []port.ChatMessage{
		{Role: "system", Content: "You are a document analysis assistant. Continue grouping document pages into logical sections. You are given previously identified sections and new pages. Return ONLY new sections found in the new pages. Use structure labels that continue from the existing sections."},
		{Role: "user", Content: fmt.Sprintf("Existing sections:\n%s\n\nNew pages:\n%s\n\nReturn only new sections found in these pages.", string(existingJSON), groupText)},
	}

	var result tocInitResult
	if err := completeAndDecodeJSON(ctx, s.llm, messages, tocItemsJSONSchema, &result); err != nil {
		return nil, err
	}

	items := make([]tocItem, len(result.Sections))
	for i, sec := range result.Sections {
		items[i] = tocItem{
			Structure: sec.Structure,
			Title:     sec.Title,
			StartPage: sec.StartPage,
		}
	}
	return items, nil
}

// ---------------------------------------------------------------------------
// appear_start detection
// ---------------------------------------------------------------------------

func (s *Indexer) checkAppearStart(ctx context.Context, items []tocItem, pages []domain.Page) error {
	eligible := 0
	for _, item := range items {
		if item.StartPage >= 0 {
			eligible++
		}
	}
	slog.InfoContext(ctx, "checking appear_start", "eligible", eligible, "total", len(items))

	pageMap := make(map[int]string, len(pages))
	for _, p := range pages {
		pageMap[p.Index] = p.Markdown
	}

	schema := `{
		"type": "object",
		"additionalProperties": false,
		"properties": {
			"appear_start": { "type": "boolean" }
		},
		"required": ["appear_start"]
	}`

	appearCount := 0
	for i := range items {
		if items[i].StartPage < 0 {
			continue
		}
		pageText, ok := pageMap[items[i].StartPage]
		if !ok {
			continue
		}

		messages := []port.ChatMessage{
			{Role: "system", Content: "You are a document analysis assistant. Determine if the given section title appears at the very beginning of the page text, or if there is other content before it."},
			{Role: "user", Content: fmt.Sprintf("Section title: %q\n\nPage text:\n%s\n\nDoes this section title appear at the start of the page?", items[i].Title, pageText)},
		}

		var result struct {
			AppearStart bool `json:"appear_start"`
		}
		if err := completeAndDecodeJSON(ctx, s.llm, messages, schema, &result); err != nil {
			continue // non-fatal: default is false
		}
		items[i].AppearStart = result.AppearStart
		if result.AppearStart {
			appearCount++
		}
	}

	slog.InfoContext(ctx, "appear_start complete", "appear_true", appearCount, "total", len(items))
	return nil
}

// ---------------------------------------------------------------------------
// End page computation
// ---------------------------------------------------------------------------

func computeEndPages(items []tocItem, totalPages int) {
	for i := range items {
		if i < len(items)-1 {
			if items[i+1].AppearStart {
				items[i].EndPage = items[i+1].StartPage - 1
			} else {
				items[i].EndPage = items[i+1].StartPage
			}
		} else {
			items[i].EndPage = totalPages - 1
		}
	}
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

func (s *Indexer) verifyItems(ctx context.Context, items []tocItem, pages []domain.Page) (float64, []int, error) {
	slog.InfoContext(ctx, "verifying items", "item_count", len(items))
	if len(items) == 0 {
		return 1.0, nil, nil
	}

	// Upstream sanity check: if the last valid item doesn't reach at least
	// halfway through the document, the TOC mapping is clearly broken.
	lastPage := -1
	for i := len(items) - 1; i >= 0; i-- {
		if items[i].StartPage >= 0 {
			lastPage = items[i].StartPage
			break
		}
	}
	if lastPage < 0 || lastPage < len(pages)/2 {
		slog.WarnContext(ctx, "verification short-circuit: last item too early", "last_page", lastPage, "total_pages", len(pages))
		all := make([]int, len(items))
		for i := range all {
			all[i] = i
		}
		return 0, all, nil
	}

	pageMap := make(map[int]string, len(pages))
	for _, p := range pages {
		pageMap[p.Index] = p.Markdown
	}

	schema := `{
		"type": "object",
		"additionalProperties": false,
		"properties": {
			"title_found": { "type": "boolean" }
		},
		"required": ["title_found"]
	}`

	correct := 0
	var incorrectIndices []int

	for i := range items {
		if items[i].StartPage < 0 {
			incorrectIndices = append(incorrectIndices, i)
			continue
		}
		pageText, ok := pageMap[items[i].StartPage]
		if !ok {
			incorrectIndices = append(incorrectIndices, i)
			continue
		}

		messages := []port.ChatMessage{
			{Role: "system", Content: "You are a document analysis assistant. Determine if the given section title appears on the given page."},
			{Role: "user", Content: fmt.Sprintf("Section title: %q\n\nPage text:\n%s\n\nDoes this title appear on this page?", items[i].Title, pageText)},
		}

		var result struct {
			TitleFound bool `json:"title_found"`
		}
		if err := completeAndDecodeJSON(ctx, s.llm, messages, schema, &result); err != nil {
			incorrectIndices = append(incorrectIndices, i)
			continue
		}
		if result.TitleFound {
			correct++
		} else {
			incorrectIndices = append(incorrectIndices, i)
		}
	}

	accuracy := float64(correct) / float64(len(items))
	return accuracy, incorrectIndices, nil
}

// ---------------------------------------------------------------------------
// Fix incorrect items with retries
// ---------------------------------------------------------------------------

func (s *Indexer) fixIncorrectItems(ctx context.Context, items []tocItem, incorrectIndices []int, pages []domain.Page) error {
	slog.InfoContext(ctx, "fixing incorrect items", "incorrect", len(incorrectIndices), "total", len(items))

	pageMap := make(map[int]string, len(pages))
	for _, p := range pages {
		pageMap[p.Index] = p.Markdown
	}

	schema := `{
		"type": "object",
		"additionalProperties": false,
		"properties": {
			"start_page": { "type": "integer" }
		},
		"required": ["start_page"]
	}`

	remaining := make([]int, len(incorrectIndices))
	copy(remaining, incorrectIndices)

	for round := 0; round < maxFixRetries && len(remaining) > 0; round++ {
		var stillIncorrect []int

		for _, idx := range remaining {
			// Find previous and next correct neighbors.
			searchStart := 0
			searchEnd := len(pages) - 1

			for prev := idx - 1; prev >= 0; prev-- {
				if !containsInt(remaining, prev) && items[prev].StartPage >= 0 {
					searchStart = items[prev].StartPage
					break
				}
			}
			for next := idx + 1; next < len(items); next++ {
				if !containsInt(remaining, next) && items[next].StartPage >= 0 {
					searchEnd = items[next].StartPage
					break
				}
			}

			// Build page text for the search range.
			var sb strings.Builder
			for _, p := range pages {
				if p.Index >= searchStart && p.Index <= searchEnd {
					fmt.Fprintf(&sb, "<page_%d>\n%s\n</page_%d>\n\n", p.Index, p.Markdown, p.Index)
				}
			}

			messages := []port.ChatMessage{
				{Role: "system", Content: "You are a document analysis assistant. Find the physical page where the given section starts within the provided pages."},
				{Role: "user", Content: fmt.Sprintf("Section title: %q\n\nPages:\n%s\n\nReturn the physical start_page where this section begins.", items[idx].Title, sb.String())},
			}

			var result struct {
				StartPage int `json:"start_page"`
			}
			if err := completeAndDecodeJSON(ctx, s.llm, messages, schema, &result); err != nil {
				stillIncorrect = append(stillIncorrect, idx)
				continue
			}

			items[idx].StartPage = result.StartPage

			// Re-verify the fix.
			if pageText, ok := pageMap[result.StartPage]; ok {
				verifyMessages := []port.ChatMessage{
					{Role: "system", Content: "Determine if the section title appears on this page."},
					{Role: "user", Content: fmt.Sprintf("Section title: %q\n\nPage text:\n%s\n\nDoes this title appear?", items[idx].Title, pageText)},
				}
				var vr struct {
					TitleFound bool `json:"title_found"`
				}
				verifySchema := `{
					"type": "object",
					"additionalProperties": false,
					"properties": { "title_found": { "type": "boolean" } },
					"required": ["title_found"]
				}`
				if err := completeAndDecodeJSON(ctx, s.llm, verifyMessages, verifySchema, &vr); err != nil || !vr.TitleFound {
					stillIncorrect = append(stillIncorrect, idx)
				}
			}
		}

		remaining = stillIncorrect
		slog.InfoContext(ctx, "fix round complete", "round", round+1, "remaining", len(remaining))
	}

	return nil
}

func containsInt(slice []int, val int) bool {
	for _, v := range slice {
		if v == val {
			return true
		}
	}
	return false
}

// ---------------------------------------------------------------------------
// Preface insertion
// ---------------------------------------------------------------------------

func addPrefaceIfNeeded(items []tocItem) []tocItem {
	if len(items) > 0 && items[0].StartPage > 0 {
		preface := tocItem{
			Structure: "0",
			Title:     "Preface",
			StartPage: 0,
		}
		items = append([]tocItem{preface}, items...)
	}
	return items
}

// ---------------------------------------------------------------------------
// Filter invalid items
// ---------------------------------------------------------------------------

func filterInvalidItems(items []tocItem) []tocItem {
	var valid []tocItem
	for _, item := range items {
		if item.StartPage >= 0 {
			valid = append(valid, item)
		}
	}
	return valid
}

// ---------------------------------------------------------------------------
// List to tree
// ---------------------------------------------------------------------------

func listToTree(items []tocItem, totalPages int) domain.TreeNode {
	root := domain.TreeNode{
		Title:     "Root",
		StartPage: 0,
		EndPage:   totalPages - 1,
	}

	if len(items) == 0 {
		return root
	}

	// Try structure-based tree building.
	type treeEntry struct {
		item  tocItem
		node  *domain.TreeNode
		depth int
		parts []int
	}

	entries := make([]treeEntry, 0, len(items))
	validStructure := true
	for _, item := range items {
		parts, err := parseStructure(item.Structure)
		if err != nil || len(parts) == 0 {
			validStructure = false
			break
		}
		entries = append(entries, treeEntry{
			item:  item,
			depth: len(parts),
			parts: parts,
		})
	}

	if !validStructure {
		// Fallback: all items as direct children of root.
		root.Children = make([]domain.TreeNode, len(items))
		for i, item := range items {
			root.Children[i] = domain.TreeNode{
				Title:     item.Title,
				StartPage: item.StartPage,
				EndPage:   item.EndPage,
			}
		}
		return root
	}

	// Build tree from structure labels.
	// Use a stack-based approach: track current parent at each depth.
	type stackEntry struct {
		node  *domain.TreeNode
		depth int
		parts []int
	}

	root.Children = make([]domain.TreeNode, 0)
	stack := []stackEntry{{node: &root, depth: 0}}

	for _, e := range entries {
		node := domain.TreeNode{
			Title:     e.item.Title,
			StartPage: e.item.StartPage,
			EndPage:   e.item.EndPage,
		}

		// Find the correct parent: walk up the stack until we find a node
		// at a lower depth.
		for len(stack) > 1 && stack[len(stack)-1].depth >= e.depth {
			stack = stack[:len(stack)-1]
		}

		parent := stack[len(stack)-1].node
		parent.Children = append(parent.Children, node)

		// Push this node onto the stack as a potential parent.
		childPtr := &parent.Children[len(parent.Children)-1]
		stack = append(stack, stackEntry{node: childPtr, depth: e.depth, parts: e.parts})
	}

	return root
}

func parseStructure(s string) ([]int, error) {
	if s == "" {
		return nil, fmt.Errorf("empty structure")
	}
	parts := strings.Split(s, ".")
	result := make([]int, len(parts))
	for i, p := range parts {
		n, err := strconv.Atoi(p)
		if err != nil {
			return nil, fmt.Errorf("invalid structure part %q: %w", p, err)
		}
		result[i] = n
	}
	return result, nil
}

// ---------------------------------------------------------------------------
// Large-node splitting
// ---------------------------------------------------------------------------

func (s *Indexer) splitLargeNodes(ctx context.Context, root *domain.TreeNode, pages []domain.Page) error {
	return s.splitNodeRecursive(ctx, root, pages)
}

func (s *Indexer) splitNodeRecursive(ctx context.Context, node *domain.TreeNode, pages []domain.Page) error {
	// Process children first (may add grandchildren).
	for i := range node.Children {
		if err := s.splitNodeRecursive(ctx, &node.Children[i], pages); err != nil {
			return err
		}
	}

	// Only split leaf nodes that are too large.
	if len(node.Children) > 0 {
		return nil
	}

	pageSpan := node.EndPage - node.StartPage + 1
	if pageSpan <= s.maxPagesPerNode {
		return nil
	}

	// Check character count.
	charCount := 0
	var nodePages []domain.Page
	for _, p := range pages {
		if p.Index >= node.StartPage && p.Index <= node.EndPage {
			charCount += len(p.Markdown)
			nodePages = append(nodePages, p)
		}
	}
	if charCount <= s.maxTokensPerNode*4 {
		return nil
	}

	slog.InfoContext(ctx, "splitting large node", "title", node.Title, "pages", pageSpan, "chars", charCount)

	// Split using processNoTOC.
	subItems, err := s.processNoTOC(ctx, nodePages)
	if err != nil || len(subItems) <= 1 {
		return nil // can't split further
	}

	if err := s.checkAppearStart(ctx, subItems, nodePages); err != nil {
		return nil
	}
	computeEndPages(subItems, node.EndPage+1)

	// Skip first sub-item if its title matches the parent, and shrink the
	// parent's EndPage to just before the first child (upstream behavior).
	if len(subItems) > 0 && subItems[0].Title == node.Title {
		subItems = subItems[1:]
		if len(subItems) > 0 {
			node.EndPage = subItems[0].StartPage
		}
	} else if len(subItems) > 0 {
		node.EndPage = subItems[0].StartPage
	}

	// Convert to child nodes.
	node.Children = make([]domain.TreeNode, len(subItems))
	for i, item := range subItems {
		node.Children[i] = domain.TreeNode{
			Title:     item.Title,
			StartPage: item.StartPage,
			EndPage:   item.EndPage,
		}
	}
	slog.InfoContext(ctx, "node split complete", "title", node.Title, "children", len(node.Children))

	// Recurse into new children.
	for i := range node.Children {
		if err := s.splitNodeRecursive(ctx, &node.Children[i], pages); err != nil {
			return err
		}
	}

	return nil
}

// ---------------------------------------------------------------------------
// Summary generation
// ---------------------------------------------------------------------------

func (s *Indexer) generateSummaries(ctx context.Context, root *domain.TreeNode, pages []domain.Page) error {
	var nodes []*domain.TreeNode
	collectNodes(root, &nodes)
	slog.InfoContext(ctx, "generating summaries", "node_count", len(nodes))

	for i, n := range nodes {
		var sb strings.Builder
		for _, p := range pages {
			if p.Index >= n.StartPage && p.Index <= n.EndPage {
				fmt.Fprintf(&sb, "--- Page %d ---\n%s\n", p.Index, p.Markdown)
			}
		}

		messages := []port.ChatMessage{
			{Role: "system", Content: "You are a document summarization assistant. Provide a concise 2-3 sentence summary of the following content."},
			{Role: "user", Content: fmt.Sprintf("Summarize the following section titled %q:\n\n%s", n.Title, sb.String())},
		}

		summary, err := s.llm.Complete(ctx, messages)
		if err != nil {
			return fmt.Errorf("summarize node %s: %w", n.NodeID, err)
		}
		n.Summary = summary
		slog.InfoContext(ctx, "summary generated", "node", n.NodeID, "progress", fmt.Sprintf("%d/%d", i+1, len(nodes)))
	}

	return nil
}

func collectNodes(node *domain.TreeNode, nodes *[]*domain.TreeNode) {
	*nodes = append(*nodes, node)
	for i := range node.Children {
		collectNodes(&node.Children[i], nodes)
	}
}

// ---------------------------------------------------------------------------
// Page grouping helper
// ---------------------------------------------------------------------------

type pageGroup struct {
	text string
}

func pageListToGroups(pages []domain.Page, maxChars int) []pageGroup {
	var groups []pageGroup
	var sb strings.Builder
	chars := 0

	for _, p := range pages {
		entry := fmt.Sprintf("<page_%d>\n%s\n</page_%d>\n\n", p.Index, p.Markdown, p.Index)
		if chars+len(entry) > maxChars && chars > 0 {
			groups = append(groups, pageGroup{text: sb.String()})
			sb.Reset()
			chars = 0
		}
		sb.WriteString(entry)
		chars += len(entry)
	}

	if chars > 0 {
		groups = append(groups, pageGroup{text: sb.String()})
	}

	return groups
}

// ---------------------------------------------------------------------------
// TOC calibration (preserved from original)
// ---------------------------------------------------------------------------

func (s *Indexer) calibrateTOCPageOffset(ctx context.Context, toc tocResult, pages []domain.Page) []tocSection {
	if len(toc.Sections) == 0 || len(pages) == 0 {
		return toc.Sections
	}

	sections := cloneTOCSections(toc.Sections)
	labels := flattenTOCPageLabels(sections)
	if len(labels) == 0 {
		return sections
	}

	startPage := toc.TOCEndPage + 1
	if startPage < 0 {
		startPage = min(tocDetectPageCount, len(pages))
	}
	if startPage >= len(pages) {
		return sections
	}

	endPage := min(startPage+tocCalibrationPageWindow, len(pages))
	var pagesSB strings.Builder
	for _, p := range pages[startPage:endPage] {
		fmt.Fprintf(&pagesSB, "<page_%d>\n%s\n</page_%d>\n\n", p.Index, p.Markdown, p.Index)
	}

	labelsJSON, err := json.Marshal(labels)
	if err != nil {
		return sections
	}

	messages := []port.ChatMessage{
		{Role: "system", Content: "You map TOC section titles to physical start pages. Document pages are wrapped in <page_N> tags where N is the physical page index. Return matches only for sections that start in the provided pages."},
		{Role: "user", Content: fmt.Sprintf("TOC sections with logical page labels:\n%s\n\nDocument pages:\n%s\n\nReturn matched sections with title and physical_start_page.", string(labelsJSON), pagesSB.String())},
	}

	schema := `{
		"type": "object",
		"additionalProperties": false,
		"properties": {
			"sections": {
				"type": "array",
				"items": {
					"type": "object",
					"additionalProperties": false,
					"properties": {
						"title": { "type": "string" },
						"physical_start_page": { "type": "integer" }
					},
					"required": ["title", "physical_start_page"]
				}
			}
		},
		"required": ["sections"]
	}`

	var physical tocPhysicalResult
	if err := completeAndDecodeJSON(ctx, s.llm, messages, schema, &physical); err != nil {
		return sections
	}

	pairs := extractMatchingTOCPagePairs(labels, physical.Sections, startPage)
	offset, ok := calculateTOCPageOffset(pairs)
	if !ok {
		slog.InfoContext(ctx, "toc calibration: no offset found", "pairs", len(pairs))
		return sections
	}

	applyTOCPageOffset(sections, offset)
	slog.InfoContext(ctx, "toc calibrated", "offset", offset, "pairs", len(pairs))
	return sections
}

func cloneTOCSections(sections []tocSection) []tocSection {
	cloned := make([]tocSection, len(sections))
	for i := range sections {
		cloned[i] = sections[i]
		if len(sections[i].Subsections) > 0 {
			cloned[i].Subsections = cloneTOCSections(sections[i].Subsections)
		}
	}
	return cloned
}

func flattenTOCPageLabels(sections []tocSection) []tocPageLabel {
	labels := make([]tocPageLabel, 0, len(sections))
	var walk func(items []tocSection)
	walk = func(items []tocSection) {
		for _, item := range items {
			labels = append(labels, tocPageLabel{
				Title: item.Title,
				Page:  item.StartPage,
			})
			if len(item.Subsections) > 0 {
				walk(item.Subsections)
			}
		}
	}
	walk(sections)
	return labels
}

func extractMatchingTOCPagePairs(labels []tocPageLabel, physical []tocPhysicalSection, startPage int) []tocPagePair {
	pairs := make([]tocPagePair, 0)
	for _, physicalItem := range physical {
		for _, labelItem := range labels {
			if physicalItem.Title != labelItem.Title {
				continue
			}
			if physicalItem.PhysicalStartPage < startPage || labelItem.Page < 0 {
				continue
			}
			pairs = append(pairs, tocPagePair{
				Title:             physicalItem.Title,
				Page:              labelItem.Page,
				PhysicalStartPage: physicalItem.PhysicalStartPage,
			})
		}
	}
	return pairs
}

func calculateTOCPageOffset(pairs []tocPagePair) (int, bool) {
	if len(pairs) == 0 {
		return 0, false
	}

	counts := make(map[int]int)
	order := make([]int, 0, len(pairs))
	for _, pair := range pairs {
		diff := pair.PhysicalStartPage - pair.Page
		if _, ok := counts[diff]; !ok {
			order = append(order, diff)
		}
		counts[diff]++
	}

	bestDiff := 0
	bestCount := -1
	for _, diff := range order {
		if counts[diff] > bestCount {
			bestDiff = diff
			bestCount = counts[diff]
		}
	}

	return bestDiff, true
}

func applyTOCPageOffset(sections []tocSection, offset int) {
	for i := range sections {
		if sections[i].StartPage >= 0 {
			sections[i].StartPage += offset
		}
		if sections[i].EndPage >= 0 {
			sections[i].EndPage += offset
		}
		if len(sections[i].Subsections) > 0 {
			applyTOCPageOffset(sections[i].Subsections, offset)
		}
	}
}

func assignNodeIDs(node *domain.TreeNode, counter *int) {
	*counter++
	node.NodeID = fmt.Sprintf("%04d", *counter)
	for i := range node.Children {
		assignNodeIDs(&node.Children[i], counter)
	}
}

// clampPageRanges ensures all page ranges in the tree are within valid bounds.
func clampPageRanges(node *domain.TreeNode, pageCount int) {
	if node.StartPage < 0 {
		node.StartPage = 0
	}
	if node.EndPage >= pageCount {
		node.EndPage = pageCount - 1
	}
	if node.StartPage > node.EndPage {
		node.StartPage = node.EndPage
	}
	for i := range node.Children {
		clampPageRanges(&node.Children[i], pageCount)
	}
}
