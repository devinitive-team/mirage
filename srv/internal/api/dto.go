package api

import (
	"time"

	"github.com/devinitive-team/mirage/internal/domain"
)

type UploadDocumentInput struct {
	ContentType string `header:"Content-Type" required:"true"`
	RawBody     []byte `contentType:"multipart/form-data" required:"true"`
}

type DocumentOutput struct {
	Body DocumentBody
}

type DocumentBody struct {
	ID          string                `json:"id"`
	Name        string                `json:"name"`
	Status      domain.DocumentStatus `json:"status"`
	PageCount   int                   `json:"page_count"`
	Description string                `json:"description,omitempty"`
	Error       string                `json:"error,omitempty"`
	CreatedAt   time.Time             `json:"created_at"`
	UpdatedAt   time.Time             `json:"updated_at"`
}

type ListDocumentsInput struct {
	Limit  int `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset int `query:"offset" default:"0" minimum:"0"`
}

type ListDocumentsOutput struct {
	Body []DocumentBody
}

type GetDocumentInput struct {
	DocumentID string `path:"document-id"`
}

type DeleteDocumentInput struct {
	DocumentID string `path:"document-id"`
}

type QueryInput struct {
	Body QueryBody
}

type QueryBody struct {
	Question    string   `json:"question" required:"true" minLength:"1"`
	DocumentIDs []string `json:"document_ids" required:"true" minItems:"1"`
}

type QueryOutput struct {
	Body domain.QueryResult
}

func documentToBody(doc domain.Document) DocumentBody {
	return DocumentBody{
		ID:          doc.ID,
		Name:        doc.Name,
		Status:      doc.Status,
		PageCount:   doc.PageCount,
		Description: doc.Description,
		Error:       doc.Error,
		CreatedAt:   doc.CreatedAt,
		UpdatedAt:   doc.UpdatedAt,
	}
}
