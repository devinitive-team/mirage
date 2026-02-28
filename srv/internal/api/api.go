package api

import (
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"

	"github.com/devinitive-team/mirage/internal/port"
	"github.com/devinitive-team/mirage/internal/service"
	"github.com/devinitive-team/mirage/internal/worker"
)

// API holds the configured router and Huma API instance.
type API struct {
	router  chi.Router
	humaAPI huma.API
}

type CORSConfig struct {
	AllowedOrigins   []string
	AllowedMethods   []string
	AllowedHeaders   []string
	ExposedHeaders   []string
	AllowCredentials bool
	MaxAge           int
}

// New creates a new API with all routes registered. Dependencies may be nil
// when the API is used only for schema introspection (e.g. OpenAPI generation).
func New(storage port.Storage, ingest *service.Ingest, retrieval *service.Retrieval, pool *worker.Pool, corsConfig CORSConfig) *API {
	r := chi.NewMux()

	r.Use(Recovery)
	r.Use(RequestID)
	r.Use(Logging)
	if len(corsConfig.AllowedOrigins) > 0 {
		r.Use(cors.Handler(cors.Options{
			AllowedOrigins:   corsConfig.AllowedOrigins,
			AllowedMethods:   corsConfig.AllowedMethods,
			AllowedHeaders:   corsConfig.AllowedHeaders,
			ExposedHeaders:   corsConfig.ExposedHeaders,
			AllowCredentials: corsConfig.AllowCredentials,
			MaxAge:           corsConfig.MaxAge,
		}))
	}

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	humaAPI := humachi.New(r, huma.DefaultConfig("Mirage", "1.0.0"))

	docs := NewDocumentHandler(storage, ingest, pool)
	docs.RegisterRoutes(humaAPI)

	query := NewQueryHandler(retrieval)
	query.RegisterRoutes(humaAPI)

	return &API{router: r, humaAPI: humaAPI}
}

// Handler returns the http.Handler for use with an HTTP server.
func (a *API) Handler() http.Handler {
	return a.router
}

// OpenAPI returns the generated OpenAPI specification.
func (a *API) OpenAPI() *huma.OpenAPI {
	return a.humaAPI.OpenAPI()
}
