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
	workerCount, err := envInt("WORKER_COUNT", 2)
	if err != nil {
		return Config{}, err
	}
	maxPagesPerNode, err := envInt("MAX_PAGES_PER_NODE", 10)
	if err != nil {
		return Config{}, err
	}
	maxTokensPerNode, err := envInt("MAX_TOKENS_PER_NODE", 20000)
	if err != nil {
		return Config{}, err
	}
	maxRetrievalIterations, err := envInt("MAX_RETRIEVAL_ITERATIONS", 5)
	if err != nil {
		return Config{}, err
	}
	corsAllowCredentials, err := envBool("CORS_ALLOW_CREDENTIALS", false)
	if err != nil {
		return Config{}, err
	}
	corsMaxAge, err := envInt("CORS_MAX_AGE", 300)
	if err != nil {
		return Config{}, err
	}

	c := Config{
		ListenAddr:             envOr("LISTEN_ADDR", ":2137"),
		MistralAPIKey:          os.Getenv("MISTRAL_API_KEY"),
		MistralBaseURL:         envOr("MISTRAL_BASE_URL", "https://api.mistral.ai"),
		MistralLLMModel:        envOr("MISTRAL_LLM_MODEL", "mistral-large-latest"),
		MistralOCRModel:        envOr("MISTRAL_OCR_MODEL", "mistral-ocr-latest"),
		DataDir:                envOr("DATA_DIR", "./data"),
		WorkerCount:            workerCount,
		MaxPagesPerNode:        maxPagesPerNode,
		MaxTokensPerNode:       maxTokensPerNode,
		MaxRetrievalIterations: maxRetrievalIterations,
		CORSAllowedOrigins:     envCSV("CORS_ALLOWED_ORIGINS", nil),
		CORSAllowedMethods: envCSV("CORS_ALLOWED_METHODS", []string{
			"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS",
		}),
		CORSAllowedHeaders:   envCSV("CORS_ALLOWED_HEADERS", []string{"Accept", "Authorization", "Content-Type"}),
		CORSExposedHeaders:   envCSV("CORS_EXPOSED_HEADERS", []string{"Link"}),
		CORSAllowCredentials: corsAllowCredentials,
		CORSMaxAge:           corsMaxAge,
	}

	if c.MistralAPIKey == "" {
		return c, fmt.Errorf("MISTRAL_API_KEY is required")
	}
	if err := c.Validate(); err != nil {
		return c, err
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

func envInt(key string, fallback int) (int, error) {
	v := os.Getenv(key)
	if v == "" {
		return fallback, nil
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return 0, fmt.Errorf("%s must be a valid integer: %w", key, err)
	}
	return n, nil
}

func envBool(key string, fallback bool) (bool, error) {
	v := os.Getenv(key)
	if v == "" {
		return fallback, nil
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return false, fmt.Errorf("%s must be a valid boolean: %w", key, err)
	}
	return b, nil
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

func (c Config) Validate() error {
	if c.WorkerCount < 1 {
		return fmt.Errorf("WORKER_COUNT must be greater than 0")
	}
	if c.MaxPagesPerNode < 1 {
		return fmt.Errorf("MAX_PAGES_PER_NODE must be greater than 0")
	}
	if c.MaxTokensPerNode < 1 {
		return fmt.Errorf("MAX_TOKENS_PER_NODE must be greater than 0")
	}
	if c.MaxRetrievalIterations < 1 {
		return fmt.Errorf("MAX_RETRIEVAL_ITERATIONS must be greater than 0")
	}
	if c.CORSMaxAge < 0 {
		return fmt.Errorf("CORS_MAX_AGE must be greater than or equal to 0")
	}
	return nil
}
