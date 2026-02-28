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
	pageNumber: 12,
	areaLabel: "Page 12 - area x 11%, y 22%, w 33%, h 44%",
	searchPhrase: "response latency",
	excerpt:
		"The team tracked response latency after each release. A drop in response latency mapped directly to improved support outcomes.",
};

describe("ReferenceListItem", () => {
	it("renders metadata and phrase summary", () => {
		render(
			<ReferenceListItem reference={baseReference} onPreview={() => {}} />,
		);

		expect(screen.getByText("Quarterly_Update.pdf")).toBeTruthy();
		expect(
			screen.getByText("Page 12 - area x 11%, y 22%, w 33%, h 44%"),
		).toBeTruthy();
		expect(
			screen.getByText('Highlighted phrase: "response latency"'),
		).toBeTruthy();
	});

	it("falls back to a generic preview message when no search phrase is provided", () => {
		render(
			<ReferenceListItem
				reference={{
					...baseReference,
					id: "2",
					searchPhrase: undefined,
				}}
				onPreview={() => {}}
			/>,
		);

		expect(
			screen.getByText("Open preview to inspect this selected region."),
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
