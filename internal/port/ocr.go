package port

import (
	"context"
	"io"

	"github.com/devinitive-team/mirage/internal/domain"
)

type OCRProvider interface {
	ExtractPages(ctx context.Context, fileName string, pdf io.Reader) ([]domain.Page, error)
}
