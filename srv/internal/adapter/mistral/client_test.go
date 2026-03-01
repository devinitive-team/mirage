package mistral

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/devinitive-team/mirage/internal/port"
)

func newTestClient(t *testing.T, handler http.HandlerFunc) *Client {
	t.Helper()
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)

	client := NewClient("test-key", server.URL)
	client.httpClient = server.Client()
	return client
}

func TestLLMCompleteReturnsErrorOnNon200(t *testing.T) {
	client := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/chat/completions" {
			t.Fatalf("path = %q, want /v1/chat/completions", r.URL.Path)
		}
		w.WriteHeader(http.StatusBadGateway)
		_, _ = io.WriteString(w, "upstream down")
	})
	llm := NewLLM(client, "model")

	_, err := llm.Complete(context.Background(), []port.ChatMessage{{Role: "user", Content: "hi"}})
	if err == nil {
		t.Fatal("Complete error = nil, want non-200 error")
	}
	if !strings.Contains(err.Error(), "chat request returned 502") {
		t.Fatalf("error = %q, want status message", err.Error())
	}
}

func TestLLMCompleteReturnsDecodeErrorOnMalformedJSON(t *testing.T) {
	client := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"choices":`)
	})
	llm := NewLLM(client, "model")

	_, err := llm.Complete(context.Background(), []port.ChatMessage{{Role: "user", Content: "hi"}})
	if err == nil {
		t.Fatal("Complete error = nil, want decode error")
	}
	if !strings.Contains(err.Error(), "decode chat request response") {
		t.Fatalf("error = %q, want decode message", err.Error())
	}
}

func TestOCRExtractPagesReturnsDecodeErrorOnMalformedJSON(t *testing.T) {
	client := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/ocr" {
			t.Fatalf("path = %q, want /v1/ocr", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"pages":`)
	})
	ocr := NewOCR(client, "ocr-model")

	_, err := ocr.ExtractPages(context.Background(), "doc.pdf", strings.NewReader("%PDF-1.7"))
	if err == nil {
		t.Fatal("ExtractPages error = nil, want decode error")
	}
	if !strings.Contains(err.Error(), "decode ocr request response") {
		t.Fatalf("error = %q, want decode message", err.Error())
	}
}
