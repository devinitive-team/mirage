export type PreviewMode = "evidence" | "document";

export type PreviewReference = {
	id: string;
	nodeId: string;
	nodeTitle: string;
	pageStart: number;
	pageEnd: number;
};

export type PreviewHighlightRange = {
	id: string;
	pageStart: number;
	pageEnd: number;
	nodeTitle: string;
};

export type PreviewDialogState = {
	showScopeToggle: boolean;
	effectiveMode: PreviewMode;
	visiblePageNumbers: Array<number> | undefined;
	highlightRanges: Array<PreviewHighlightRange>;
};

export const UPLOADED_FILE_PREVIEW_NODE_ID = "uploaded-file-preview";

function buildPageRange(pageStart: number, pageEnd: number): Array<number> {
	const normalizedStart = Math.max(1, Math.floor(Math.min(pageStart, pageEnd)));
	const normalizedEnd = Math.max(1, Math.floor(Math.max(pageStart, pageEnd)));
	const pages: Array<number> = [];

	for (let page = normalizedStart; page <= normalizedEnd; page += 1) {
		pages.push(page);
	}

	return pages;
}

export function resolvePreviewDialogState(
	reference: PreviewReference | null,
	mode: PreviewMode,
): PreviewDialogState {
	if (!reference) {
		return {
			showScopeToggle: false,
			effectiveMode: mode,
			visiblePageNumbers: undefined,
			highlightRanges: [],
		};
	}

	const isUploadedFilePreview =
		reference.nodeId === UPLOADED_FILE_PREVIEW_NODE_ID;
	const effectiveMode: PreviewMode = isUploadedFilePreview ? "document" : mode;

	return {
		showScopeToggle: !isUploadedFilePreview,
		effectiveMode,
		visiblePageNumbers:
			effectiveMode === "evidence"
				? buildPageRange(reference.pageStart, reference.pageEnd)
				: undefined,
		highlightRanges: isUploadedFilePreview
			? []
			: [
					{
						id: reference.id,
						pageStart: reference.pageStart,
						pageEnd: reference.pageEnd,
						nodeTitle: reference.nodeTitle,
					},
				],
	};
}
