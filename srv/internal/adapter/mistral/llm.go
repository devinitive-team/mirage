package mistral

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

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

func (l *LLM) CompleteJSON(ctx context.Context, messages []port.ChatMessage, schemaJSON string) (string, error) {
	schemaDefinition, err := parseJSONSchema(schemaJSON)
	if err != nil {
		return "", fmt.Errorf("parse json schema: %w", err)
	}

	return l.complete(ctx, messages, &responseFormat{
		Type: "json_schema",
		JSONSchema: &jsonSchema{
			Name:   "response",
			Schema: schemaDefinition,
			Strict: true,
		},
	})
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

func parseJSONSchema(jsonSchema string) (map[string]any, error) {
	raw := strings.TrimSpace(jsonSchema)
	if raw == "" {
		return nil, fmt.Errorf("json schema is required")
	}

	var schema map[string]any
	if err := json.Unmarshal([]byte(raw), &schema); err != nil {
		return nil, err
	}

	return schema, nil
}
