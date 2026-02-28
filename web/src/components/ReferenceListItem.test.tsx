// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
	REFERENCE_LIST_ITEM_HEIGHT,
	ReferenceListItem,
	type ReferenceListItemData,
} from "#/components/ReferenceListItem";

const baseReference: ReferenceListItemData = {
	id: "1",
	documentId: "doc-1",
	documentName: "Quarterly_Update.pdf",
	nodeId: "node-7",
	nodeTitle: "Financial Results",
	pageStart: 12,
	pageEnd: 13,
	snippet:
		"Revenue increased 14% year-over-year after margin improvements in the core segment.",
};

describe("ReferenceListItem", () => {
	it("renders metadata and evidence summary", () => {
		render(
			<ReferenceListItem reference={baseReference} onPreview={() => {}} />,
		);

		expect(screen.getByText("Quarterly_Update.pdf")).toBeTruthy();
		expect(screen.getByText("Pages 12-13")).toBeTruthy();
		expect(screen.getByText("Financial Results")).toBeTruthy();
		expect(
			screen.getByText(
				"Revenue increased 14% year-over-year after margin improvements in the core segment.",
			),
		).toBeTruthy();
	});

	it("falls back to a generic preview message when no snippet is provided", () => {
		render(
			<ReferenceListItem
				reference={{
					...baseReference,
					id: "2",
					snippet: undefined,
				}}
				onPreview={() => {}}
			/>,
		);

		expect(
			screen.getByText("Open preview to inspect evidence context."),
		).toBeTruthy();
	});

	it("keeps stable row height contract", () => {
		expect(REFERENCE_LIST_ITEM_HEIGHT).toBe(192);
	});

	it("triggers preview callback when clicked", () => {
		const onPreview = vi.fn();
		const { container } = render(
			<ReferenceListItem reference={baseReference} onPreview={onPreview} />,
		);
		const trigger = container.querySelector("button.reference-list-item");

		expect(trigger).toBeTruthy();
		fireEvent.click(trigger as HTMLButtonElement);

		expect(onPreview).toHaveBeenCalledWith(baseReference);
	});
});
