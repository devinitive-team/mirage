package fs

import (
	"bytes"
	"context"
	"io"
	"testing"

	"github.com/devinitive-team/mirage/internal/domain"
)

func TestSavePagesCreatesDocumentDirectory(t *testing.T) {
	storage := New(t.TempDir())

	err := storage.SavePages(context.Background(), "doc-1", []domain.Page{
		{Index: 0, Markdown: "page zero"},
	})
	if err != nil {
		t.Fatalf("SavePages returned error: %v", err)
	}

	pages, err := storage.GetPages(context.Background(), "doc-1")
	if err != nil {
		t.Fatalf("GetPages returned error: %v", err)
	}
	if len(pages) != 1 || pages[0].Index != 0 {
		t.Fatalf("pages = %#v, want one saved page", pages)
	}
}

func TestSaveTreeCreatesDocumentDirectory(t *testing.T) {
	storage := New(t.TempDir())

	err := storage.SaveTree(context.Background(), domain.TreeIndex{
		DocumentID: "doc-1",
		Root: domain.TreeNode{
			NodeID: "root",
			Title:  "Root",
		},
	})
	if err != nil {
		t.Fatalf("SaveTree returned error: %v", err)
	}

	tree, err := storage.GetTree(context.Background(), "doc-1")
	if err != nil {
		t.Fatalf("GetTree returned error: %v", err)
	}
	if tree.DocumentID != "doc-1" {
		t.Fatalf("document_id = %q, want doc-1", tree.DocumentID)
	}
}

func TestLoadHistoryReturnsEmptyWhenFileDoesNotExist(t *testing.T) {
	storage := New(t.TempDir())

	entries, err := storage.LoadHistory(context.Background())
	if err != nil {
		t.Fatalf("LoadHistory returned error: %v", err)
	}
	if len(entries) != 0 {
		t.Fatalf("len(entries) = %d, want 0", len(entries))
	}
}

func TestSaveAndLoadHistoryRoundTrips(t *testing.T) {
	storage := New(t.TempDir())

	want := []domain.HistoryEntry{
		{ID: "01ABC", Question: "Q1", Answer: "A1"},
		{ID: "01DEF", Question: "Q2", Answer: "A2"},
	}

	if err := storage.SaveHistory(context.Background(), want); err != nil {
		t.Fatalf("SaveHistory returned error: %v", err)
	}

	got, err := storage.LoadHistory(context.Background())
	if err != nil {
		t.Fatalf("LoadHistory returned error: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("len(entries) = %d, want 2", len(got))
	}
	if got[0].ID != "01ABC" || got[1].ID != "01DEF" {
		t.Fatalf("entries = %v, want ids 01ABC, 01DEF", got)
	}
}

func TestClearHistoryRemovesFile(t *testing.T) {
	storage := New(t.TempDir())

	_ = storage.SaveHistory(context.Background(), []domain.HistoryEntry{
		{ID: "01ABC", Question: "Q1", Answer: "A1"},
	})

	if err := storage.ClearHistory(context.Background()); err != nil {
		t.Fatalf("ClearHistory returned error: %v", err)
	}

	entries, err := storage.LoadHistory(context.Background())
	if err != nil {
		t.Fatalf("LoadHistory after clear returned error: %v", err)
	}
	if len(entries) != 0 {
		t.Fatalf("len(entries) = %d, want 0 after clear", len(entries))
	}
}

func TestClearHistoryIdempotent(t *testing.T) {
	storage := New(t.TempDir())

	if err := storage.ClearHistory(context.Background()); err != nil {
		t.Fatalf("ClearHistory on nonexistent file returned error: %v", err)
	}
}

func TestSavePDFWritesAndCanBeOpened(t *testing.T) {
	storage := New(t.TempDir())
	want := []byte("%PDF-1.7 content")

	if err := storage.SavePDF(context.Background(), "doc-1", bytes.NewReader(want)); err != nil {
		t.Fatalf("SavePDF returned error: %v", err)
	}

	reader, err := storage.OpenPDF(context.Background(), "doc-1")
	if err != nil {
		t.Fatalf("OpenPDF returned error: %v", err)
	}
	defer reader.Close()

	got, err := io.ReadAll(reader)
	if err != nil {
		t.Fatalf("ReadAll returned error: %v", err)
	}
	if !bytes.Equal(got, want) {
		t.Fatalf("pdf bytes mismatch")
	}
}
