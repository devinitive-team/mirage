import { FileText } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";

import { getDocumentPdfUrl } from "#/lib/api";
import { loadPdfJs } from "#/lib/pdfjs";

type PdfJsModule = typeof import("pdfjs-dist");
type PdfDocumentProxy = Awaited<
	ReturnType<PdfJsModule["getDocument"]>["promise"]
>;
type PdfPageProxy = Awaited<ReturnType<PdfDocumentProxy["getPage"]>>;
type PdfRenderTask = ReturnType<PdfPageProxy["render"]>;

const THUMBNAIL_PAGE_WIDTH = 260;
const MAX_STACK_DEPTH = 3;
const STACK_OFFSET_PX = 10;

export type ReferenceListItemData = {
	id: string;
	documentId: string;
	documentName: string;
	nodeId: string;
	nodeTitle: string;
	pageStart: number;
	pageEnd: number;
};

export type GroupedReferenceListItemData = {
	id: string;
	documentId: string;
	documentName: string;
	evidence: ReferenceListItemData[];
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

function toEvidenceSortValue(reference: ReferenceListItemData): string {
	return `${String(reference.pageStart).padStart(6, "0")}:${String(
		reference.pageEnd,
	).padStart(6, "0")}:${reference.nodeTitle}`;
}

export function groupReferencesByDocument(
	references: ReferenceListItemData[],
): GroupedReferenceListItemData[] {
	const groupedByDocument = new Map<string, GroupedReferenceListItemData>();

	for (const reference of references) {
		const existingGroup = groupedByDocument.get(reference.documentId);
		if (existingGroup) {
			existingGroup.evidence.push(reference);
			continue;
		}

		groupedByDocument.set(reference.documentId, {
			id: `document-group:${reference.documentId}`,
			documentId: reference.documentId,
			documentName: reference.documentName,
			evidence: [reference],
		});
	}

	return Array.from(groupedByDocument.values()).map((group) => ({
		...group,
		evidence: [...group.evidence].sort((left, right) =>
			toEvidenceSortValue(left).localeCompare(toEvidenceSortValue(right)),
		),
	}));
}

function toPageRangeLabel(reference: ReferenceListItemData): string {
	return reference.pageStart === reference.pageEnd
		? `Page ${reference.pageStart}`
		: `Pages ${reference.pageStart}-${reference.pageEnd}`;
}

type EvidenceThumbnailProps = {
	pdfDocument: PdfDocumentProxy | null;
	pageStart: number;
	pageEnd: number;
	isDocumentLoading: boolean;
	documentLoadError: string | null;
};

type PdfPageThumbnailProps = {
	pdfDocument: PdfDocumentProxy;
	pageNumber: number;
	showError: boolean;
};

function PdfPageThumbnail({
	pdfDocument,
	pageNumber,
	showError,
}: PdfPageThumbnailProps) {
	const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(
		null,
	);
	const [isRendering, setIsRendering] = useState(false);
	const [renderError, setRenderError] = useState<string | null>(null);

	useEffect(() => {
		if (!canvasElement || !pdfDocument) return;

		let cancelled = false;
		let renderTask: PdfRenderTask | null = null;

		setIsRendering(true);
		setRenderError(null);

		const renderPage = async () => {
			try {
				const page = await pdfDocument.getPage(pageNumber);
				if (cancelled) return;

				const initialViewport = page.getViewport({ scale: 1 });
				const scale = THUMBNAIL_PAGE_WIDTH / initialViewport.width;
				const viewport = page.getViewport({ scale });
				const context = canvasElement.getContext("2d");
				if (!context) {
					throw new Error("Canvas 2D context is unavailable.");
				}

				canvasElement.width = Math.ceil(viewport.width);
				canvasElement.height = Math.ceil(viewport.height);
				canvasElement.style.width = "100%";
				canvasElement.style.height = "100%";
				context.clearRect(0, 0, canvasElement.width, canvasElement.height);
				context.fillStyle = "#ffffff";
				context.fillRect(0, 0, canvasElement.width, canvasElement.height);

				renderTask = page.render({
					canvas: canvasElement,
					canvasContext: context,
					viewport,
				});
				await renderTask.promise;
				if (cancelled) return;

				setIsRendering(false);
				setRenderError(null);
			} catch (error) {
				if (cancelled || isTaskCancelled(error)) return;
				setIsRendering(false);
				setRenderError(
					getErrorMessage(error, "Unable to render page preview."),
				);
			}
		};

		void renderPage();

		return () => {
			cancelled = true;
			if (renderTask) {
				renderTask.cancel();
			}
		};
	}, [canvasElement, pageNumber, pdfDocument]);

	return (
		<>
			<canvas
				ref={setCanvasElement}
				className={`block h-full w-full bg-white ${isRendering ? "opacity-0" : "opacity-100"} transition-opacity duration-200`}
			/>
			{isRendering ? (
				<div className="absolute inset-0 animate-pulse bg-[var(--surface-strong)]/82" />
			) : null}
			{showError && renderError ? (
				<div className="absolute inset-0 flex items-center justify-center bg-[var(--surface-strong)]/82 px-2 text-center text-[11px] text-[var(--sea-ink-soft)]">
					{renderError}
				</div>
			) : null}
		</>
	);
}

function EvidenceThumbnail({
	pdfDocument,
	pageStart,
	pageEnd,
	isDocumentLoading,
	documentLoadError,
}: EvidenceThumbnailProps) {
	const stackedPageNumbers = useMemo(
		() =>
			Array.from(
				{
					length: Math.max(
						1,
						Math.min(MAX_STACK_DEPTH, pageEnd - pageStart + 1),
					),
				},
				(_, index) => pageStart + index,
			),
		[pageEnd, pageStart],
	);
	const stackOffset = (stackedPageNumbers.length - 1) * STACK_OFFSET_PX;
	const layeredPages = useMemo(
		() =>
			stackedPageNumbers.map((pageNumber, index) => ({ pageNumber, index })),
		[stackedPageNumbers],
	);

	return (
		<div
			className="relative w-full"
			style={{
				paddingRight: `${stackOffset}px`,
				paddingBottom: `${stackOffset}px`,
			}}
		>
			<div className="relative aspect-[3/4] w-full overflow-visible">
				{layeredPages
					.slice()
					.reverse()
					.map(({ pageNumber, index }) => {
						const offset = index * STACK_OFFSET_PX;
						const isFrontLayer = index === 0;
						return (
							<div
								key={pageNumber}
								className="absolute inset-0 overflow-hidden rounded-[10px] border border-[var(--line)] bg-white shadow-[0_1px_0_var(--inset-glint)_inset,0_10px_22px_rgba(17,17,17,0.14)]"
								style={{
									transform: `translate(${offset}px, ${offset}px)`,
									filter: isFrontLayer
										? undefined
										: "saturate(0.9) brightness(0.97)",
								}}
								aria-hidden={!isFrontLayer}
							>
								{isDocumentLoading ? (
									<div className="flex h-full items-center justify-center bg-[var(--surface-strong)]/80 px-2 text-center text-[11px] font-medium text-[var(--sea-ink-soft)]">
										Loading page preview...
									</div>
								) : documentLoadError ? (
									<div className="flex h-full flex-col items-center justify-center gap-1.5 px-2 text-center text-[11px] text-[var(--sea-ink-soft)]">
										<FileText className="h-4 w-4" />
										<p className="line-clamp-2">{documentLoadError}</p>
									</div>
								) : pdfDocument ? (
									<PdfPageThumbnail
										pdfDocument={pdfDocument}
										pageNumber={pageNumber}
										showError={isFrontLayer}
									/>
								) : null}
							</div>
						);
					})}
			</div>
		</div>
	);
}

type ReferenceListItemProps = {
	referenceGroup: GroupedReferenceListItemData;
	onPreview: (reference: ReferenceListItemData) => void;
};

export const ReferenceListItem = memo(function ReferenceListItem({
	referenceGroup,
	onPreview,
}: ReferenceListItemProps) {
	const pdfUrl = useMemo(
		() => getDocumentPdfUrl(referenceGroup.documentId),
		[referenceGroup.documentId],
	);
	const [pdfDocument, setPdfDocument] = useState<PdfDocumentProxy | null>(null);
	const [isDocumentLoading, setIsDocumentLoading] = useState(true);
	const [documentLoadError, setDocumentLoadError] = useState<string | null>(
		null,
	);

	useEffect(() => {
		let cancelled = false;
		let loadingTask: ReturnType<PdfJsModule["getDocument"]> | null = null;
		let nextDocument: PdfDocumentProxy | null = null;

		setPdfDocument(null);
		setIsDocumentLoading(true);
		setDocumentLoadError(null);

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
				setIsDocumentLoading(false);
			} catch (error) {
				if (cancelled || isTaskCancelled(error)) return;
				setIsDocumentLoading(false);
				setDocumentLoadError(
					getErrorMessage(error, "Unable to load document preview."),
				);
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

	const evidenceCount = referenceGroup.evidence.length;
	const evidenceCountLabel =
		evidenceCount === 1 ? "1 evidence hit" : `${evidenceCount} evidence hits`;

	return (
		<article className="reference-list-item rounded-xl p-3">
			<header className="flex items-start justify-between gap-3">
				<div className="min-w-0 flex items-center gap-2">
					<FileText className="reference-list-item__icon w-4 h-4 shrink-0" />
					<p className="reference-list-item__title truncate text-sm font-semibold">
						{referenceGroup.documentName}
					</p>
				</div>
				<span className="shrink-0 rounded-full border border-[var(--line)] bg-[var(--surface)]/70 px-2 py-0.5 text-[11px] font-medium text-[var(--sea-ink-soft)]">
					{evidenceCountLabel}
				</span>
			</header>

			<div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
				{referenceGroup.evidence.map((reference) => (
					<button
						type="button"
						key={reference.id}
						onClick={() => onPreview(reference)}
						aria-label={`Open preview for ${referenceGroup.documentName} ${toPageRangeLabel(reference)} ${reference.nodeTitle}`}
						className="reference-list-item__page group relative max-w-full rounded-lg border p-2 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--lagoon-deep)]/55 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lagoon)]"
					>
						<EvidenceThumbnail
							pdfDocument={pdfDocument}
							pageStart={reference.pageStart}
							pageEnd={reference.pageEnd}
							isDocumentLoading={isDocumentLoading}
							documentLoadError={documentLoadError}
						/>
						<div className="mt-2 space-y-0.5">
							<p className="text-[11px] font-semibold text-[var(--sea-ink)]">
								{toPageRangeLabel(reference)}
							</p>
							<p className="truncate text-[10px] text-[var(--sea-ink-soft)]">
								{reference.nodeTitle}
							</p>
						</div>
					</button>
				))}
			</div>
		</article>
	);
});
