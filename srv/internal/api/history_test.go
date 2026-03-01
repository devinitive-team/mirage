package api

import (
	"context"
	"testing"
	"time"

	"github.com/devinitive-team/mirage/internal/domain"
)

type stubHistoryStore struct {
	entries []domain.HistoryEntry
	saveErr error
	loadErr error
	clearErr error
	cleared bool
}

func (s *stubHistoryStore) LoadHistory(_ context.Context) ([]domain.HistoryEntry, error) {
	if s.loadErr != nil {
		return nil, s.loadErr
	}
	return s.entries, nil
}

func (s *stubHistoryStore) SaveHistory(_ context.Context, entries []domain.HistoryEntry) error {
	if s.saveErr != nil {
		return s.saveErr
	}
	s.entries = entries
	return nil
}

func (s *stubHistoryStore) ClearHistory(_ context.Context) error {
	if s.clearErr != nil {
		return s.clearErr
	}
	s.cleared = true
	s.entries = nil
	return nil
}

func TestListReturnsEntries(t *testing.T) {
	store := &stubHistoryStore{
		entries: []domain.HistoryEntry{
			{
				ID:       "01ABC",
				Question: "What is revenue?",
				Answer:   "Revenue grew.",
				AskedAt:  time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
				Evidence: []domain.Evidence{
					{DocumentID: "d1", DocumentName: "Report.pdf", NodeID: "n1", NodeTitle: "Financials", PageStart: 0, PageEnd: 1},
				},
			},
		},
	}

	handler := NewHistoryHandler(store, 10)
	resp, err := handler.List(context.Background(), &struct{}{})
	if err != nil {
		t.Fatalf("List returned error: %v", err)
	}

	if len(resp.Body.Items) != 1 {
		t.Fatalf("len(items) = %d, want 1", len(resp.Body.Items))
	}
	item := resp.Body.Items[0]
	if item.ID != "01ABC" {
		t.Fatalf("id = %q, want 01ABC", item.ID)
	}
	if item.Question != "What is revenue?" {
		t.Fatalf("question = %q", item.Question)
	}
	if item.Evidence[0].PageStart != 1 || item.Evidence[0].PageEnd != 2 {
		t.Fatalf("page range = %d-%d, want 1-2", item.Evidence[0].PageStart, item.Evidence[0].PageEnd)
	}
}

func TestListReturnsEmptyWhenNoHistory(t *testing.T) {
	store := &stubHistoryStore{}
	handler := NewHistoryHandler(store, 10)

	resp, err := handler.List(context.Background(), &struct{}{})
	if err != nil {
		t.Fatalf("List returned error: %v", err)
	}
	if len(resp.Body.Items) != 0 {
		t.Fatalf("len(items) = %d, want 0", len(resp.Body.Items))
	}
}

func TestClearDelegatesToStore(t *testing.T) {
	store := &stubHistoryStore{
		entries: []domain.HistoryEntry{{ID: "01ABC"}},
	}
	handler := NewHistoryHandler(store, 10)

	_, err := handler.Clear(context.Background(), &struct{}{})
	if err != nil {
		t.Fatalf("Clear returned error: %v", err)
	}
	if !store.cleared {
		t.Fatal("store.ClearHistory was not called")
	}
}

func TestAddEntryPrependsAndSaves(t *testing.T) {
	store := &stubHistoryStore{
		entries: []domain.HistoryEntry{
			{ID: "old", Question: "Old question"},
		},
	}
	handler := NewHistoryHandler(store, 10)

	handler.AddEntry(context.Background(), "New question", domain.QueryResult{
		Answer: "New answer",
		Evidence: []domain.Evidence{
			{DocumentID: "d1", PageStart: 2, PageEnd: 3},
		},
	})

	if len(store.entries) != 2 {
		t.Fatalf("len(entries) = %d, want 2", len(store.entries))
	}
	if store.entries[0].Question != "New question" {
		t.Fatalf("first entry question = %q, want New question", store.entries[0].Question)
	}
	if store.entries[1].ID != "old" {
		t.Fatalf("second entry id = %q, want old", store.entries[1].ID)
	}
}

func TestAddEntryEvictsFIFO(t *testing.T) {
	store := &stubHistoryStore{
		entries: []domain.HistoryEntry{
			{ID: "a", Question: "Q1"},
			{ID: "b", Question: "Q2"},
			{ID: "c", Question: "Q3"},
		},
	}
	handler := NewHistoryHandler(store, 3)

	handler.AddEntry(context.Background(), "Q4", domain.QueryResult{Answer: "A4"})

	if len(store.entries) != 3 {
		t.Fatalf("len(entries) = %d, want 3", len(store.entries))
	}
	if store.entries[0].Question != "Q4" {
		t.Fatalf("first entry = %q, want Q4", store.entries[0].Question)
	}
	if store.entries[2].ID != "b" {
		t.Fatalf("last entry id = %q, want b (oldest evicted)", store.entries[2].ID)
	}
}
