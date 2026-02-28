package service

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/devinitive-team/mirage/internal/domain"
	"github.com/devinitive-team/mirage/internal/port"
)

type Ingest struct {
	storage port.Storage
	ocr     port.OCRProvider
	tree    *Indexer
}

func NewIngest(storage port.Storage, ocr port.OCRProvider, tree *Indexer) *Ingest {
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
		s.failDocument(ctx, &doc, err)
		return fmt.Errorf("open pdf %s: %w", docID, err)
	}
	defer pdf.Close()

	pages, err := s.ocr.ExtractPages(ctx, doc.Name, pdf)
	if err != nil {
		s.failDocument(ctx, &doc, err)
		return fmt.Errorf("extract pages %s: %w", docID, err)
	}

	if err := s.storage.SavePages(ctx, docID, pages); err != nil {
		s.failDocument(ctx, &doc, err)
		return fmt.Errorf("save pages %s: %w", docID, err)
	}

	doc.PageCount = len(pages)
	tree, err := s.tree.Build(ctx, docID, pages)
	if err != nil {
		s.failDocument(ctx, &doc, err)
		return fmt.Errorf("build tree %s: %w", docID, err)
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
