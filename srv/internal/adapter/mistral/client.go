package mistral

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type Client struct {
	httpClient *http.Client
	apiKey     string
	baseURL    string
}

func NewClient(apiKey, baseURL string) *Client {
	return &Client{
		httpClient: &http.Client{},
		apiKey:     apiKey,
		baseURL:    baseURL,
	}
}

func (c *Client) do(ctx context.Context, method, path string, body any) (*http.Response, error) {
	payload, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshal request body: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("execute request: %w", err)
	}

	return resp, nil
}

func (c *Client) doJSON(ctx context.Context, method, path, operation string, request, out any) error {
	resp, err := c.do(ctx, method, path, request)
	if err != nil {
		return fmt.Errorf("%s: %w", operation, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("%s returned %d: %s", operation, resp.StatusCode, body)
	}

	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		return fmt.Errorf("decode %s response: %w", operation, err)
	}

	return nil
}
