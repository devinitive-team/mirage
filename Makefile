.PHONY: build run test lint clean

build:
	go build ./...

run:
	go run ./cmd/mirage

test:
	go test ./...

lint:
	go vet ./...

clean:
	rm -rf data/
