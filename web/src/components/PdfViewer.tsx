import { type ComponentProps, useMemo } from "react";
import {
	Highlight,
	type IHighlight,
	PdfHighlighter,
	PdfLoader,
	Tip,
} from "react-pdf-highlighter";
import "react-pdf-highlighter/dist/style.css";

import { getDocumentPdfUrl } from "#/lib/api";

const MAX_HIGHLIGHT_PAGES = 24;

export type PdfHighlightRange = {
	id: string;
	pageStart: number;
	pageEnd: number;
	snippet?: string;
	nodeTitle?: string;
};

type PdfViewerProps = {
	documentId: string;
	highlightRanges: Array<PdfHighlightRange>;
	compact?: boolean;
};

function normalizeRange(pageStart: number, pageEnd: number): [number, number] {
	const start = Math.max(1, Math.floor(pageStart));
	const end = Math.max(start, Math.floor(pageEnd));
	return [start, end];
}

function buildHighlights(ranges: Array<PdfHighlightRange>): Array<IHighlight> {
	const highlights: Array<IHighlight> = [];

	for (const range of ranges) {
		const [start, end] = normalizeRange(range.pageStart, range.pageEnd);
		for (
			let pageNumber = start;
			pageNumber <= end && highlights.length < MAX_HIGHLIGHT_PAGES;
			pageNumber += 1
		) {
			highlights.push({
				id: `${range.id}:${pageNumber}`,
				position: {
					pageNumber,
					boundingRect: {
						x1: 0,
						y1: 0,
						x2: 1,
						y2: 1,
						width: 1,
						height: 1,
						pageNumber,
					},
					rects: [
						{
							x1: 0,
							y1: 0,
							x2: 1,
							y2: 1,
							width: 1,
							height: 1,
							pageNumber,
						},
					],
				},
				content: {
					text: range.snippet?.trim() || `Evidence for page ${pageNumber}`,
				},
				comment: {
					text: range.nodeTitle || `Evidence pages ${start}-${end}`,
					emoji: "",
				},
			});
		}
	}

	return highlights;
}

export function PdfViewer({
	documentId,
	highlightRanges,
	compact = false,
}: PdfViewerProps) {
	const pdfUrl = getDocumentPdfUrl(documentId);
	const highlights = useMemo(
		() => buildHighlights(highlightRanges),
		[highlightRanges],
	);

	const highlightTransform: ComponentProps<
		typeof PdfHighlighter<IHighlight>
	>["highlightTransform"] = (
		highlight,
		_index,
		setTip,
		_hideTip,
		_viewportToScaled,
		_screenshot,
		isScrolledTo,
	) => {
		return (
			<Highlight
				position={highlight.position}
				onClick={() => {
					setTip(highlight, () => (
						<Tip onOpen={() => {}} onConfirm={() => {}} />
					));
				}}
				comment={highlight.comment}
				isScrolledTo={isScrolledTo}
			/>
		);
	};

	return (
		<div
			className={`h-full w-full ${compact ? "overflow-hidden rounded-md" : ""}`}
		>
			<PdfLoader url={pdfUrl} beforeLoad={<div>Loading PDF...</div>}>
				{(pdfDocument) => (
					<PdfHighlighter
						pdfDocument={pdfDocument}
						enableAreaSelection={() => false}
						onScrollChange={() => {}}
						ref={() => {}}
						scrollRef={() => {}}
						highlights={highlights}
						highlightTransform={highlightTransform}
						onSelectionFinished={() => null}
					/>
				)}
			</PdfLoader>
		</div>
	);
}
