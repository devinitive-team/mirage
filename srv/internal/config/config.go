package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	ListenAddr             string
	MistralAPIKey          string
	MistralBaseURL         string
	MistralLLMModel        string
	MistralOCRModel        string
	DataDir                string
	WorkerCount            int
	MaxPagesPerNode        int
	MaxTokensPerNode       int
	MaxRetrievalIterations int
	CORSAllowedOrigins     []string
	CORSAllowedMethods     []string
	CORSAllowedHeaders     []string
	CORSExposedHeaders     []string
	CORSAllowCredentials   bool
	CORSMaxAge             int
}

func Load() (Config, error) {
	c := Config{
		ListenAddr:             envOr("LISTEN_ADDR", ":2137"),
		MistralAPIKey:          os.Getenv("MISTRAL_API_KEY"),
		MistralBaseURL:         envOr("MISTRAL_BASE_URL", "https://api.mistral.ai"),
		MistralLLMModel:        envOr("MISTRAL_LLM_MODEL", "mistral-large-latest"),
		MistralOCRModel:        envOr("MISTRAL_OCR_MODEL", "mistral-ocr-latest"),
		DataDir:                envOr("DATA_DIR", "./data"),
		WorkerCount:            envInt("WORKER_COUNT", 2),
		MaxPagesPerNode:        envInt("MAX_PAGES_PER_NODE", 10),
		MaxTokensPerNode:       envInt("MAX_TOKENS_PER_NODE", 20000),
		MaxRetrievalIterations: envInt("MAX_RETRIEVAL_ITERATIONS", 5),
		CORSAllowedOrigins:     envCSV("CORS_ALLOWED_ORIGINS", nil),
		CORSAllowedMethods: envCSV("CORS_ALLOWED_METHODS", []string{
			"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS",
		}),
		CORSAllowedHeaders:   envCSV("CORS_ALLOWED_HEADERS", []string{"Accept", "Authorization", "Content-Type"}),
		CORSExposedHeaders:   envCSV("CORS_EXPOSED_HEADERS", []string{"Link"}),
		CORSAllowCredentials: envBool("CORS_ALLOW_CREDENTIALS", false),
		CORSMaxAge:           envInt("CORS_MAX_AGE", 300),
	}

	if c.MistralAPIKey == "" {
		return c, fmt.Errorf("MISTRAL_API_KEY is required")
	}
	if c.CORSAllowCredentials && contains(c.CORSAllowedOrigins, "*") {
		return c, fmt.Errorf("CORS_ALLOW_CREDENTIALS cannot be true when CORS_ALLOWED_ORIGINS contains *")
	}

	return c, nil
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func envBool(key string, fallback bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}
	return b
}

func envCSV(key string, fallback []string) []string {
	v := os.Getenv(key)
	if v == "" {
		return append([]string(nil), fallback...)
	}
	return splitCSV(v)
}

func splitCSV(v string) []string {
	parts := strings.Split(v, ",")
	values := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		values = append(values, part)
	}
	return values
}

func contains(values []string, needle string) bool {
	for _, v := range values {
		if v == needle {
			return true
		}
	}
	return false
}
