package api

import (
	"bytes"
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/devinitive-team/mirage/internal/adapter/fs"
	"github.com/devinitive-team/mirage/internal/domain"
)

func makeDocument(docID, name string) domain.Document {
	now := time.Now().UTC()
	return domain.Document{
		ID:        docID,
		Name:      name,
		Status:    domain.DocumentStatusComplete,
		PageCount: 2,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

func getStatusCode(t *testing.T, err error) int {
	t.Helper()
	if err == nil {
		t.Fatal("expected error")
	}
	statusErr, ok := err.(huma.StatusError)
	if !ok {
		t.Fatalf("expected huma.StatusError, got %T", err)
	}
	return statusErr.GetStatus()
}

func TestGetPDFReturnsPDFBytesAndContentType(t *testing.T) {
	storage := fs.New(t.TempDir())
	doc := makeDocument("doc-1", "Report.pdf")
	if err := storage.SaveDocument(context.Background(), doc); err != nil {
		t.Fatalf("SaveDocument failed: %v", err)
	}
	pdfData := []byte("%PDF-1.7 test")
	if err := storage.SavePDF(context.Background(), doc.ID, bytes.NewReader(pdfData)); err != nil {
		t.Fatalf("SavePDF failed: %v", err)
	}

	handler := NewDocumentHandler(storage, nil, nil)
	resp, err := handler.GetPDF(context.Background(), &GetDocumentPDFInput{
		DocumentID: doc.ID,
	})
	if err != nil {
		t.Fatalf("GetPDF returned error: %v", err)
	}
	if resp.ContentType != "application/pdf" {
		t.Fatalf("content type = %q, want application/pdf", resp.ContentType)
	}
	if !bytes.Equal(resp.Body, pdfData) {
		t.Fatalf("pdf bytes mismatch")
	}
}

func TestGetPDFReturnsNotFoundWhenMissing(t *testing.T) {
	handler := NewDocumentHandler(fs.New(t.TempDir()), nil, nil)
	_, err := handler.GetPDF(context.Background(), &GetDocumentPDFInput{
		DocumentID: "missing",
	})

	if status := getStatusCode(t, err); status != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", status, http.StatusNotFound)
	}
}

func TestGetTreeReturnsOneIndexedPages(t *testing.T) {
	storage := fs.New(t.TempDir())
	doc := makeDocument("doc-1", "Report.pdf")
	if err := storage.SaveDocument(context.Background(), doc); err != nil {
		t.Fatalf("SaveDocument failed: %v", err)
	}
	if err := storage.SaveTree(context.Background(), domain.TreeIndex{
		DocumentID: doc.ID,
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
					EndPage:   3,
					Summary:   "child summary",
				},
			},
		},
	}); err != nil {
		t.Fatalf("SaveTree failed: %v", err)
	}

	handler := NewDocumentHandler(storage, nil, nil)
	resp, err := handler.GetTree(context.Background(), &GetDocumentTreeInput{
		DocumentID: doc.ID,
	})
	if err != nil {
		t.Fatalf("GetTree returned error: %v", err)
	}
	if resp.Body.Root.StartPage != 1 || resp.Body.Root.EndPage != 6 {
		t.Fatalf("root page range = %d-%d, want 1-6", resp.Body.Root.StartPage, resp.Body.Root.EndPage)
	}
	if len(resp.Body.Root.Children) != 1 {
		t.Fatalf("len(children) = %d, want 1", len(resp.Body.Root.Children))
	}
	if resp.Body.Root.Children[0].StartPage != 3 || resp.Body.Root.Children[0].EndPage != 4 {
		t.Fatalf(
			"child page range = %d-%d, want 3-4",
			resp.Body.Root.Children[0].StartPage,
			resp.Body.Root.Children[0].EndPage,
		)
	}
}

func TestGetTreeReturnsNotFoundWhenMissing(t *testing.T) {
	handler := NewDocumentHandler(fs.New(t.TempDir()), nil, nil)
	_, err := handler.GetTree(context.Background(), &GetDocumentTreeInput{
		DocumentID: "missing",
	})

	if status := getStatusCode(t, err); status != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", status, http.StatusNotFound)
	}
}
