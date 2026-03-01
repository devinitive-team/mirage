package service

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/devinitive-team/mirage/internal/port"
)

func completeAndDecodeJSON(
	ctx context.Context,
	llm port.LLMProvider,
	messages []port.ChatMessage,
	schema string,
	out any,
) error {
	raw, err := llm.CompleteJSON(ctx, messages, schema)
	if err != nil {
		return fmt.Errorf("llm complete json: %w", err)
	}
	if err := json.Unmarshal([]byte(raw), out); err != nil {
		return fmt.Errorf("unmarshal llm json: %w", err)
	}
	return nil
}
