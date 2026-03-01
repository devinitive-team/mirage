package worker

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"
	"time"
)

func TestPoolExecutesSubmittedJobs(t *testing.T) {
	pool := New(1)
	t.Cleanup(pool.Shutdown)

	done := make(chan struct{})
	if err := pool.Submit(Job{
		ID: "job-1",
		Fn: func(context.Context) error {
			close(done)
			return nil
		},
	}); err != nil {
		t.Fatalf("Submit returned error: %v", err)
	}

	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for submitted job to run")
	}
}

func TestPoolSubmitAfterShutdownReturnsErrPoolClosed(t *testing.T) {
	pool := New(1)
	pool.Shutdown()

	err := pool.Submit(Job{
		ID: "job-after-shutdown",
		Fn: func(context.Context) error { return nil },
	})
	if !errors.Is(err, ErrPoolClosed) {
		t.Fatalf("Submit error = %v, want %v", err, ErrPoolClosed)
	}
}

func TestPoolShutdownIsIdempotent(t *testing.T) {
	pool := New(1)

	var runs atomic.Int32
	if err := pool.Submit(Job{
		ID: "job-1",
		Fn: func(context.Context) error {
			runs.Add(1)
			return nil
		},
	}); err != nil {
		t.Fatalf("Submit returned error: %v", err)
	}

	pool.Shutdown()
	pool.Shutdown()

	if runs.Load() != 1 {
		t.Fatalf("job runs = %d, want 1", runs.Load())
	}
}
