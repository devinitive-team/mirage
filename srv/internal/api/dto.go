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
	Page     int `query:"page" default:"1" minimum:"1"`
	PageSize int `query:"page_size" default:"20" minimum:"1" maximum:"100"`
}

type ListDocumentsOutput struct {
	Body ListDocumentsBody
}

type ListDocumentsBody struct {
	Items    []DocumentBody `json:"items"`
	Total    int            `json:"total"`
	Page     int            `json:"page"`
	PageSize int            `json:"page_size"`
	Pages    int            `json:"pages"`
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

type HistoryEntryBody struct {
	ID       string         `json:"id"`
	Question string         `json:"question"`
	Answer   string         `json:"answer"`
	AskedAt  string         `json:"asked_at"`
	Evidence []EvidenceBody `json:"evidence"`
}

type ListHistoryOutput struct {
	Body ListHistoryBody
}

type ListHistoryBody struct {
	Items []HistoryEntryBody `json:"items"`
}

func historyEntryToBody(entry domain.HistoryEntry) HistoryEntryBody {
	evidence := make([]EvidenceBody, 0, len(entry.Evidence))
	for _, item := range entry.Evidence {
		evidence = append(evidence, EvidenceBody{
			DocumentID:   item.DocumentID,
			DocumentName: item.DocumentName,
			NodeID:       item.NodeID,
			NodeTitle:    item.NodeTitle,
			PageStart:    item.PageStart + 1,
			PageEnd:      item.PageEnd + 1,
		})
	}

	return HistoryEntryBody{
		ID:       entry.ID,
		Question: entry.Question,
		Answer:   entry.Answer,
		AskedAt:  entry.AskedAt.Format(time.RFC3339),
		Evidence: evidence,
	}
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
