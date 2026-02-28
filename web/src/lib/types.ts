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

// ─── Query ────────────────────────────────────────────────────────────────────

export type Citation = components["schemas"]["Citation"];

export type QueryRequest = Omit<components["schemas"]["QueryBody"], "$schema">;

export type QueryResult = Omit<components["schemas"]["QueryResult"], "$schema">;
