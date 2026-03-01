package cli

import (
	"context"
	"strings"
	"testing"
)

func TestRunServerReturnsConfigError(t *testing.T) {
	t.Setenv("MISTRAL_API_KEY", "")

	err := runServer(context.Background())
	if err == nil {
		t.Fatal("runServer error = nil, want config error")
	}
	if !strings.Contains(err.Error(), "MISTRAL_API_KEY is required") {
		t.Fatalf("runServer error = %q, want missing MISTRAL_API_KEY message", err.Error())
	}
}

func TestRunCmdActionPropagatesError(t *testing.T) {
	t.Setenv("MISTRAL_API_KEY", "")

	cmd := runCmd()
	err := cmd.Action(context.Background(), cmd)
	if err == nil {
		t.Fatal("run command action error = nil, want config error")
	}
}
