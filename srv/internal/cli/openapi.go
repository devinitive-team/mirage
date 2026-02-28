package cli

import (
	"encoding/json"
	"log"
	"os"

	"github.com/devinitive-team/mirage/internal/api"
)

func runOpenAPI() {
	a := api.New(nil, nil, nil, nil)

	spec := a.OpenAPI()

	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	if err := enc.Encode(spec); err != nil {
		log.Fatalf("encode openapi: %v", err)
	}
}
