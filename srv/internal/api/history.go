package api

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/oklog/ulid/v2"

	"github.com/devinitive-team/mirage/internal/domain"
)

type historyStore interface {
	LoadHistory(ctx context.Context) ([]domain.HistoryEntry, error)
	SaveHistory(ctx context.Context, entries []domain.HistoryEntry) error
	ClearHistory(ctx context.Context) error
}

type HistoryHandler struct {
	store      historyStore
	maxEntries int
}

func NewHistoryHandler(store historyStore, maxEntries int) *HistoryHandler {
	return &HistoryHandler{store: store, maxEntries: maxEntries}
}

func (h *HistoryHandler) RegisterRoutes(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "list-history",
		Method:      "GET",
		Path:        "/api/v1/history",
		Summary:     "List query history",
	}, h.List)

	huma.Register(api, huma.Operation{
		OperationID:   "clear-history",
		Method:        "DELETE",
		Path:          "/api/v1/history",
		Summary:       "Clear query history",
		DefaultStatus: 204,
	}, h.Clear)
}

func (h *HistoryHandler) List(ctx context.Context, _ *struct{}) (*ListHistoryOutput, error) {
	if h.store == nil {
		return &ListHistoryOutput{Body: ListHistoryBody{Items: []HistoryEntryBody{}}}, nil
	}

	entries, err := h.store.LoadHistory(ctx)
	if err != nil {
		return nil, fmt.Errorf("load history: %w", err)
	}

	items := make([]HistoryEntryBody, 0, len(entries))
	for _, entry := range entries {
		items = append(items, historyEntryToBody(entry))
	}

	return &ListHistoryOutput{Body: ListHistoryBody{Items: items}}, nil
}

func (h *HistoryHandler) Clear(ctx context.Context, _ *struct{}) (*struct{}, error) {
	if h.store == nil {
		return nil, nil
	}
	if err := h.store.ClearHistory(ctx); err != nil {
		return nil, fmt.Errorf("clear history: %w", err)
	}
	return nil, nil
}

func (h *HistoryHandler) AddEntry(ctx context.Context, question string, result domain.QueryResult) {
	if h.store == nil {
		return
	}

	entries, err := h.store.LoadHistory(ctx)
	if err != nil {
		slog.Error("load history for add", "error", err)
		return
	}

	entry := domain.HistoryEntry{
		ID:       ulid.Make().String(),
		Question: question,
		Answer:   result.Answer,
		AskedAt:  time.Now(),
		Evidence: result.Evidence,
	}

	entries = append([]domain.HistoryEntry{entry}, entries...)
	if len(entries) > h.maxEntries {
		entries = entries[:h.maxEntries]
	}

	if err := h.store.SaveHistory(ctx, entries); err != nil {
		slog.Error("save history entry", "error", err)
	}
}
