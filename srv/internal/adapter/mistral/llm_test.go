package mistral

import "testing"

func TestParseJSONSchemaParsesValidSchema(t *testing.T) {
	schema, err := parseJSONSchema(`{
		"type": "object",
		"properties": {
			"answer": { "type": "string" }
		},
		"required": ["answer"]
	}`)
	if err != nil {
		t.Fatalf("parseJSONSchema returned error: %v", err)
	}
	if schema["type"] != "object" {
		t.Fatalf("schema type = %v, want object", schema["type"])
	}
}

func TestParseJSONSchemaRejectsEmptySchema(t *testing.T) {
	if _, err := parseJSONSchema(""); err == nil {
		t.Fatalf("expected error for empty schema")
	}
}

func TestParseJSONSchemaRejectsInvalidJSON(t *testing.T) {
	if _, err := parseJSONSchema(`{"type": "object"`); err == nil {
		t.Fatalf("expected parse error for invalid json")
	}
}
