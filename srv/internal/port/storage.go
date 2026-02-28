package port

import (
	"context"
	"io"

	"github.com/devinitive-team/mirage/internal/domain"
)

type Storage interface {
	SaveDocument(ctx context.Context, doc domain.Document) error
	GetDocument(ctx context.Context, id string) (domain.Document, error)
	ListDocuments(ctx context.Context, limit, offset int) ([]domain.Document, int, error)
	DeleteDocument(ctx context.Context, id string) error

	SavePDF(ctx context.Context, docID string, r io.Reader) error
	OpenPDF(ctx context.Context, docID string) (io.ReadCloser, error)

	SavePages(ctx context.Context, docID string, pages []domain.Page) error
	GetPages(ctx context.Context, docID string) ([]domain.Page, error)
	GetPageRange(ctx context.Context, docID string, start, end int) ([]domain.Page, error)

	SaveTree(ctx context.Context, tree domain.TreeIndex) error
	GetTree(ctx context.Context, docID string) (domain.TreeIndex, error)
}
