import { useEffect, useMemo, useState } from "react";

import { getDocumentPdfUrl } from "#/lib/api";
import {
	dedupeRects,
	findSnippetItemIndexes,
	getRangeSnippet,
	getRangesForPage,
	toHighlightRect,
	toPositionedTextItems,
	type HighlightRect,
	type PdfHighlightRange,
} from "#/lib/pdfHighlighting";
import { resolvePagesToRender } from "#/lib/pdfPageSelection";
import { loadPdfJs } from "#/lib/pdfjs";

type PdfJsModule = typeof import("pdfjs-dist");
type PdfDocumentProxy = Awaited<
	ReturnType<PdfJsModule["getDocument"]>["promise"]
>;
type PdfPageProxy = Awaited<ReturnType<PdfDocumentProxy["getPage"]>>;
type PdfRenderTask = ReturnType<PdfPageProxy["render"]>;

const DEFAULT_PAGE_SCALE = 1.5;
const COMPACT_PAGE_SCALE = 1.15;

export type { PdfHighlightRange } from "#/lib/pdfHighlighting";

type PdfViewerProps = {
	documentId: string;
	highlightRanges: Array<PdfHighlightRange>;
	compact?: boolean;
	visiblePageNumbers?: Array<number>;
};

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
