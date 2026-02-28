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
	documentName: "Quarterly_Update.pdf",
	pageNumber: 12,
	areaLabel: "Page 12 - area x 11%, y 22%, w 33%, h 44%",
	searchPhrase: "response latency",
	excerpt:
		"The team tracked response latency after each release. A drop in response latency mapped directly to improved support outcomes.",
};

describe("ReferenceListItem", () => {
	it("renders document metadata and highlights matched search phrase", () => {
		const { container } = render(
			<ReferenceListItem reference={baseReference} onPreview={() => {}} />,
		);

		expect(screen.getByText("Quarterly_Update.pdf")).toBeTruthy();
		expect(
			screen.getByText("Page 12 - area x 11%, y 22%, w 33%, h 44%"),
		).toBeTruthy();
		expect(container.querySelector("button.reference-list-item")).toBeTruthy();
		expect(container.querySelector(".reference-list-item__page")).toBeTruthy();
		expect(
			container.querySelector(".reference-list-item__excerpt"),
		).toBeTruthy();

		const highlighted = Array.from(container.querySelectorAll("mark")).map(
			(mark) => mark.textContent,
		);
		expect(highlighted).toEqual(["response latency", "response latency"]);
		expect(
			container.querySelectorAll("mark.reference-list-item__mark").length,
		).toBe(2);
	});

	it("renders a PDF image preview when provided", () => {
		const imageReference: ReferenceListItemData = {
			...baseReference,
			id: "2",
			excerpt: undefined,
			searchPhrase: undefined,
			previewImageUrl:
				"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9jQ+7fQAAAAASUVORK5CYII=",
		};

		const { container } = render(
			<ReferenceListItem reference={imageReference} onPreview={() => {}} />,
		);
		const previewImage = container.querySelector(
			"img.reference-list-item__preview",
		);

		expect(previewImage).toBeTruthy();
		expect(previewImage?.getAttribute("src")).toContain(
			"data:image/png;base64",
		);
	});

	it("keeps excerpt region scrollable for long content", () => {
		const longReference = {
			...baseReference,
			excerpt: `${baseReference.excerpt} `.repeat(24),
		};

		const { container } = render(
			<ReferenceListItem reference={longReference} onPreview={() => {}} />,
		);
		const scrollRegion = container.querySelector(".overflow-y-auto");

		expect(scrollRegion).toBeTruthy();
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
