/**
 * Typed aliases over the auto-generated OpenAPI schema.
 * Re-run `task codegen` whenever the backend API changes.
 */
import type { components } from "#/lib/api.gen";

// ─── Documents ────────────────────────────────────────────────────────────────

/** The Go backend declares these as string constants; OpenAPI loses the enum. */
export type DocumentStatus = "pending" | "processing" | "complete" | "failed";

export type Document = Omit<
	components["schemas"]["DocumentBody"],
	"$schema" | "status"
> & {
	status: DocumentStatus;
};

export type DocumentList = {
	items: Document[];
	total: number;
	page: number;
	page_size: number;
	pages: number;
};

// ─── Query ────────────────────────────────────────────────────────────────────

export type Evidence = components["schemas"]["EvidenceBody"];
export type QueryResult = Omit<
	components["schemas"]["QueryResultBody"],
	"$schema"
>;

export type QueryRequest = Omit<components["schemas"]["QueryBody"], "$schema">;

export type TreeNode = Omit<components["schemas"]["TreeNodeBody"], "$schema">;
export type DocumentTree = Omit<components["schemas"]["TreeBody"], "$schema">;

// ─── History ─────────────────────────────────────────────────────────────────

export type HistoryEntry = Omit<
	components["schemas"]["HistoryEntryBody"],
	"$schema"
>;

export type HistoryList = {
	items: HistoryEntry[];
};
