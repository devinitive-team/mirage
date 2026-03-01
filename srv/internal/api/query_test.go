package api

import (
	"context"
	"errors"
	"testing"

	"github.com/devinitive-team/mirage/internal/domain"
)

type stubAnswerer struct {
	result   domain.QueryResult
	err      error
	received domain.Query
}

func (s *stubAnswerer) Answer(_ context.Context, query domain.Query) (domain.QueryResult, error) {
	s.received = query
	if s.err != nil {
		return domain.QueryResult{}, s.err
	}
	return s.result, nil
}

func TestQueryForwardsInputAndReturnsBody(t *testing.T) {
	retrieval := &stubAnswerer{
		result: domain.QueryResult{
			Answer: "Revenue grew.",
			Evidence: []domain.Evidence{
				{
					DocumentID:   "doc-1",
					DocumentName: "Quarterly.pdf",
					NodeID:       "n1",
					NodeTitle:    "Financial Results",
					PageStart:    0,
					PageEnd:      1,
				},
			},
		},
	}
	handler := NewQueryHandler(retrieval, nil)

	resp, err := handler.Query(context.Background(), &QueryInput{
		Body: QueryBody{
			Question:    "How did revenue change?",
			DocumentIDs: []string{"doc-1"},
		},
	})
	if err != nil {
		t.Fatalf("Query returned error: %v", err)
	}

	if retrieval.received.Question != "How did revenue change?" {
		t.Fatalf("received question = %q", retrieval.received.Question)
	}
	if len(retrieval.received.DocumentIDs) != 1 || retrieval.received.DocumentIDs[0] != "doc-1" {
		t.Fatalf("received document ids = %#v", retrieval.received.DocumentIDs)
	}
	if resp.Body.Answer != "Revenue grew." {
		t.Fatalf("answer = %q, want Revenue grew.", resp.Body.Answer)
	}
	if len(resp.Body.Evidence) != 1 {
		t.Fatalf("len(evidence) = %d, want 1", len(resp.Body.Evidence))
	}
	if resp.Body.Evidence[0].PageStart != 1 || resp.Body.Evidence[0].PageEnd != 2 {
		t.Fatalf("page range = %d-%d, want 1-2", resp.Body.Evidence[0].PageStart, resp.Body.Evidence[0].PageEnd)
	}
}

func TestQueryReturnsErrorWhenRetrievalFails(t *testing.T) {
	handler := NewQueryHandler(&stubAnswerer{err: errors.New("upstream failure")}, nil)
	_, err := handler.Query(context.Background(), &QueryInput{
		Body: QueryBody{
			Question:    "Q",
			DocumentIDs: []string{"doc-1"},
		},
	})
	if err == nil {
		t.Fatal("Query error = nil, want failure")
	}
}
