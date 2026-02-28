package domain

import "time"

type DocumentStatus string

const (
	DocumentStatusPending    DocumentStatus = "pending"
	DocumentStatusProcessing DocumentStatus = "processing"
	DocumentStatusComplete   DocumentStatus = "complete"
	DocumentStatusFailed     DocumentStatus = "failed"
)

type Document struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Status      DocumentStatus `json:"status"`
	PageCount   int            `json:"page_count"`
	Description string         `json:"description,omitempty"`
	Error       string         `json:"error,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

type Page struct {
	Index    int    `json:"index"`
	Markdown string `json:"markdown"`
}
