package api

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
	"github.com/go-chi/chi/v5"

	"github.com/devinitive-team/mirage/internal/port"
	"github.com/devinitive-team/mirage/internal/service"
	"github.com/devinitive-team/mirage/internal/worker"
)

type contextKey string

const contentTypeKey contextKey = "content-type"

func NewRouter(storage port.Storage, ingest *service.Ingest, retrieval *service.Retrieval, pool *worker.Pool) http.Handler {
	r := chi.NewMux()

	r.Use(Recovery)
	r.Use(RequestID)
	r.Use(Logging)
	r.Use(captureContentType)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	api := humachi.New(r, huma.DefaultConfig("Mirage", "1.0.0"))

	docs := NewDocumentHandler(storage, ingest, pool)
	docs.RegisterRoutes(api)

	query := NewQueryHandler(retrieval)
	query.RegisterRoutes(api)

	return r
}

func captureContentType(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := context.WithValue(r.Context(), contentTypeKey, r.Header.Get("Content-Type"))
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
