// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("#/lib/pdfjs", () => ({
	loadPdfJs: vi.fn(async () => ({
		getDocument: vi.fn(() => ({
			promise: Promise.reject(new Error("mocked thumbnail load failure")),
			destroy: vi.fn(async () => undefined),
		})),
	})),
}));

import type { HistoryEntry } from "#/lib/types";
import { HistoryPage } from "#/routes/history";

const fixtureEntries: HistoryEntry[] = [
	{
		id: "history-1",
		question: "What changed in Q4 revenue?",
		answer: "Revenue increased 11% quarter over quarter.",
		asked_at: "2026-02-28T18:20:00.000Z",
		evidence: [
			{
				document_id: "doc-q4",
				document_name: "Q4_Report.pdf",
				node_id: "node-revenue",
				node_title: "Revenue Overview",
				page_start: 4,
				page_end: 6,
			},
		],
	},
	{
		id: "history-2",
		question: "Which contracts expire in 2026?",
		answer: "Three vendor agreements expire in 2026.",
		asked_at: "2026-02-26T12:20:00.000Z",
		evidence: [
			{
				document_id: "doc-contracts",
				document_name: "Vendor_Contracts.pdf",
				node_id: "node-expiry",
				node_title: "Expiry Terms",
				page_start: 10,
				page_end: 11,
			},
		],
	},
];

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

describe("HistoryPage", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		cleanup();
	});

	it("shows the selected question answer and switches evidence when another question is selected", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ items: fixtureEntries }),
			}),
		);

		render(<HistoryPage />, { wrapper: createWrapper() });

		await waitFor(() => {
			expect(
				screen.getByText("Revenue increased 11% quarter over quarter."),
			).toBeTruthy();
		});
		expect(screen.getByText("Q4_Report.pdf")).toBeTruthy();
		expect(screen.getByText("Pages 4-6")).toBeTruthy();
		expect(screen.getByText("Revenue Overview")).toBeTruthy();

		fireEvent.click(
			screen.getByRole("button", {
				name: /Which contracts expire in 2026\?/i,
			}),
		);

		expect(
			screen.getByText("Three vendor agreements expire in 2026."),
		).toBeTruthy();
		expect(screen.getByText("Vendor_Contracts.pdf")).toBeTruthy();
	});
});
