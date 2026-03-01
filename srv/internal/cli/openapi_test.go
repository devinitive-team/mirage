package cli

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"testing"
)

func TestRunOpenAPIWritesValidJSON(t *testing.T) {
	var out bytes.Buffer

	if err := runOpenAPI(&out); err != nil {
		t.Fatalf("runOpenAPI returned error: %v", err)
	}

	var payload map[string]any
	if err := json.Unmarshal(out.Bytes(), &payload); err != nil {
		t.Fatalf("openapi output is not valid json: %v", err)
	}
	if _, ok := payload["openapi"]; !ok {
		t.Fatalf("openapi output missing top-level 'openapi' field")
	}
}

func TestRunOpenAPIReturnsWriterError(t *testing.T) {
	err := runOpenAPI(errorWriter{})
	if err == nil {
		t.Fatal("runOpenAPI error = nil, want writer error")
	}
	if !errors.Is(err, errWriteFailure) {
		t.Fatalf("runOpenAPI error = %v, want %v", err, errWriteFailure)
	}
}

func TestOpenAPICmdActionReturnsNil(t *testing.T) {
	cmd := openAPICmd()
	if err := cmd.Action(context.Background(), cmd); err != nil {
		t.Fatalf("openapi command action returned error: %v", err)
	}
}

var errWriteFailure = errors.New("write failure")

type errorWriter struct{}

func (errorWriter) Write([]byte) (int, error) {
	return 0, errWriteFailure
}
