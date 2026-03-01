// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
	ReferenceListItem,
	groupReferencesByDocument,
	type GroupedReferenceListItemData,
	type ReferenceListItemData,
} from "#/components/ReferenceListItem";

const baseReferenceA: ReferenceListItemData = {
	id: "1",
	documentId: "doc-1",
	documentName: "Quarterly_Update.pdf",
	nodeId: "node-1",
	nodeTitle: "Financial Results",
	pageStart: 12,
	pageEnd: 13,
};

const baseReferenceB: ReferenceListItemData = {
	id: "2",
	documentId: "doc-1",
	documentName: "Quarterly_Update.pdf",
	nodeId: "node-2",
	nodeTitle: "Forecast",
	pageStart: 20,
	pageEnd: 22,
};

const groupedReference: GroupedReferenceListItemData = {
	id: "document-group:doc-1",
	documentId: "doc-1",
	documentName: "Quarterly_Update.pdf",
	evidence: [baseReferenceA, baseReferenceB],
};

describe("ReferenceListItem", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders grouped document metadata and page-range entries", () => {
		render(
			<ReferenceListItem
				referenceGroup={groupedReference}
				onPreview={() => {}}
			/>,
		);

		expect(screen.getByText("Quarterly_Update.pdf")).toBeTruthy();
		expect(screen.getByText("Pages 12-13")).toBeTruthy();
		expect(screen.getByText("Pages 20-22")).toBeTruthy();
		expect(screen.getByText("Financial Results")).toBeTruthy();
		expect(screen.getByText("Forecast")).toBeTruthy();
	});

	it("triggers preview callback for a selected page-range entry", () => {
		const onPreview = vi.fn();
		render(
			<ReferenceListItem
				referenceGroup={groupedReference}
				onPreview={onPreview}
			/>,
		);
		const previewButton = screen.getAllByRole("button", {
			name: /Pages 20-22 Forecast/i,
		})[0];
		fireEvent.click(previewButton);

		expect(onPreview).toHaveBeenCalledWith(baseReferenceB);
	});
});

describe("groupReferencesByDocument", () => {
	it("groups references by document and sorts evidence by page range", () => {
		const grouped = groupReferencesByDocument([
			baseReferenceB,
			{
				id: "3",
				documentId: "doc-2",
				documentName: "Another.pdf",
				nodeId: "node-x",
				nodeTitle: "Summary",
				pageStart: 1,
				pageEnd: 1,
			},
			baseReferenceA,
		]);

		expect(grouped).toEqual([
			{
				id: "document-group:doc-1",
				documentId: "doc-1",
				documentName: "Quarterly_Update.pdf",
				evidence: [baseReferenceA, baseReferenceB],
			},
			{
				id: "document-group:doc-2",
				documentId: "doc-2",
				documentName: "Another.pdf",
				evidence: [
					{
						id: "3",
						documentId: "doc-2",
						documentName: "Another.pdf",
						nodeId: "node-x",
						nodeTitle: "Summary",
						pageStart: 1,
						pageEnd: 1,
					},
				],
			},
		]);
	});
});
