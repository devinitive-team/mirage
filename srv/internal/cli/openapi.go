package cli

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"

	"github.com/devinitive-team/mirage/internal/api"
	"github.com/urfave/cli/v3"
)

func openAPICmd() *cli.Command {
	return &cli.Command{
		Name:  "openapi",
		Usage: "Print the OpenAPI spec to stdout",
		Action: func(_ context.Context, _ *cli.Command) error {
			return runOpenAPI(os.Stdout)
		},
	}
}

func runOpenAPI(w io.Writer) error {
	a := api.NewSchema()

	spec := a.OpenAPI()

	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	if err := enc.Encode(spec); err != nil {
		return fmt.Errorf("encode openapi: %w", err)
	}
	return nil
}
