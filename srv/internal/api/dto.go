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

type GetDocumentPDFInput struct {
	DocumentID string `path:"document-id"`
}

type GetDocumentPDFOutput struct {
	ContentType string `header:"Content-Type"`
	Body        []byte
}

type GetDocumentTreeInput struct {
	DocumentID string `path:"document-id"`
}

type GetDocumentTreeOutput struct {
	Body TreeBody
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
	Body QueryResultBody
}

type QueryResultBody struct {
	Answer   string         `json:"answer"`
	Evidence []EvidenceBody `json:"evidence"`
}

type EvidenceBody struct {
	DocumentID   string `json:"document_id"`
	DocumentName string `json:"document_name"`
	NodeID       string `json:"node_id"`
	NodeTitle    string `json:"node_title"`
	PageStart    int    `json:"page_start"`
	PageEnd      int    `json:"page_end"`
	Snippet      string `json:"snippet"`
}

type TreeBody struct {
	DocumentID string       `json:"document_id"`
	Root       TreeNodeBody `json:"root"`
}

type TreeNodeBody struct {
	NodeID    string         `json:"node_id"`
	Title     string         `json:"title"`
	StartPage int            `json:"start_page"`
	EndPage   int            `json:"end_page"`
	Summary   string         `json:"summary"`
	Children  []TreeNodeBody `json:"children"`
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

func queryResultToBody(result domain.QueryResult) QueryResultBody {
	evidence := make([]EvidenceBody, 0, len(result.Evidence))
	for _, item := range result.Evidence {
		evidence = append(evidence, EvidenceBody{
			DocumentID:   item.DocumentID,
			DocumentName: item.DocumentName,
			NodeID:       item.NodeID,
			NodeTitle:    item.NodeTitle,
			PageStart:    item.PageStart + 1,
			PageEnd:      item.PageEnd + 1,
			Snippet:      item.Snippet,
		})
	}

	return QueryResultBody{
		Answer:   result.Answer,
		Evidence: evidence,
	}
}

func treeToBody(tree domain.TreeIndex) TreeBody {
	return TreeBody{
		DocumentID: tree.DocumentID,
		Root:       treeNodeToBody(tree.Root),
	}
}

func treeNodeToBody(node domain.TreeNode) TreeNodeBody {
	children := make([]TreeNodeBody, 0, len(node.Children))
	for _, child := range node.Children {
		children = append(children, treeNodeToBody(child))
	}

	return TreeNodeBody{
		NodeID:    node.NodeID,
		Title:     node.Title,
		StartPage: node.StartPage + 1,
		EndPage:   node.EndPage + 1,
		Summary:   node.Summary,
		Children:  children,
	}
}
