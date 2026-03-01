package service

import (
	"context"
	"fmt"
	"io"
	"log/slog"

	"github.com/devinitive-team/mirage/internal/domain"
	"github.com/devinitive-team/mirage/internal/port"
)

type Ingest struct {
	storage ingestStore
	ocr     port.OCRProvider
	tree    treeBuilder
}

type ingestStore interface {
	GetDocument(ctx context.Context, id string) (domain.Document, error)
	SaveDocument(ctx context.Context, doc domain.Document) error
	OpenPDF(ctx context.Context, docID string) (io.ReadCloser, error)
	SavePages(ctx context.Context, docID string, pages []domain.Page) error
}

type treeBuilder interface {
	Build(ctx context.Context, docID string, pages []domain.Page) (domain.TreeIndex, error)
}

func NewIngest(storage ingestStore, ocr port.OCRProvider, tree treeBuilder) *Ingest {
	return &Ingest{
		storage: storage,
		ocr:     ocr,
		tree:    tree,
	}
}

func (s *Ingest) Process(ctx context.Context, docID string) error {
	doc, err := s.storage.GetDocument(ctx, docID)
	if err != nil {
		return fmt.Errorf("get document %s: %w", docID, err)
	}

	if err := s.updateStatus(ctx, &doc, domain.DocumentStatusProcessing, ""); err != nil {
		return err
	}

	pdf, err := s.storage.OpenPDF(ctx, docID)
	if err != nil {
		return s.failAndWrap(ctx, &doc, "open pdf", err)
	}
	defer pdf.Close()

	pages, err := s.ocr.ExtractPages(ctx, doc.Name, pdf)
	if err != nil {
		return s.failAndWrap(ctx, &doc, "extract pages", err)
	}

	if err := s.storage.SavePages(ctx, docID, pages); err != nil {
		return s.failAndWrap(ctx, &doc, "save pages", err)
	}

	doc.PageCount = len(pages)
	tree, err := s.tree.Build(ctx, docID, pages)
	if err != nil {
		return s.failAndWrap(ctx, &doc, "build tree", err)
	}

	doc.Description = tree.Root.Summary
	if err := s.updateStatus(ctx, &doc, domain.DocumentStatusComplete, ""); err != nil {
		return err
	}

	slog.Info("document processed", "doc_id", docID, "pages", doc.PageCount)
	return nil
}

func (s *Ingest) updateStatus(ctx context.Context, doc *domain.Document, status domain.DocumentStatus, errMsg string) error {
	doc.Status = status
	doc.Error = errMsg
	if err := s.storage.SaveDocument(ctx, *doc); err != nil {
		return fmt.Errorf("save document %s with status %s: %w", doc.ID, status, err)
	}
	return nil
}

func (s *Ingest) failDocument(ctx context.Context, doc *domain.Document, cause error) {
	if err := s.updateStatus(ctx, doc, domain.DocumentStatusFailed, cause.Error()); err != nil {
		slog.Error("failed to mark document as failed", "doc_id", doc.ID, "error", err)
	}
}

func (s *Ingest) failAndWrap(ctx context.Context, doc *domain.Document, op string, cause error) error {
	s.failDocument(ctx, doc, cause)
	return fmt.Errorf("%s %s: %w", op, doc.ID, cause)
}
