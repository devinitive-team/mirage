import type {
	Document,
	DocumentTree,
	QueryRequest,
	QueryResult,
} from "#/lib/types";

export type {
	Document,
	DocumentTree,
	Evidence,
	QueryRequest,
	QueryResult,
} from "#/lib/types";

const API_BASE = "http://localhost:2137";
const BASE = `${API_BASE}/api/v1`;

// ─── Documents ────────────────────────────────────────────────────────────────

export async function listDocuments(
	limit = 100,
	offset = 0,
): Promise<Document[]> {
	const res = await fetch(`${BASE}/documents?limit=${limit}&offset=${offset}`);
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

export async function deleteDocuments(ids: string[]): Promise<void> {
	if (ids.length === 0) return;
	await Promise.all(ids.map((id) => deleteDocument(id)));
}

export function getDocumentPdfUrl(id: string): string {
	return `${BASE}/documents/${id}/pdf`;
}

export async function getDocumentTree(id: string): Promise<DocumentTree> {
	const res = await fetch(`${BASE}/documents/${id}/tree`);
	if (!res.ok)
		throw new Error(`Failed to get document tree: ${res.statusText}`);
	return res.json();
}

// ─── Query ────────────────────────────────────────────────────────────────────

export async function queryDocuments(body: QueryRequest): Promise<QueryResult> {
	const res = await fetch(`${BASE}/query`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	if (!res.ok) throw new Error(`Query failed: ${res.statusText}`);
	const result = (await res.json()) as QueryResult;
	return {
		...result,
		evidence: result.evidence ?? [],
	};
}
