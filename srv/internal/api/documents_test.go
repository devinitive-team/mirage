package api

import (
	"bytes"
	"context"
	"errors"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"testing"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/devinitive-team/mirage/internal/adapter/fs"
	"github.com/devinitive-team/mirage/internal/domain"
	"github.com/devinitive-team/mirage/internal/worker"
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

type stubIngest struct{}

func (stubIngest) Process(context.Context, string) error { return nil }

type stubSubmitter struct {
	err  error
	jobs []worker.Job
}

func (s *stubSubmitter) Submit(job worker.Job) error {
	if s.err != nil {
		return s.err
	}
	s.jobs = append(s.jobs, job)
	return nil
}

func buildMultipartBody(t *testing.T, fileName string, content []byte) (string, []byte) {
	t.Helper()

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	var (
		part io.Writer
		err  error
	)
	if fileName == "" {
		part, err = writer.CreatePart(
			textproto.MIMEHeader{
				"Content-Disposition": {"form-data; name=\"file\""},
			},
		)
	} else {
		part, err = writer.CreateFormFile("file", fileName)
	}
	if err != nil {
		t.Fatalf("CreateFormFile failed: %v", err)
	}
	if _, err := part.Write(content); err != nil {
		t.Fatalf("Write multipart content failed: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("Close multipart writer failed: %v", err)
	}
	return writer.FormDataContentType(), body.Bytes()
}

func TestUploadEnqueuesIngestAndPersistsDocument(t *testing.T) {
	storage := fs.New(t.TempDir())
	submitter := &stubSubmitter{}
	handler := NewDocumentHandler(storage, stubIngest{}, submitter)

	contentType, raw := buildMultipartBody(t, "Report.pdf", []byte("%PDF-1.7 test"))
	resp, err := handler.Upload(context.Background(), &UploadDocumentInput{
		ContentType: contentType,
		RawBody:     raw,
	})
	if err != nil {
		t.Fatalf("Upload returned error: %v", err)
	}

	if len(submitter.jobs) != 1 {
		t.Fatalf("submitted jobs = %d, want 1", len(submitter.jobs))
	}
	if submitter.jobs[0].ID != resp.Body.ID {
		t.Fatalf("submitted job id = %q, want %q", submitter.jobs[0].ID, resp.Body.ID)
	}

	stored, err := storage.GetDocument(context.Background(), resp.Body.ID)
	if err != nil {
		t.Fatalf("GetDocument returned error: %v", err)
	}
	if stored.Name != "Report.pdf" {
		t.Fatalf("stored name = %q, want Report.pdf", stored.Name)
	}
	if stored.Status != domain.DocumentStatusPending {
		t.Fatalf("stored status = %q, want %q", stored.Status, domain.DocumentStatusPending)
	}
}

func TestUploadReturnsBadRequestWhenFilenameMissing(t *testing.T) {
	handler := NewDocumentHandler(fs.New(t.TempDir()), stubIngest{}, &stubSubmitter{})

	contentType, raw := buildMultipartBody(t, "", []byte("%PDF-1.7 test"))
	_, err := handler.Upload(context.Background(), &UploadDocumentInput{
		ContentType: contentType,
		RawBody:     raw,
	})
	if status := getStatusCode(t, err); status != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", status, http.StatusBadRequest)
	}
}

func TestUploadReturnsErrorWhenSubmitFails(t *testing.T) {
	handler := NewDocumentHandler(
		fs.New(t.TempDir()),
		stubIngest{},
		&stubSubmitter{err: errors.New("queue closed")},
	)

	contentType, raw := buildMultipartBody(t, "Report.pdf", []byte("%PDF-1.7 test"))
	_, err := handler.Upload(context.Background(), &UploadDocumentInput{
		ContentType: contentType,
		RawBody:     raw,
	})
	if err == nil {
		t.Fatal("Upload error = nil, want enqueue failure")
	}
}

func TestListAppliesPagination(t *testing.T) {
	storage := fs.New(t.TempDir())
	handler := NewDocumentHandler(storage, nil, nil)

	base := time.Now().UTC()
	docs := []domain.Document{
		{
			ID:        "doc-1",
			Name:      "A.pdf",
			Status:    domain.DocumentStatusComplete,
			CreatedAt: base.Add(-3 * time.Hour),
			UpdatedAt: base.Add(-3 * time.Hour),
		},
		{
			ID:        "doc-2",
			Name:      "B.pdf",
			Status:    domain.DocumentStatusComplete,
			CreatedAt: base.Add(-2 * time.Hour),
			UpdatedAt: base.Add(-2 * time.Hour),
		},
		{
			ID:        "doc-3",
			Name:      "C.pdf",
			Status:    domain.DocumentStatusComplete,
			CreatedAt: base.Add(-1 * time.Hour),
			UpdatedAt: base.Add(-1 * time.Hour),
		},
	}
	for _, doc := range docs {
		if err := storage.SaveDocument(context.Background(), doc); err != nil {
			t.Fatalf("SaveDocument(%s) failed: %v", doc.ID, err)
		}
	}

	resp, err := handler.List(context.Background(), &ListDocumentsInput{Page: 2, PageSize: 2})
	if err != nil {
		t.Fatalf("List returned error: %v", err)
	}
	if resp.Body.Total != 3 {
		t.Fatalf("total = %d, want 3", resp.Body.Total)
	}
	if resp.Body.Pages != 2 {
		t.Fatalf("pages = %d, want 2", resp.Body.Pages)
	}
	if len(resp.Body.Items) != 1 {
		t.Fatalf("len(items) = %d, want 1", len(resp.Body.Items))
	}
	if resp.Body.Items[0].ID != "doc-1" {
		t.Fatalf("items[0].id = %q, want doc-1", resp.Body.Items[0].ID)
	}
}

func TestGetReturnsNotFoundWhenMissing(t *testing.T) {
	handler := NewDocumentHandler(fs.New(t.TempDir()), nil, nil)
	_, err := handler.Get(context.Background(), &GetDocumentInput{DocumentID: "missing"})
	if status := getStatusCode(t, err); status != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", status, http.StatusNotFound)
	}
}

func TestDeleteReturnsNotFoundWhenMissing(t *testing.T) {
	handler := NewDocumentHandler(fs.New(t.TempDir()), nil, nil)
	_, err := handler.Delete(context.Background(), &DeleteDocumentInput{DocumentID: "missing"})
	if status := getStatusCode(t, err); status != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", status, http.StatusNotFound)
	}
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
