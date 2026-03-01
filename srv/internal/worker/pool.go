package worker

import (
	"context"
	"errors"
	"log/slog"
	"sync"
)

var ErrPoolClosed = errors.New("worker pool is shut down")

type Pool struct {
	jobs         chan Job
	wg           sync.WaitGroup
	mu           sync.RWMutex
	closed       bool
	shutdownOnce sync.Once
}

func New(size int) *Pool {
	p := &Pool{
		jobs: make(chan Job, size*2),
	}
	p.wg.Add(size)
	for range size {
		go p.worker()
	}
	return p
}

func (p *Pool) worker() {
	defer p.wg.Done()
	for job := range p.jobs {
		if err := job.Fn(context.Background()); err != nil {
			slog.Error("job failed", "job_id", job.ID, "error", err)
		}
	}
}

func (p *Pool) Submit(job Job) error {
	p.mu.RLock()
	defer p.mu.RUnlock()
	if p.closed {
		return ErrPoolClosed
	}
	p.jobs <- job
	return nil
}

func (p *Pool) Shutdown() {
	p.shutdownOnce.Do(func() {
		p.mu.Lock()
		p.closed = true
		close(p.jobs)
		p.mu.Unlock()
		p.wg.Wait()
	})
}
