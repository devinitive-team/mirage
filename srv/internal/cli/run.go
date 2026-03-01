package cli

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/devinitive-team/mirage/internal/adapter/fs"
	"github.com/devinitive-team/mirage/internal/adapter/mistral"
	"github.com/devinitive-team/mirage/internal/api"
	"github.com/devinitive-team/mirage/internal/config"
	"github.com/devinitive-team/mirage/internal/service"
	"github.com/devinitive-team/mirage/internal/worker"
	"github.com/urfave/cli/v3"
)

func runCmd() *cli.Command {
	return &cli.Command{
		Name:  "run",
		Usage: "Start the HTTP server",
		Action: func(ctx context.Context, _ *cli.Command) error {
			return runServer(ctx)
		},
	}
}

func runServer(ctx context.Context) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	runtime := buildRuntime(cfg)

	serverCtx, stop := signal.NotifyContext(ctx, syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	serveErr := make(chan error, 1)
	go func() {
		slog.Info("starting server", "addr", cfg.ListenAddr)
		err := runtime.server.ListenAndServe()
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			serveErr <- fmt.Errorf("server: %w", err)
			return
		}
		serveErr <- nil
	}()

	select {
	case err := <-serveErr:
		runtime.pool.Shutdown()
		return err
	case <-serverCtx.Done():
		slog.Info("shutting down")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		if err := runtime.server.Shutdown(shutdownCtx); err != nil && !errors.Is(err, http.ErrServerClosed) {
			_ = runtime.server.Close()
			runtime.pool.Shutdown()
			return fmt.Errorf("shutdown server: %w", err)
		}

		if err := <-serveErr; err != nil {
			runtime.pool.Shutdown()
			return err
		}

		runtime.pool.Shutdown()
		return nil
	}
}

type appRuntime struct {
	server *http.Server
	pool   *worker.Pool
}

func buildRuntime(cfg config.Config) appRuntime {
	storage := fs.New(cfg.DataDir)

	client := mistral.NewClient(cfg.MistralAPIKey, cfg.MistralBaseURL)
	ocr := mistral.NewOCR(client, cfg.MistralOCRModel)
	llm := mistral.NewLLM(client, cfg.MistralLLMModel)

	indexer := service.NewIndexer(llm, storage, cfg.MaxPagesPerNode, cfg.MaxTokensPerNode)
	ingest := service.NewIngest(storage, ocr, indexer)
	retrieval := service.NewRetrieval(llm, storage, cfg.MaxRetrievalIterations)

	pool := worker.New(cfg.WorkerCount)

	a := api.New(storage, ingest, retrieval, pool, api.CORSConfig{
		AllowedOrigins:   cfg.CORSAllowedOrigins,
		AllowedMethods:   cfg.CORSAllowedMethods,
		AllowedHeaders:   cfg.CORSAllowedHeaders,
		ExposedHeaders:   cfg.CORSExposedHeaders,
		AllowCredentials: cfg.CORSAllowCredentials,
		MaxAge:           cfg.CORSMaxAge,
	}, cfg.HistoryMaxEntries)

	srv := &http.Server{
		Addr:    cfg.ListenAddr,
		Handler: a.Handler(),
	}
	return appRuntime{
		server: srv,
		pool:   pool,
	}
}
