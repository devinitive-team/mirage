package service

import (
	"bytes"
	"context"
	"errors"
	"io"
	"testing"
	"time"

	"github.com/devinitive-team/mirage/internal/domain"
)

type ingestStorageMock struct {
	doc          domain.Document
	openPDFErr   error
	savePagesErr error
	saveDocErr   error
	saveCalls    []domain.Document
	savedPages   []domain.Page
}

func (m *ingestStorageMock) GetDocument(context.Context, string) (domain.Document, error) {
	return m.doc, nil
}

func (m *ingestStorageMock) SaveDocument(_ context.Context, doc domain.Document) error {
	m.saveCalls = append(m.saveCalls, doc)
	if m.saveDocErr != nil {
		return m.saveDocErr
	}
	m.doc = doc
	return nil
}

func (m *ingestStorageMock) OpenPDF(context.Context, string) (io.ReadCloser, error) {
	if m.openPDFErr != nil {
		return nil, m.openPDFErr
	}
	return io.NopCloser(bytes.NewReader([]byte("%PDF-1.7"))), nil
}

func (m *ingestStorageMock) SavePages(_ context.Context, _ string, pages []domain.Page) error {
	if m.savePagesErr != nil {
		return m.savePagesErr
	}
	m.savedPages = append([]domain.Page(nil), pages...)
	return nil
}

type ingestOCRMock struct {
	pages []domain.Page
	err   error
}

func (m *ingestOCRMock) ExtractPages(context.Context, string, io.Reader) ([]domain.Page, error) {
	if m.err != nil {
		return nil, m.err
	}
	return append([]domain.Page(nil), m.pages...), nil
}

type ingestTreeMock struct {
	tree domain.TreeIndex
	err  error
}

func (m *ingestTreeMock) Build(context.Context, string, []domain.Page) (domain.TreeIndex, error) {
	if m.err != nil {
		return domain.TreeIndex{}, m.err
	}
	return m.tree, nil
}

func TestProcessSuccessMarksComplete(t *testing.T) {
	now := time.Now().UTC()
	storage := &ingestStorageMock{
		doc: domain.Document{
			ID:        "doc-1",
			Name:      "Report.pdf",
			Status:    domain.DocumentStatusPending,
			CreatedAt: now,
			UpdatedAt: now,
		},
	}
	ocr := &ingestOCRMock{
		pages: []domain.Page{
			{Index: 0, Markdown: "page 0"},
			{Index: 1, Markdown: "page 1"},
		},
	}
	tree := &ingestTreeMock{
		tree: domain.TreeIndex{
			DocumentID: "doc-1",
			Root: domain.TreeNode{
				Summary: "summary",
			},
		},
	}

	svc := NewIngest(storage, ocr, tree)
	if err := svc.Process(context.Background(), "doc-1"); err != nil {
		t.Fatalf("Process returned error: %v", err)
	}

	if len(storage.saveCalls) < 2 {
		t.Fatalf("SaveDocument calls = %d, want at least 2", len(storage.saveCalls))
	}
	first := storage.saveCalls[0]
	last := storage.saveCalls[len(storage.saveCalls)-1]
	if first.Status != domain.DocumentStatusProcessing {
		t.Fatalf("first status = %q, want processing", first.Status)
	}
	if last.Status != domain.DocumentStatusComplete {
		t.Fatalf("last status = %q, want complete", last.Status)
	}
	if last.PageCount != 2 {
		t.Fatalf("page_count = %d, want 2", last.PageCount)
	}
	if last.Description != "summary" {
		t.Fatalf("description = %q, want summary", last.Description)
	}
}

func TestProcessOpenPDFFailureMarksFailed(t *testing.T) {
	now := time.Now().UTC()
	storage := &ingestStorageMock{
		doc: domain.Document{
			ID:        "doc-1",
			Name:      "Report.pdf",
			Status:    domain.DocumentStatusPending,
			CreatedAt: now,
			UpdatedAt: now,
		},
		openPDFErr: errors.New("open failure"),
	}
	svc := NewIngest(storage, &ingestOCRMock{}, &ingestTreeMock{})

	err := svc.Process(context.Background(), "doc-1")
	if err == nil {
		t.Fatal("Process error = nil, want open pdf failure")
	}

	last := storage.saveCalls[len(storage.saveCalls)-1]
	if last.Status != domain.DocumentStatusFailed {
		t.Fatalf("last status = %q, want failed", last.Status)
	}
	if last.Error != "open failure" {
		t.Fatalf("last error = %q, want open failure", last.Error)
	}
}

func TestProcessExtractFailureMarksFailed(t *testing.T) {
	now := time.Now().UTC()
	storage := &ingestStorageMock{
		doc: domain.Document{
			ID:        "doc-1",
			Name:      "Report.pdf",
			Status:    domain.DocumentStatusPending,
			CreatedAt: now,
			UpdatedAt: now,
		},
	}
	ocr := &ingestOCRMock{err: errors.New("ocr failure")}
	svc := NewIngest(storage, ocr, &ingestTreeMock{})

	err := svc.Process(context.Background(), "doc-1")
	if err == nil {
		t.Fatal("Process error = nil, want OCR failure")
	}

	last := storage.saveCalls[len(storage.saveCalls)-1]
	if last.Status != domain.DocumentStatusFailed {
		t.Fatalf("last status = %q, want failed", last.Status)
	}
	if last.Error != "ocr failure" {
		t.Fatalf("last error = %q, want ocr failure", last.Error)
	}
}

func TestProcessBuildFailureMarksFailed(t *testing.T) {
	now := time.Now().UTC()
	storage := &ingestStorageMock{
		doc: domain.Document{
			ID:        "doc-1",
			Name:      "Report.pdf",
			Status:    domain.DocumentStatusPending,
			CreatedAt: now,
			UpdatedAt: now,
		},
	}
	ocr := &ingestOCRMock{
		pages: []domain.Page{
			{Index: 0, Markdown: "page 0"},
		},
	}
	tree := &ingestTreeMock{err: errors.New("tree failure")}
	svc := NewIngest(storage, ocr, tree)

	err := svc.Process(context.Background(), "doc-1")
	if err == nil {
		t.Fatal("Process error = nil, want tree build failure")
	}

	last := storage.saveCalls[len(storage.saveCalls)-1]
	if last.Status != domain.DocumentStatusFailed {
		t.Fatalf("last status = %q, want failed", last.Status)
	}
	if last.Error != "tree failure" {
		t.Fatalf("last error = %q, want tree failure", last.Error)
	}
}
