import { describe, expect, it } from "vitest";

import {
	formatPreviewContextLabel,
	resolvePreviewDialogState,
	UPLOADED_FILE_PREVIEW_NODE_ID,
	type PreviewReference,
} from "#/lib/previewDialogState";

const evidenceReference: PreviewReference = {
	id: "evidence-1",
	nodeId: "node-1",
	nodeTitle: "Evidence section",
	pageStart: 3,
	pageEnd: 4,
};

const uploadedReference: PreviewReference = {
	id: "uploaded-preview:doc-1",
	nodeId: UPLOADED_FILE_PREVIEW_NODE_ID,
	nodeTitle: "Uploaded file preview",
	pageStart: 1,
	pageEnd: 1,
};

describe("resolvePreviewDialogState", () => {
	it("forces whole-document mode and no highlights for uploaded previews", () => {
		const state = resolvePreviewDialogState(uploadedReference, "evidence");

		expect(state.showScopeToggle).toBe(false);
		expect(state.effectiveMode).toBe("document");
		expect(state.visiblePageNumbers).toBeUndefined();
		expect(state.highlightRanges).toEqual([]);
	});

	it("shows only selected pages without highlights in evidence mode", () => {
		const state = resolvePreviewDialogState(evidenceReference, "evidence");

		expect(state.showScopeToggle).toBe(true);
		expect(state.effectiveMode).toBe("evidence");
		expect(state.visiblePageNumbers).toEqual([3, 4]);
		expect(state.highlightRanges).toEqual([]);
	});

	it("shows full document for evidence references when toggled", () => {
		const state = resolvePreviewDialogState(evidenceReference, "document");

		expect(state.showScopeToggle).toBe(true);
		expect(state.effectiveMode).toBe("document");
		expect(state.visiblePageNumbers).toBeUndefined();
		expect(state.highlightRanges).toEqual([
			{
				id: "evidence-1",
				pageStart: 3,
				pageEnd: 4,
				nodeTitle: "Evidence section",
			},
		]);
	});
});

describe("formatPreviewContextLabel", () => {
	it("returns plain node title for uploaded previews", () => {
		expect(formatPreviewContextLabel(uploadedReference)).toBe(
			"Uploaded file preview",
		);
	});

	it("returns range label for evidence previews", () => {
		expect(formatPreviewContextLabel(evidenceReference)).toBe(
			"Evidence section · Pages 3-4",
		);
	});
});
