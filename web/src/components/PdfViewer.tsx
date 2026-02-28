import { useState } from "react";
import {
	Highlight,
	type IHighlight,
	PdfHighlighter,
	PdfLoader,
	Tip,
} from "react-pdf-highlighter";
import "react-pdf-highlighter/dist/style.css";

const pdfUrl = "/example.pdf";

type PdfViewerProps = {
	documentName: string;
	pageNumber: number;
	searchPhrase: string;
};

function createDefaultHighlights({
	pageNumber,
	searchPhrase,
	documentName,
}: PdfViewerProps): Array<IHighlight> {
	return [
		{
			id: "1",
			position: {
				pageNumber,
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
				text: searchPhrase,
			},
			comment: { text: `Preview for ${documentName}`, emoji: "" },
		},
	];
}

export function PdfViewer({
	documentName,
	pageNumber,
	searchPhrase,
}: PdfViewerProps) {
	const [highlights, setHighlights] = useState<Array<IHighlight>>(
		createDefaultHighlights({ documentName, pageNumber, searchPhrase }),
	);

	const addHighlight = (highlight: IHighlight) => {
		setHighlights((prev) => [highlight, ...prev]);
	};

	const highlightTransform = (
		highlight: unknown,
		_index: number,
		setTip: (
			highlight: unknown,
			callback: (highlight: unknown) => React.JSX.Element,
		) => void,
		_hideTipAndSelection: () => void,
		_viewportToScaled: (rect: unknown) => unknown,
		_screenshot: (position: unknown) => string,
		isScrolledTo: boolean,
	) => {
		return (
			<Highlight
				position={(highlight as IHighlight).position}
				onClick={() => {
					setTip(highlight, () => (
						<Tip onOpen={() => {}} onConfirm={() => {}} />
					));
				}}
				comment={(highlight as IHighlight).comment}
				isScrolledTo={isScrolledTo}
			/>
		);
	};

	return (
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
	);
}
