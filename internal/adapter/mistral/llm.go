package mistral

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/devinitive-team/mirage/internal/port"
)

type LLM struct {
	client *Client
	model  string
}

func NewLLM(client *Client, model string) *LLM {
	return &LLM{client: client, model: model}
}

func (l *LLM) Complete(ctx context.Context, messages []port.ChatMessage) (string, error) {
	return l.complete(ctx, messages, nil)
}

func (l *LLM) CompleteJSON(ctx context.Context, messages []port.ChatMessage, schemaHint string) (string, error) {
	messages = injectSchemaHint(messages, schemaHint)
	return l.complete(ctx, messages, &responseFormat{Type: "json_object"})
}

func (l *LLM) complete(ctx context.Context, messages []port.ChatMessage, format *responseFormat) (string, error) {
	msgs := make([]chatMessage, len(messages))
	for i, m := range messages {
		msgs[i] = chatMessage{Role: m.Role, Content: m.Content}
	}

	req := chatRequest{
		Model:          l.model,
		Messages:       msgs,
		ResponseFormat: format,
	}

	resp, err := l.client.do(ctx, http.MethodPost, "/v1/chat/completions", req)
	if err != nil {
		return "", fmt.Errorf("chat request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("chat request returned %d: %s", resp.StatusCode, body)
	}

	var chatResp chatResponse
	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
		return "", fmt.Errorf("decode chat response: %w", err)
	}

	if len(chatResp.Choices) == 0 {
		return "", fmt.Errorf("chat response contained no choices")
	}

	return chatResp.Choices[0].Message.Content, nil
}

func injectSchemaHint(messages []port.ChatMessage, hint string) []port.ChatMessage {
	out := make([]port.ChatMessage, len(messages))
	copy(out, messages)

	for i, m := range out {
		if m.Role == "system" {
			out[i].Content = m.Content + "\n\n" + hint
			return out
		}
	}

	return append([]port.ChatMessage{{Role: "system", Content: hint}}, out...)
}
