package domain

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
	Snippet      string `json:"snippet"`
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
