package main

import (
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/devinitive-team/mirage/internal/adapter/fs"
	"github.com/devinitive-team/mirage/internal/adapter/mistral"
	"github.com/devinitive-team/mirage/internal/api"
	"github.com/devinitive-team/mirage/internal/config"
	"github.com/devinitive-team/mirage/internal/service"
	"github.com/devinitive-team/mirage/internal/worker"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	storage := fs.New(cfg.DataDir)

	client := mistral.NewClient(cfg.MistralAPIKey, cfg.MistralBaseURL)
	ocr := mistral.NewOCR(client, cfg.MistralOCRModel)
	llm := mistral.NewLLM(client, cfg.MistralLLMModel)

	indexer := service.NewIndexer(llm, storage, cfg.MaxPagesPerNode, cfg.MaxTokensPerNode)
	ingest := service.NewIngest(storage, ocr, indexer)
	retrieval := service.NewRetrieval(llm, storage, cfg.MaxRetrievalIterations)

	pool := worker.New(cfg.WorkerCount)

	router := api.NewRouter(storage, ingest, retrieval, pool)

	srv := &http.Server{
		Addr:    cfg.ListenAddr,
		Handler: router,
	}

	go func() {
		sig := make(chan os.Signal, 1)
		signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
		<-sig
		slog.Info("shutting down")
		pool.Shutdown()
		srv.Close()
	}()

	slog.Info("starting server", "addr", cfg.ListenAddr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server: %v", err)
	}
}
