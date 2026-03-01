// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
	type EvidenceHistoryEntry,
	useEvidenceHistoryStore,
} from "#/hooks/evidenceHistory";
import { HistoryPage } from "#/routes/history";

const fixtureEntries: EvidenceHistoryEntry[] = [
	{
		id: "history-1",
		question: "What changed in Q4 revenue?",
		answer: "Revenue increased 11% quarter over quarter.",
		askedAt: "2026-02-28T18:20:00.000Z",
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
		askedAt: "2026-02-26T12:20:00.000Z",
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

describe("HistoryPage", () => {
	beforeEach(() => {
		useEvidenceHistoryStore.getState().replaceEntries(fixtureEntries);
	});

	afterEach(() => {
		useEvidenceHistoryStore.getState().clearEntries();
		cleanup();
	});

	it("shows the selected question answer and switches evidence when another question is selected", () => {
		render(<HistoryPage />);

		expect(
			screen.getByText("Revenue increased 11% quarter over quarter."),
		).toBeTruthy();
		expect(screen.getByText("Q4_Report.pdf")).toBeTruthy();

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
