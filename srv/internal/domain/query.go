package domain

import "time"

type HistoryEntry struct {
	ID       string     `json:"id"`
	Question string     `json:"question"`
	Answer   string     `json:"answer"`
	AskedAt  time.Time  `json:"asked_at"`
	Evidence []Evidence `json:"evidence"`
}

type Query struct {
	Question    string   `json:"question"`
	DocumentIDs []string `json:"document_ids"`
}

type Evidence struct {
	DocumentID   string `json:"document_id"`
	DocumentName string `json:"document_name"`
	NodeID       string `json:"node_id"`
	NodeTitle    string `json:"node_title"`
	PageStart    int    `json:"page_start"`
	PageEnd      int    `json:"page_end"`
}

type QueryResult struct {
	Answer   string     `json:"answer"`
	Evidence []Evidence `json:"evidence"`
}

type ReasoningStep struct {
	Action     string   `json:"action"`
	NodeIDs    []string `json:"node_ids"`
	Reasoning  string   `json:"reasoning"`
	Sufficient bool     `json:"sufficient"`
}
