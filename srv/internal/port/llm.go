package port

import "context"

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type LLMProvider interface {
	Complete(ctx context.Context, messages []ChatMessage) (string, error)
	CompleteJSON(ctx context.Context, messages []ChatMessage, jsonSchema string) (string, error)
}
