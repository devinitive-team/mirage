package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	ListenAddr             string
	MistralAPIKey          string
	MistralBaseURL         string
	MistralModel           string
	DataDir                string
	WorkerCount            int
	MaxPagesPerNode        int
	MaxTokensPerNode       int
	MaxRetrievalIterations int
}

func Load() (Config, error) {
	c := Config{
		ListenAddr:             envOr("LISTEN_ADDR", ":2137"),
		MistralAPIKey:          os.Getenv("MISTRAL_API_KEY"),
		MistralBaseURL:         envOr("MISTRAL_BASE_URL", "https://api.mistral.ai"),
		MistralModel:           envOr("MISTRAL_MODEL", "mistral-large-latest"),
		DataDir:                envOr("DATA_DIR", "./data"),
		WorkerCount:            envInt("WORKER_COUNT", 2),
		MaxPagesPerNode:        envInt("MAX_PAGES_PER_NODE", 10),
		MaxTokensPerNode:       envInt("MAX_TOKENS_PER_NODE", 20000),
		MaxRetrievalIterations: envInt("MAX_RETRIEVAL_ITERATIONS", 5),
	}

	if c.MistralAPIKey == "" {
		return c, fmt.Errorf("MISTRAL_API_KEY is required")
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
