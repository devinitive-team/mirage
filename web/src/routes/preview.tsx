import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
	type IHighlight,
	PdfHighlighter,
	PdfLoader,
	Tip,
} from "react-pdf-highlighter";
import "react-pdf-highlighter/dist/style.css";

export const Route = createFileRoute("/preview")({ component: PreviewPage });

function PreviewPage() {
	const pdfUrl = "/example.pdf";
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
				rects: [[350.44, 769.12, 508.08, 788.16]] as any,
			},
			content: {
				text: "three long minutes",
			},
			comment: { text: "Highlighted text", emoji: "" },
		},
	]);

	const addHighlight = (highlight: IHighlight) => {
		setHighlights((prev) => [highlight, ...prev]);
	};

	const highlightTransform = (highlight: IHighlight, _index: number) => {
		return {
			component: <></>,
			position: highlight.position,
			content: highlight.content,
		};
	};

	return (
		<main className="page-wrap px-4 pb-8 pt-14">
			<h1>Preview</h1>
			<div
				style={{
					height: "100vh",
					width: "75vw",
					position: "relative",
				}}
			>
				<PdfLoader url={pdfUrl} beforeLoad={<div>Loading PDF...</div>}>
					{(pdfDocument) => (
						<PdfHighlighter
							pdfDocument={pdfDocument}
							enableAreaSelection={(event) => event.altKey}
							onScrollChange={() => {}}
							ref={() => {}}
							scrollRef={() => {}}
							highlights={highlights}
							highlightTransform={highlightTransform}
							onSelectionFinished={(position, content, hideTipAndSelection) => (
								<Tip
									onOpen={() => {}}
									onConfirm={(comment) => {
										addHighlight({ content, position, comment } as IHighlight);
										hideTipAndSelection();
									}}
								/>
							)}
						/>
					)}
				</PdfLoader>
			</div>
		</main>
	);
}
