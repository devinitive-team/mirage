package domain

type TreeNode struct {
	NodeID    string     `json:"node_id"`
	Title     string     `json:"title"`
	StartPage int        `json:"start_page"`
	EndPage   int        `json:"end_page"`
	Summary   string     `json:"summary"`
	Children  []TreeNode `json:"children"`
}

type TreeIndex struct {
	DocumentID string   `json:"document_id"`
	Root       TreeNode `json:"root"`
}
