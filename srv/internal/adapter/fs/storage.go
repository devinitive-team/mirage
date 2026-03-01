package fs

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"

	"github.com/devinitive-team/mirage/internal/domain"
	"github.com/devinitive-team/mirage/internal/port"
)

var _ port.Storage = (*Storage)(nil)

type Storage struct {
	base string
}

func New(dataDir string) *Storage {
	return &Storage{base: dataDir}
}

func (s *Storage) SaveDocument(_ context.Context, doc domain.Document) error {
	return writeJSON(metaPath(s.base, doc.ID), doc)
}

func (s *Storage) GetDocument(_ context.Context, id string) (domain.Document, error) {
	var doc domain.Document
	if err := readJSON(metaPath(s.base, id), &doc); err != nil {
		return domain.Document{}, err
	}
	return doc, nil
}

func (s *Storage) ListDocuments(_ context.Context, limit, offset int) ([]domain.Document, int, error) {
	docsDir := filepath.Join(s.base, "documents")
	entries, err := os.ReadDir(docsDir)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, 0, nil
		}
		return nil, 0, fmt.Errorf("read documents dir: %w", err)
	}

	var docs []domain.Document
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		var doc domain.Document
		if err := readJSON(metaPath(s.base, e.Name()), &doc); err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				continue
			}
			return nil, 0, fmt.Errorf("read document %s: %w", e.Name(), err)
		}
		docs = append(docs, doc)
	}

	sort.Slice(docs, func(i, j int) bool {
		return docs[i].CreatedAt.After(docs[j].CreatedAt)
	})

	total := len(docs)

	if offset >= len(docs) {
		return nil, total, nil
	}
	docs = docs[offset:]
	if limit > 0 && limit < len(docs) {
		docs = docs[:limit]
	}
	return docs, total, nil
}

func (s *Storage) DeleteDocument(_ context.Context, id string) error {
	dir := docDir(s.base, id)
	if _, err := os.Stat(dir); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return domain.ErrNotFound
		}
		return fmt.Errorf("stat doc dir: %w", err)
	}
	return os.RemoveAll(dir)
}

func (s *Storage) SavePDF(_ context.Context, docID string, r io.Reader) error {
	dir := docDir(s.base, docID)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("create doc dir: %w", err)
	}

	dst := pdfPath(s.base, docID)
	if err := writeFileAtomic(dst, r); err != nil {
		return fmt.Errorf("write pdf: %w", err)
	}
	return nil
}

func (s *Storage) OpenPDF(_ context.Context, docID string) (io.ReadCloser, error) {
	f, err := os.Open(pdfPath(s.base, docID))
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("open pdf: %w", err)
	}
	return f, nil
}

func (s *Storage) SavePages(_ context.Context, docID string, pages []domain.Page) error {
	return writeJSON(pagesPath(s.base, docID), pages)
}

func (s *Storage) GetPages(_ context.Context, docID string) ([]domain.Page, error) {
	var pages []domain.Page
	if err := readJSON(pagesPath(s.base, docID), &pages); err != nil {
		return nil, err
	}
	return pages, nil
}

func (s *Storage) GetPageRange(ctx context.Context, docID string, start, end int) ([]domain.Page, error) {
	pages, err := s.GetPages(ctx, docID)
	if err != nil {
		return nil, err
	}
	if start < 0 || end < start || start >= len(pages) {
		return nil, nil
	}
	if end >= len(pages) {
		end = len(pages) - 1
	}
	return pages[start : end+1], nil
}

func (s *Storage) SaveTree(_ context.Context, tree domain.TreeIndex) error {
	return writeJSON(treePath(s.base, tree.DocumentID), tree)
}

func (s *Storage) GetTree(_ context.Context, docID string) (domain.TreeIndex, error) {
	var tree domain.TreeIndex
	if err := readJSON(treePath(s.base, docID), &tree); err != nil {
		return domain.TreeIndex{}, err
	}
	return tree, nil
}

func (s *Storage) LoadHistory(_ context.Context) ([]domain.HistoryEntry, error) {
	var entries []domain.HistoryEntry
	if err := readJSON(historyPath(s.base), &entries); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return []domain.HistoryEntry{}, nil
		}
		return nil, err
	}
	return entries, nil
}

func (s *Storage) SaveHistory(_ context.Context, entries []domain.HistoryEntry) error {
	return writeJSON(historyPath(s.base), entries)
}

func (s *Storage) ClearHistory(_ context.Context) error {
	if err := os.Remove(historyPath(s.base)); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("remove history file: %w", err)
	}
	return nil
}

func writeJSON(path string, v any) error {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal json: %w", err)
	}

	if err := writeFileAtomic(path, bytes.NewReader(data)); err != nil {
		return fmt.Errorf("write json file: %w", err)
	}
	return nil
}

func readJSON(path string, v any) error {
	data, err := readFile(path)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(data, v); err != nil {
		return fmt.Errorf("unmarshal json: %w", err)
	}
	return nil
}

func readFile(path string) ([]byte, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("read file: %w", err)
	}
	return data, nil
}

func writeFileAtomic(path string, r io.Reader) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("create parent dir: %w", err)
	}

	tmp := path + ".tmp"

	f, err := os.OpenFile(tmp, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
	if err != nil {
		return fmt.Errorf("create temp file: %w", err)
	}
	if _, err := io.Copy(f, r); err != nil {
		_ = f.Close()
		_ = os.Remove(tmp)
		return fmt.Errorf("write temp file: %w", err)
	}
	if err := f.Close(); err != nil {
		_ = os.Remove(tmp)
		return fmt.Errorf("close temp file: %w", err)
	}
	if err := os.Rename(tmp, path); err != nil {
		_ = os.Remove(tmp)
		return fmt.Errorf("rename temp file: %w", err)
	}
	return nil
}
