import type { Document, QueryRequest, QueryResult } from "#/lib/types";

export type { Document, QueryRequest, QueryResult } from "#/lib/types";

const BASE = "http://localhost:2137/api/v1";

// ─── Documents ────────────────────────────────────────────────────────────────

export async function listDocuments(
	limit = 100,
	offset = 0,
): Promise<Document[]> {
	const res = await fetch(
		`${BASE}/documents?limit=${limit}&offset=${offset}`,
	);
	if (!res.ok) throw new Error(`Failed to list documents: ${res.statusText}`);
	return res.json();
}

export async function uploadDocument(file: File): Promise<Document> {
	const formData = new FormData();
	formData.append("file", file, file.name);
	const res = await fetch(`${BASE}/documents`, {
		method: "POST",
		body: formData,
	});
	if (!res.ok) throw new Error(`Failed to upload: ${res.statusText}`);
	return res.json();
}

export async function getDocument(id: string): Promise<Document> {
	const res = await fetch(`${BASE}/documents/${id}`);
	if (!res.ok) throw new Error(`Failed to get document: ${res.statusText}`);
	return res.json();
}

export async function deleteDocument(id: string): Promise<void> {
	const res = await fetch(`${BASE}/documents/${id}`, { method: "DELETE" });
	if (!res.ok) throw new Error(`Failed to delete: ${res.statusText}`);
}

// ─── Query ────────────────────────────────────────────────────────────────────

export async function queryDocuments(
	body: QueryRequest,
): Promise<QueryResult> {
	const res = await fetch(`${BASE}/query`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	if (!res.ok) throw new Error(`Query failed: ${res.statusText}`);
	return res.json();
}
