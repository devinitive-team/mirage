package domain

type Query struct {
	Question    string   `json:"question"`
	DocumentIDs []string `json:"document_ids"`
}

type Citation struct {
	DocumentID   string `json:"document_id"`
	DocumentName string `json:"document_name"`
	PageNumber   int    `json:"page_number"`
	NodeID       string `json:"node_id"`
}

type QueryResult struct {
	Answer    string     `json:"answer"`
	Citations []Citation `json:"citations"`
}

type ReasoningStep struct {
	Action     string   `json:"action"`
	NodeIDs    []string `json:"node_ids"`
	Reasoning  string   `json:"reasoning"`
	Sufficient bool     `json:"sufficient"`
}
