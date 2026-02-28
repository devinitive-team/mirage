# Design

This file captures design constraints and implementation direction. Keep it concise.

## Design Principles

- Single-user MVP: no auth, no multi-tenancy.
- Explicit configuration: API keys and settings via environment variables, never implicit.
- Minimal dependencies: stdlib and proven libraries (Huma, TanStack).
- Deferred complexity: no caching or optimization until bottlenecks appear.

## System Shape

Three tiers: React frontend → Go REST API → Mistral (OCR + LLM) + filesystem storage.

Upload flow: PDF uploaded → async OCR extracts text → LLM builds hierarchical tree index → document becomes queryable.

Query flow: question submitted → LLM reasons over tree index, drilling into relevant branches → page content loaded → answer generated with citations.

## Design Targets

- No data loss on restart — all state persisted to filesystem before responding.
- Pluggable backends — OCR and LLM providers swappable via port interfaces.
- Async processing — uploads return immediately, processing happens in background workers.
