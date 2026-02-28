package fs

import "path/filepath"

func docDir(base, docID string) string {
	return filepath.Join(base, "documents", docID)
}

func metaPath(base, docID string) string {
	return filepath.Join(docDir(base, docID), "meta.json")
}

func pdfPath(base, docID string) string {
	return filepath.Join(docDir(base, docID), "source.pdf")
}

func pagesPath(base, docID string) string {
	return filepath.Join(docDir(base, docID), "pages.json")
}

func treePath(base, docID string) string {
	return filepath.Join(docDir(base, docID), "tree.json")
}
