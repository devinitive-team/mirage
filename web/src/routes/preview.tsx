import { createFileRoute } from "@tanstack/react-router";
import { type ComponentProps, useRef, useState } from "react";
import {
	Highlight,
	type IHighlight,
	PdfHighlighter,
	PdfLoader,
	Tip,
} from "react-pdf-highlighter";
import "react-pdf-highlighter/dist/style.css";
import { getDocumentPdfUrl } from "#/lib/api";

export const Route = createFileRoute("/preview")({
	validateSearch: (search: Record<string, unknown>) => ({
		documentId:
			typeof search.documentId === "string" ? search.documentId.trim() : "",
	}),
	component: PreviewPage,
});

function PreviewPage() {
	const { documentId } = Route.useSearch();
	const nextHighlightIdRef = useRef(2);
	const [highlights, setHighlights] = useState<Array<IHighlight>>([
		{
			id: "1",
			position: {
				pageNumber: 1,
				boundingRect: {
					x1: 350.44,
					y1: 769.12,
					x2: 508.08,
					y2: 788.16,
					width: 157.64,
					height: 19.04,
				},
				rects: [
					{
						x1: 350.44,
						y1: 769.12,
						x2: 508.08,
						y2: 788.16,
						width: 157.64,
						height: 19.04,
					},
				],
			},
			content: {
				text: "three long minutes",
			},
			comment: { text: "Highlighted text", emoji: "" },
		},
	]);

	const addHighlight = (highlight: Omit<IHighlight, "id">) => {
		setHighlights((prev) => [
			{ ...highlight, id: String(nextHighlightIdRef.current++) },
			...prev,
		]);
	};

	type HighlightTransform = NonNullable<
		ComponentProps<typeof PdfHighlighter<IHighlight>>["highlightTransform"]
	>;
	type OnSelectionFinished = NonNullable<
		ComponentProps<typeof PdfHighlighter<IHighlight>>["onSelectionFinished"]
	>;

	const highlightTransform: HighlightTransform = (
		highlight,
		_index,
		setTip,
		_hideTipAndSelection,
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

	const onSelectionFinished: OnSelectionFinished = (
		position,
		content,
		hideTipAndSelection,
	) => (
		<Tip
			onOpen={() => {}}
			onConfirm={(comment) => {
				addHighlight({ content, position, comment });
				hideTipAndSelection();
			}}
		/>
	);

	return (
		<main className="page-wrap px-4 pb-8 pt-14">
			<h1>Preview</h1>
			{!documentId ? (
				<div className="mt-3 text-sm text-[var(--sea-ink-soft)]">
					Add a document id in the URL, for example:
					<code className="ml-1">/preview?documentId=YOUR_DOCUMENT_ID</code>
				</div>
			) : null}
			<div
				style={{
					height: "100vh",
					width: "75vw",
					position: "relative",
				}}
			>
				{documentId ? (
					<PdfLoader
						url={getDocumentPdfUrl(documentId)}
						beforeLoad={<div>Loading PDF...</div>}
					>
						{(pdfDocument) => (
							<PdfHighlighter
								pdfDocument={pdfDocument}
								enableAreaSelection={(event) => event.altKey}
								onScrollChange={() => {}}
								ref={() => {}}
								scrollRef={() => {}}
								highlights={highlights}
								highlightTransform={highlightTransform}
								onSelectionFinished={onSelectionFinished}
							/>
						)}
					</PdfLoader>
				) : (
					<div className="p-4">No document selected.</div>
				)}
			</div>
		</main>
	);
}
