package worker

import (
	"context"
	"log/slog"
	"sync"
)

type Pool struct {
	jobs chan Job
	wg   sync.WaitGroup
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

func (p *Pool) Submit(job Job) {
	p.jobs <- job
}

func (p *Pool) Shutdown() {
	close(p.jobs)
	p.wg.Wait()
}
