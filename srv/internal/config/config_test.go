package config

import (
	"reflect"
	"strings"
	"testing"
)

func TestLoadCORSDefaults(t *testing.T) {
	t.Setenv("MISTRAL_API_KEY", "test-key")
	t.Setenv("CORS_ALLOWED_ORIGINS", "")
	t.Setenv("CORS_ALLOWED_METHODS", "")
	t.Setenv("CORS_ALLOWED_HEADERS", "")
	t.Setenv("CORS_EXPOSED_HEADERS", "")
	t.Setenv("CORS_ALLOW_CREDENTIALS", "")
	t.Setenv("CORS_MAX_AGE", "")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if len(cfg.CORSAllowedOrigins) != 0 {
		t.Fatalf("CORSAllowedOrigins = %v, want empty", cfg.CORSAllowedOrigins)
	}

	wantMethods := []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	if !reflect.DeepEqual(cfg.CORSAllowedMethods, wantMethods) {
		t.Fatalf("CORSAllowedMethods = %v, want %v", cfg.CORSAllowedMethods, wantMethods)
	}

	wantHeaders := []string{"Accept", "Authorization", "Content-Type"}
	if !reflect.DeepEqual(cfg.CORSAllowedHeaders, wantHeaders) {
		t.Fatalf("CORSAllowedHeaders = %v, want %v", cfg.CORSAllowedHeaders, wantHeaders)
	}

	wantExposed := []string{"Link"}
	if !reflect.DeepEqual(cfg.CORSExposedHeaders, wantExposed) {
		t.Fatalf("CORSExposedHeaders = %v, want %v", cfg.CORSExposedHeaders, wantExposed)
	}

	if cfg.CORSAllowCredentials {
		t.Fatal("CORSAllowCredentials = true, want false")
	}
	if cfg.CORSMaxAge != 300 {
		t.Fatalf("CORSMaxAge = %d, want 300", cfg.CORSMaxAge)
	}
}

func TestLoadCORSConfigured(t *testing.T) {
	t.Setenv("MISTRAL_API_KEY", "test-key")
	t.Setenv("CORS_ALLOWED_ORIGINS", "https://app.example, http://localhost:3000 ,")
	t.Setenv("CORS_ALLOWED_METHODS", "GET, OPTIONS")
	t.Setenv("CORS_ALLOWED_HEADERS", "Accept, Content-Type")
	t.Setenv("CORS_EXPOSED_HEADERS", "Link, X-Request-ID")
	t.Setenv("CORS_ALLOW_CREDENTIALS", "true")
	t.Setenv("CORS_MAX_AGE", "600")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	wantOrigins := []string{"https://app.example", "http://localhost:3000"}
	if !reflect.DeepEqual(cfg.CORSAllowedOrigins, wantOrigins) {
		t.Fatalf("CORSAllowedOrigins = %v, want %v", cfg.CORSAllowedOrigins, wantOrigins)
	}

	wantMethods := []string{"GET", "OPTIONS"}
	if !reflect.DeepEqual(cfg.CORSAllowedMethods, wantMethods) {
		t.Fatalf("CORSAllowedMethods = %v, want %v", cfg.CORSAllowedMethods, wantMethods)
	}

	wantHeaders := []string{"Accept", "Content-Type"}
	if !reflect.DeepEqual(cfg.CORSAllowedHeaders, wantHeaders) {
		t.Fatalf("CORSAllowedHeaders = %v, want %v", cfg.CORSAllowedHeaders, wantHeaders)
	}

	wantExposed := []string{"Link", "X-Request-ID"}
	if !reflect.DeepEqual(cfg.CORSExposedHeaders, wantExposed) {
		t.Fatalf("CORSExposedHeaders = %v, want %v", cfg.CORSExposedHeaders, wantExposed)
	}

	if !cfg.CORSAllowCredentials {
		t.Fatal("CORSAllowCredentials = false, want true")
	}
	if cfg.CORSMaxAge != 600 {
		t.Fatalf("CORSMaxAge = %d, want 600", cfg.CORSMaxAge)
	}
}

func TestLoadRejectsCredentialsWithWildcardOrigin(t *testing.T) {
	t.Setenv("MISTRAL_API_KEY", "test-key")
	t.Setenv("CORS_ALLOWED_ORIGINS", "*")
	t.Setenv("CORS_ALLOW_CREDENTIALS", "true")

	_, err := Load()
	if err == nil {
		t.Fatal("Load() error = nil, want error")
	}
	if !strings.Contains(err.Error(), "CORS_ALLOW_CREDENTIALS") {
		t.Fatalf("Load() error = %q, want CORS validation error", err.Error())
	}
}

func TestLoadRejectsInvalidIntegerEnv(t *testing.T) {
	t.Setenv("MISTRAL_API_KEY", "test-key")
	t.Setenv("WORKER_COUNT", "invalid")

	_, err := Load()
	if err == nil {
		t.Fatal("Load() error = nil, want invalid integer error")
	}
	if !strings.Contains(err.Error(), "WORKER_COUNT") {
		t.Fatalf("Load() error = %q, want WORKER_COUNT parse error", err.Error())
	}
}

func TestLoadRejectsInvalidBooleanEnv(t *testing.T) {
	t.Setenv("MISTRAL_API_KEY", "test-key")
	t.Setenv("CORS_ALLOW_CREDENTIALS", "not-a-bool")

	_, err := Load()
	if err == nil {
		t.Fatal("Load() error = nil, want invalid boolean error")
	}
	if !strings.Contains(err.Error(), "CORS_ALLOW_CREDENTIALS") {
		t.Fatalf("Load() error = %q, want CORS_ALLOW_CREDENTIALS parse error", err.Error())
	}
}

func TestLoadRejectsInvalidWorkerCountRange(t *testing.T) {
	t.Setenv("MISTRAL_API_KEY", "test-key")
	t.Setenv("WORKER_COUNT", "0")

	_, err := Load()
	if err == nil {
		t.Fatal("Load() error = nil, want range validation error")
	}
	if !strings.Contains(err.Error(), "WORKER_COUNT") {
		t.Fatalf("Load() error = %q, want WORKER_COUNT range error", err.Error())
	}
}
