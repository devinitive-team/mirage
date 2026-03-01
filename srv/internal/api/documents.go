package api

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/oklog/ulid/v2"

	"github.com/devinitive-team/mirage/internal/domain"
	"github.com/devinitive-team/mirage/internal/port"
	"github.com/devinitive-team/mirage/internal/worker"
)

type documentIngestor interface {
	Process(ctx context.Context, docID string) error
}

type jobSubmitter interface {
	Submit(job worker.Job) error
}

type DocumentHandler struct {
	storage port.Storage
	ingest  documentIngestor
	pool    jobSubmitter
}

const pdfMediaType = "application/pdf"

func NewDocumentHandler(storage port.Storage, ingest documentIngestor, pool jobSubmitter) *DocumentHandler {
	return &DocumentHandler{
		storage: storage,
		ingest:  ingest,
		pool:    pool,
	}
}

func (h *DocumentHandler) RegisterRoutes(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID:   "upload-document",
		Method:        "POST",
		Path:          "/api/v1/documents",
		Summary:       "Upload a PDF document",
		DefaultStatus: 202,
	}, h.Upload)

	huma.Register(api, huma.Operation{
		OperationID: "list-documents",
		Method:      "GET",
		Path:        "/api/v1/documents",
		Summary:     "List documents",
	}, h.List)

	huma.Register(api, huma.Operation{
		OperationID: "get-document",
		Method:      "GET",
		Path:        "/api/v1/documents/{document-id}",
		Summary:     "Get document",
	}, h.Get)

	huma.Register(api, huma.Operation{
		OperationID: "get-document-pdf",
		Method:      "GET",
		Path:        "/api/v1/documents/{document-id}/pdf",
		Summary:     "Get document PDF",
		Responses: map[string]*huma.Response{
			"200": {
				Description: "Document PDF binary",
				Content: map[string]*huma.MediaType{
					pdfMediaType: {},
				},
			},
		},
	}, h.GetPDF)

	huma.Register(api, huma.Operation{
		OperationID: "get-document-tree",
		Method:      "GET",
		Path:        "/api/v1/documents/{document-id}/tree",
		Summary:     "Get document tree",
	}, h.GetTree)

	huma.Register(api, huma.Operation{
		OperationID:   "delete-document",
		Method:        "DELETE",
		Path:          "/api/v1/documents/{document-id}",
		Summary:       "Delete document",
		DefaultStatus: 204,
	}, h.Delete)
}

func (h *DocumentHandler) Upload(ctx context.Context, input *UploadDocumentInput) (*DocumentOutput, error) {
	if h.pool == nil || h.ingest == nil {
		return nil, fmt.Errorf("upload handler is not configured")
	}

	fileName, pdfBytes, err := parseUploadPDF(input)
	if err != nil {
		return nil, err
	}

	doc := newPendingDocument(fileName)

	if err := h.storage.SaveDocument(ctx, doc); err != nil {
		return nil, fmt.Errorf("save document: %w", err)
	}

	if err := h.storage.SavePDF(ctx, doc.ID, bytes.NewReader(pdfBytes)); err != nil {
		return nil, fmt.Errorf("save pdf: %w", err)
	}

	if err := h.enqueueIngestJob(doc.ID); err != nil {
		return nil, fmt.Errorf("enqueue ingest job: %w", err)
	}

	resp := &DocumentOutput{
		Body: documentToBody(doc),
	}
	return resp, nil
}

func (h *DocumentHandler) List(ctx context.Context, input *ListDocumentsInput) (*ListDocumentsOutput, error) {
	offset := (input.Page - 1) * input.PageSize

	docs, total, err := h.storage.ListDocuments(ctx, input.PageSize, offset)
	if err != nil {
		return nil, fmt.Errorf("list documents: %w", err)
	}

	bodies := make([]DocumentBody, len(docs))
	for i, doc := range docs {
		bodies[i] = documentToBody(doc)
	}

	pages := 0
	if total > 0 {
		pages = (total + input.PageSize - 1) / input.PageSize
	}

	return &ListDocumentsOutput{Body: ListDocumentsBody{
		Items:    bodies,
		Total:    total,
		Page:     input.Page,
		PageSize: input.PageSize,
		Pages:    pages,
	}}, nil
}

func (h *DocumentHandler) Get(ctx context.Context, input *GetDocumentInput) (*DocumentOutput, error) {
	doc, err := h.storage.GetDocument(ctx, input.DocumentID)
	if err != nil {
		return nil, documentOpError("get document", err)
	}

	return &DocumentOutput{Body: documentToBody(doc)}, nil
}

func (h *DocumentHandler) GetPDF(ctx context.Context, input *GetDocumentPDFInput) (*GetDocumentPDFOutput, error) {
	pdf, err := h.storage.OpenPDF(ctx, input.DocumentID)
	if err != nil {
		return nil, documentOpError("open pdf", err)
	}
	defer pdf.Close()

	raw, err := io.ReadAll(pdf)
	if err != nil {
		return nil, fmt.Errorf("read pdf: %w", err)
	}

	return &GetDocumentPDFOutput{
		ContentType: pdfMediaType,
		Body:        raw,
	}, nil
}

func (h *DocumentHandler) GetTree(ctx context.Context, input *GetDocumentTreeInput) (*GetDocumentTreeOutput, error) {
	tree, err := h.storage.GetTree(ctx, input.DocumentID)
	if err != nil {
		return nil, documentOpError("get tree", err)
	}

	return &GetDocumentTreeOutput{
		Body: treeToBody(tree),
	}, nil
}

func (h *DocumentHandler) Delete(ctx context.Context, input *DeleteDocumentInput) (*struct{}, error) {
	err := h.storage.DeleteDocument(ctx, input.DocumentID)
	if err != nil {
		return nil, documentOpError("delete document", err)
	}

	return nil, nil
}

func parseUploadPDF(input *UploadDocumentInput) (string, []byte, error) {
	contentType := input.ContentType
	if contentType == "" {
		return "", nil, huma.Error400BadRequest("missing content type")
	}
	_, params, err := mime.ParseMediaType(contentType)
	if err != nil {
		return "", nil, huma.Error400BadRequest("invalid content type", err)
	}

	reader := multipart.NewReader(bytes.NewReader(input.RawBody), params["boundary"])
	part, err := reader.NextPart()
	if err != nil {
		return "", nil, huma.Error400BadRequest("failed to read multipart form", err)
	}
	defer part.Close()

	fileName := part.FileName()
	if fileName == "" {
		return "", nil, huma.Error400BadRequest("file name is required")
	}

	pdfBytes, err := io.ReadAll(part)
	if err != nil {
		return "", nil, huma.Error400BadRequest("failed to read file", err)
	}
	return fileName, pdfBytes, nil
}

func newPendingDocument(fileName string) domain.Document {
	now := time.Now().UTC()
	return domain.Document{
		ID:        ulid.Make().String(),
		Name:      fileName,
		Status:    domain.DocumentStatusPending,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

func (h *DocumentHandler) enqueueIngestJob(docID string) error {
	return h.pool.Submit(worker.Job{
		ID: docID,
		Fn: func(ctx context.Context) error {
			return h.ingest.Process(ctx, docID)
		},
	})
}

func documentOpError(op string, err error) error {
	if errors.Is(err, domain.ErrNotFound) {
		return huma.Error404NotFound("document not found")
	}
	return fmt.Errorf("%s: %w", op, err)
}
