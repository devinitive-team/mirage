package mistral

type ocrRequest struct {
	Model    string      `json:"model"`
	Document ocrDocument `json:"document"`
}

type ocrDocument struct {
	Type        string `json:"type"`
	DocumentURL string `json:"document_url"`
}

type ocrResponse struct {
	Pages []ocrPage `json:"pages"`
}

type ocrPage struct {
	Index    int    `json:"index"`
	Markdown string `json:"markdown"`
}

type chatRequest struct {
	Model          string         `json:"model"`
	Messages       []chatMessage  `json:"messages"`
	ResponseFormat *responseFormat `json:"response_format,omitempty"`
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type responseFormat struct {
	Type string `json:"type"`
}

type chatResponse struct {
	Choices []chatChoice `json:"choices"`
}

type chatChoice struct {
	Message chatMessage `json:"message"`
}
