import { useEffect, useMemo, useState } from "react";

import { getDocumentPdfUrl } from "#/lib/api";
import { loadPdfJs } from "#/lib/pdfjs";

type PdfJsModule = typeof import("pdfjs-dist");
type PdfDocumentProxy = Awaited<
	ReturnType<PdfJsModule["getDocument"]>["promise"]
>;
type PdfPageProxy = Awaited<ReturnType<PdfDocumentProxy["getPage"]>>;
type PdfRenderTask = ReturnType<PdfPageProxy["render"]>;

const DEFAULT_PAGE_SCALE = 1.5;
const COMPACT_PAGE_SCALE = 1.15;

type MatchableTextItem = {
	str: string;
};

type PositionedTextItem = MatchableTextItem & {
	left: number;
	top: number;
	width: number;
	height: number;
};

type HighlightRect = {
	leftPct: number;
	topPct: number;
	widthPct: number;
	heightPct: number;
};

export type PdfHighlightRange = {
	id: string;
	pageStart: number;
	pageEnd: number;
	nodeTitle?: string;
};

type PdfViewerProps = {
	documentId: string;
	highlightRanges: Array<PdfHighlightRange>;
	compact?: boolean;
	visiblePageNumbers?: Array<number>;
};

export function normalizePageRange(
	pageStart: number,
	pageEnd: number,
): [number, number] {
	const start = Math.max(1, Math.floor(pageStart));
	const end = Math.max(start, Math.floor(pageEnd));
	return [start, end];
}

function normalizePageNumber(pageNumber: number): number | null {
	if (!Number.isFinite(pageNumber)) return null;
	const normalized = Math.floor(pageNumber);
	return normalized < 1 ? null : normalized;
}

export function resolvePagesToRender(
	totalPages: number,
	visiblePageNumbers?: Array<number>,
): Array<number> {
	const safeTotalPages =
		Number.isFinite(totalPages) && totalPages > 0 ? Math.floor(totalPages) : 0;
	if (safeTotalPages < 1) return [];

	const hasPageSelection =
		Array.isArray(visiblePageNumbers) && visiblePageNumbers.length > 0;
	if (!hasPageSelection) {
		return Array.from({ length: safeTotalPages }, (_, index) => index + 1);
	}

	const dedupedPages = new Set<number>();
	for (const pageNumber of visiblePageNumbers) {
		const normalizedPageNumber = normalizePageNumber(pageNumber);
		if (!normalizedPageNumber) continue;
		if (normalizedPageNumber > safeTotalPages) continue;
		dedupedPages.add(normalizedPageNumber);
	}

	return Array.from(dedupedPages).sort((left, right) => left - right);
}

function normalizeTextWithSourceMap(input: string): {
	text: string;
	sourceIndexes: Array<number>;
} {
	let text = "";
	const sourceIndexes: Array<number> = [];
	let pendingWhitespaceIndex: number | null = null;

	for (let index = 0; index < input.length; index += 1) {
		const character = input[index];
		if (character.trim().length === 0) {
			if (text.length > 0 && pendingWhitespaceIndex === null) {
				pendingWhitespaceIndex = index;
			}
			continue;
		}

		if (pendingWhitespaceIndex !== null) {
			text += " ";
			sourceIndexes.push(pendingWhitespaceIndex);
			pendingWhitespaceIndex = null;
		}

		text += character.toLowerCase();
		sourceIndexes.push(index);
	}

	return { text, sourceIndexes };
}

function normalizeText(input: string): string {
	return normalizeTextWithSourceMap(input).text;
}

function buildJoinedText(items: Array<MatchableTextItem>): {
	text: string;
	sourceToItemIndex: Array<number>;
} {
	let text = "";
	const sourceToItemIndex: Array<number> = [];

	items.forEach((item, index) => {
		if (index > 0) {
			text += " ";
			sourceToItemIndex.push(-1);
		}
		for (const character of item.str) {
			text += character;
			sourceToItemIndex.push(index);
		}
	});

	return { text, sourceToItemIndex };
}

export function findSnippetItemIndexes(
	items: Array<MatchableTextItem>,
	snippet: string,
): Array<number> {
	const normalizedSnippet = normalizeText(snippet.trim());
	if (!normalizedSnippet) return [];
	if (items.length === 0) return [];

	const { text: joinedText, sourceToItemIndex } = buildJoinedText(items);
	const normalizedTextMap = normalizeTextWithSourceMap(joinedText);
	const matchStart = normalizedTextMap.text.indexOf(normalizedSnippet);
	if (matchStart < 0) return [];

	const matchEnd = matchStart + normalizedSnippet.length - 1;
	const sourceStart = normalizedTextMap.sourceIndexes[matchStart];
	const sourceEnd = normalizedTextMap.sourceIndexes[matchEnd];
	if (sourceStart === undefined || sourceEnd === undefined) return [];

	const itemIndexes = new Set<number>();
	for (let index = sourceStart; index <= sourceEnd; index += 1) {
		const itemIndex = sourceToItemIndex[index];
		if (itemIndex !== undefined && itemIndex >= 0) {
			itemIndexes.add(itemIndex);
		}
	}

	return Array.from(itemIndexes).sort((left, right) => left - right);
}

function getRangeSnippet(range: PdfHighlightRange): string | null {
	const candidate = range as PdfHighlightRange & { snippet?: unknown };
	if (typeof candidate.snippet !== "string") return null;
	const snippet = candidate.snippet.trim();
	return snippet.length > 0 ? snippet : null;
}

function rangeIncludesPage(
	range: PdfHighlightRange,
	pageNumber: number,
): boolean {
	const [start, end] = normalizePageRange(range.pageStart, range.pageEnd);
	return pageNumber >= start && pageNumber <= end;
}

function getRangesForPage(
	ranges: Array<PdfHighlightRange>,
	pageNumber: number,
): Array<PdfHighlightRange> {
	return ranges.filter((range) => rangeIncludesPage(range, pageNumber));
}

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(maximum, Math.max(minimum, value));
}

function dedupeRects(rects: Array<HighlightRect>): Array<HighlightRect> {
	const seen = new Set<string>();
	const uniqueRects: Array<HighlightRect> = [];

	for (const rect of rects) {
		const key = `${rect.leftPct.toFixed(3)}:${rect.topPct.toFixed(3)}:${rect.widthPct.toFixed(3)}:${rect.heightPct.toFixed(3)}`;
		if (seen.has(key)) continue;
		seen.add(key);
		uniqueRects.push(rect);
	}

	return uniqueRects;
}

function isTextContentItem(item: unknown): item is {
	str: string;
	transform: Array<number>;
	width: number;
	height: number;
} {
	if (!item || typeof item !== "object") return false;
	const candidate = item as Partial<{
		str: string;
		transform: Array<number>;
		width: number;
		height: number;
	}>;
	return (
		typeof candidate.str === "string" &&
		Array.isArray(candidate.transform) &&
		candidate.transform.length >= 6 &&
		typeof candidate.width === "number" &&
		typeof candidate.height === "number"
	);
}

function toPositionedTextItems(
	textContentItems: Array<unknown>,
	viewportHeight: number,
): Array<PositionedTextItem> {
	const positionedItems: Array<PositionedTextItem> = [];

	for (const item of textContentItems) {
		if (!isTextContentItem(item)) continue;
		if (item.str.length === 0) continue;

		const transformHeight = item.transform[3] ?? 0;
		const left = item.transform[4] ?? 0;
		const baselineY = item.transform[5] ?? 0;
		const width = Math.max(0, item.width);
		const height = Math.max(Math.abs(item.height), Math.abs(transformHeight));
		const top = viewportHeight - baselineY - height;
		if (
			!Number.isFinite(left) ||
			!Number.isFinite(top) ||
			!Number.isFinite(width) ||
			!Number.isFinite(height)
		) {
			continue;
		}

		positionedItems.push({
			str: item.str,
			left,
			top,
			width,
			height,
		});
	}

	return positionedItems;
}

function toHighlightRect(
	item: PositionedTextItem,
	viewportWidth: number,
	viewportHeight: number,
): HighlightRect | null {
	if (viewportWidth <= 0 || viewportHeight <= 0) return null;
	if (item.width <= 0 || item.height <= 0) return null;

	const leftPct = clamp((item.left / viewportWidth) * 100, 0, 100);
	const topPct = clamp((item.top / viewportHeight) * 100, 0, 100);
	const widthPct = clamp((item.width / viewportWidth) * 100, 0, 100 - leftPct);
	const heightPct = clamp(
		(item.height / viewportHeight) * 100,
		0,
		100 - topPct,
	);
	if (widthPct <= 0 || heightPct <= 0) return null;

	return { leftPct, topPct, widthPct, heightPct };
}

function getErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.length > 0) {
		return error.message;
	}
	return fallback;
}

function isTaskCancelled(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;
	const value = error as Partial<{ name: string }>;
	return (
		value.name === "AbortException" ||
		value.name === "RenderingCancelledException"
	);
}

type PdfPageProps = {
	pdfDocument: PdfDocumentProxy;
	pageNumber: number;
	highlightRanges: Array<PdfHighlightRange>;
	compact: boolean;
};

function PdfPage({
	pdfDocument,
	pageNumber,
	highlightRanges,
	compact,
}: PdfPageProps) {
	const [textRects, setTextRects] = useState<Array<HighlightRect>>([]);
	const [showFallbackOverlay, setShowFallbackOverlay] = useState(false);
	const [renderError, setRenderError] = useState<string | null>(null);

	const rangesForPage = useMemo(
		() => getRangesForPage(highlightRanges, pageNumber),
		[highlightRanges, pageNumber],
	);
	const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(
		null,
	);

	useEffect(() => {
		if (!canvasElement) return;
		let cancelled = false;
		let renderTask: PdfRenderTask | null = null;

		const renderPage = async () => {
			try {
				const page = await pdfDocument.getPage(pageNumber);
				if (cancelled) return;

				const viewport = page.getViewport({
					scale: compact ? COMPACT_PAGE_SCALE : DEFAULT_PAGE_SCALE,
				});
				const context = canvasElement.getContext("2d");
				if (!context) {
					throw new Error("Canvas 2D context is unavailable.");
				}

				canvasElement.width = Math.ceil(viewport.width);
				canvasElement.height = Math.ceil(viewport.height);
				canvasElement.style.width = "100%";
				canvasElement.style.height = "auto";
				context.clearRect(0, 0, canvasElement.width, canvasElement.height);

				renderTask = page.render({
					canvas: canvasElement,
					canvasContext: context,
					viewport,
				});
				await renderTask.promise;
				if (cancelled) return;

				if (rangesForPage.length === 0) {
					setTextRects([]);
					setShowFallbackOverlay(false);
					setRenderError(null);
					return;
				}

				const textContent = await page.getTextContent();
				if (cancelled) return;

				const positionedItems = toPositionedTextItems(
					textContent.items as Array<unknown>,
					viewport.height,
				);
				const matchableItems = positionedItems.map((item) => ({
					str: item.str,
				}));
				const nextTextRects: Array<HighlightRect> = [];
				let hasFallbackOverlay = false;

				for (const range of rangesForPage) {
					const snippet = getRangeSnippet(range);
					if (!snippet) {
						hasFallbackOverlay = true;
						continue;
					}

					const matchedIndexes = findSnippetItemIndexes(
						matchableItems,
						snippet,
					);
					if (matchedIndexes.length === 0) {
						hasFallbackOverlay = true;
						continue;
					}

					for (const itemIndex of matchedIndexes) {
						const matchedItem = positionedItems[itemIndex];
						if (!matchedItem) continue;
						const highlightRect = toHighlightRect(
							matchedItem,
							viewport.width,
							viewport.height,
						);
						if (highlightRect) {
							nextTextRects.push(highlightRect);
						}
					}
				}

				setTextRects(dedupeRects(nextTextRects));
				setShowFallbackOverlay(hasFallbackOverlay);
				setRenderError(null);
			} catch (error) {
				if (cancelled || isTaskCancelled(error)) return;
				setTextRects([]);
				setShowFallbackOverlay(false);
				setRenderError(getErrorMessage(error, "Unable to render page."));
			}
		};

		void renderPage();

		return () => {
			cancelled = true;
			if (renderTask) {
				renderTask.cancel();
			}
		};
	}, [canvasElement, compact, pageNumber, pdfDocument, rangesForPage]);

	return (
		<div className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-2 shadow-sm">
			<div className="pb-2 text-xs font-medium text-[var(--muted-foreground)]">
				Page {pageNumber}
			</div>
			<div className="relative">
				<canvas
					ref={setCanvasElement}
					className="block w-full rounded-sm border border-[var(--line)] bg-white"
				/>
				{showFallbackOverlay ? (
					<div className="pointer-events-none absolute inset-0 rounded-sm bg-amber-300/20" />
				) : null}
				{textRects.map((rect, index) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: Page text items do not have stable ids.
						key={`${pageNumber}-${index}`}
						className="pointer-events-none absolute rounded-[2px] bg-amber-200/80"
						style={{
							left: `${rect.leftPct}%`,
							top: `${rect.topPct}%`,
							width: `${rect.widthPct}%`,
							height: `${rect.heightPct}%`,
						}}
					/>
				))}
			</div>
			{renderError ? (
				<div className="pt-2 text-xs text-red-700">{renderError}</div>
			) : null}
		</div>
	);
}

export function PdfViewer({
	documentId,
	highlightRanges,
	compact = false,
	visiblePageNumbers,
}: PdfViewerProps) {
	const pdfUrl = getDocumentPdfUrl(documentId);
	const [pdfDocument, setPdfDocument] = useState<PdfDocumentProxy | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [numPages, setNumPages] = useState(0);

	useEffect(() => {
		let cancelled = false;
		let loadingTask: ReturnType<PdfJsModule["getDocument"]> | null = null;
		let nextDocument: PdfDocumentProxy | null = null;

		setPdfDocument(null);
		setNumPages(0);
		setIsLoading(true);
		setLoadError(null);

		const loadDocument = async () => {
			try {
				const pdfjs = await loadPdfJs();
				if (cancelled) return;

				loadingTask = pdfjs.getDocument(pdfUrl);
				nextDocument = await loadingTask.promise;
				if (cancelled) {
					await nextDocument.destroy();
					return;
				}

				setPdfDocument(nextDocument);
				setNumPages(nextDocument.numPages);
				setIsLoading(false);
			} catch (error) {
				if (cancelled || isTaskCancelled(error)) return;
				setLoadError(getErrorMessage(error, "Unable to load PDF."));
				setIsLoading(false);
			}
		};

		void loadDocument();

		return () => {
			cancelled = true;
			if (loadingTask) {
				void loadingTask.destroy();
			}
			if (nextDocument) {
				void nextDocument.destroy();
			}
		};
	}, [pdfUrl]);

	const pagesToRender = useMemo(
		() => resolvePagesToRender(numPages, visiblePageNumbers),
		[numPages, visiblePageNumbers],
	);
	const hasExplicitSelection =
		Array.isArray(visiblePageNumbers) && visiblePageNumbers.length > 0;

	return (
		<div
			className={`h-full min-h-0 w-full overflow-hidden ${compact ? "rounded-md" : ""}`}
		>
			{isLoading ? (
				<div className="p-4 text-sm text-[var(--muted-foreground)]">
					Loading PDF...
				</div>
			) : loadError ? (
				<div className="p-4 text-sm text-red-700">{loadError}</div>
			) : !pdfDocument ? (
				<div className="p-4 text-sm text-red-700">
					PDF document not available.
				</div>
			) : pagesToRender.length === 0 ? (
				<div className="p-4 text-sm text-[var(--muted-foreground)]">
					{hasExplicitSelection
						? "No selected pages were available in this PDF."
						: "This PDF has no pages to render."}
				</div>
			) : (
				<div className="h-full min-h-0 overflow-y-auto p-4">
					<div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
						{pagesToRender.map((pageNumber) => (
							<PdfPage
								key={pageNumber}
								pdfDocument={pdfDocument}
								pageNumber={pageNumber}
								highlightRanges={highlightRanges}
								compact={compact}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
