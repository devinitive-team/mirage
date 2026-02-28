package cli

import (
	"context"
	"encoding/json"
	"log"
	"os"

	"github.com/devinitive-team/mirage/internal/api"
	"github.com/urfave/cli/v3"
)

func openAPICmd() *cli.Command {
	return &cli.Command{
		Name:  "openapi",
		Usage: "Print the OpenAPI spec to stdout",
		Action: func(_ context.Context, _ *cli.Command) error {
			runOpenAPI()
			return nil
		},
	}
}

func runOpenAPI() {
	a := api.New(nil, nil, nil, nil)

	spec := a.OpenAPI()

	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	if err := enc.Encode(spec); err != nil {
		log.Fatalf("encode openapi: %v", err)
	}
}
