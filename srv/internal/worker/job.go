package worker

import "context"

type Job struct {
	ID string
	Fn func(ctx context.Context) error
}
