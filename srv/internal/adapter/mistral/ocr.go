package mistral

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/devinitive-team/mirage/internal/domain"
)

type OCR struct {
	client *Client
	model  string
}

func NewOCR(client *Client, model string) *OCR {
	return &OCR{client: client, model: model}
}

func (o *OCR) ExtractPages(ctx context.Context, fileName string, pdf io.Reader) ([]domain.Page, error) {
	raw, err := io.ReadAll(pdf)
	if err != nil {
		return nil, fmt.Errorf("read pdf: %w", err)
	}

	encoded := base64.StdEncoding.EncodeToString(raw)

	req := ocrRequest{
		Model: o.model,
		Document: ocrDocument{
			Type:        "document_url",
			DocumentURL: "data:application/pdf;base64," + encoded,
		},
	}

	resp, err := o.client.do(ctx, http.MethodPost, "/v1/ocr", req)
	if err != nil {
		return nil, fmt.Errorf("ocr request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("ocr request returned %d: %s", resp.StatusCode, body)
	}

	var ocrResp ocrResponse
	if err := json.NewDecoder(resp.Body).Decode(&ocrResp); err != nil {
		return nil, fmt.Errorf("decode ocr response: %w", err)
	}

	pages := make([]domain.Page, len(ocrResp.Pages))
	for i, p := range ocrResp.Pages {
		pages[i] = domain.Page{
			Index:    p.Index,
			Markdown: p.Markdown,
		}
	}

	return pages, nil
}
