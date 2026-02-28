package api

import (
	"context"
	"fmt"

	"github.com/danielgtaylor/huma/v2"

	"github.com/devinitive-team/mirage/internal/domain"
	"github.com/devinitive-team/mirage/internal/service"
)

type QueryHandler struct {
	retrieval *service.Retrieval
}

func NewQueryHandler(retrieval *service.Retrieval) *QueryHandler {
	return &QueryHandler{retrieval: retrieval}
}

func (h *QueryHandler) RegisterRoutes(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "query-documents",
		Method:      "POST",
		Path:        "/api/v1/query",
		Summary:     "Query documents",
	}, h.Query)
}

func (h *QueryHandler) Query(ctx context.Context, input *QueryInput) (*QueryOutput, error) {
	query := domain.Query{
		Question:    input.Body.Question,
		DocumentIDs: input.Body.DocumentIDs,
	}

	result, err := h.retrieval.Answer(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}

	return &QueryOutput{Body: result}, nil
}
