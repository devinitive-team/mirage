import type { PDFDocumentProxy } from "pdfjs-dist";

type RandomSource = () => number;

let pdfJsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

export type RandomReferenceArea = {
	pageNumber: number;
	xRatio: number;
	yRatio: number;
	widthRatio: number;
	heightRatio: number;
};

export type RandomReferencePreview = {
	pageNumber: number;
	area: RandomReferenceArea;
	areaLabel: string;
	imageDataUrl: string;
};

function randomFloat(min: number, max: number, random: RandomSource): number {
	if (max <= min) return min;
	return min + random() * (max - min);
}

function randomIntInclusive(
	min: number,
	max: number,
	random: RandomSource,
): number {
	if (max <= min) return min;
	return min + Math.floor(random() * (max - min + 1));
}

function isPdfFile(file: File): boolean {
	return (
		file.type.toLowerCase() === "application/pdf" ||
		file.name.toLowerCase().endsWith(".pdf")
	);
}

function buildShuffledPageNumbers(
	totalPages: number,
	random: RandomSource,
): number[] {
	const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
	for (let i = pages.length - 1; i > 0; i -= 1) {
		const swapIndex = randomIntInclusive(0, i, random);
		const currentPage = pages[i];
		pages[i] = pages[swapIndex];
		pages[swapIndex] = currentPage;
	}
	return pages;
}

async function loadPdfJs(): Promise<typeof import("pdfjs-dist")> {
	if (!pdfJsPromise) {
		pdfJsPromise = Promise.all([
			import("pdfjs-dist"),
			import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
		]).then(([pdfjs, workerModule]) => {
			pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
			return pdfjs;
		});
	}

	return pdfJsPromise;
}

async function renderPageToCanvas(
	pdfDocument: PDFDocumentProxy,
	pageNumber: number,
): Promise<HTMLCanvasElement | null> {
	const page = await pdfDocument.getPage(pageNumber);
	const viewport = page.getViewport({ scale: 1.35 });
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.floor(viewport.width));
	canvas.height = Math.max(1, Math.floor(viewport.height));

	const context = canvas.getContext("2d", { alpha: false });
	if (!context) return null;

	await page.render({ canvasContext: context, viewport }).promise;
	return canvas;
}

function toPercentLabel(ratio: number): number {
	return Math.round(ratio * 100);
}

export function formatAreaLabel(area: RandomReferenceArea): string {
	return (
		`Page ${area.pageNumber} - area ` +
		`x ${toPercentLabel(area.xRatio)}%, ` +
		`y ${toPercentLabel(area.yRatio)}%, ` +
		`w ${toPercentLabel(area.widthRatio)}%, ` +
		`h ${toPercentLabel(area.heightRatio)}%`
	);
}

export function buildRandomReferenceArea(
	pageNumber: number,
	random: RandomSource = Math.random,
): RandomReferenceArea {
	const widthRatio = randomFloat(0.38, 0.62, random);
	const heightRatio = randomFloat(0.2, 0.38, random);
	const maxX = Math.max(0, 1 - widthRatio);
	const maxY = Math.max(0, 1 - heightRatio);
	const xRatio = randomFloat(0, maxX, random);
	const yRatio = randomFloat(0, maxY, random);

	return {
		pageNumber,
		xRatio,
		yRatio,
		widthRatio,
		heightRatio,
	};
}

function cropAreaToDataUrl(
	pageCanvas: HTMLCanvasElement,
	area: RandomReferenceArea,
): string {
	const x = Math.floor(area.xRatio * pageCanvas.width);
	const y = Math.floor(area.yRatio * pageCanvas.height);
	const width = Math.max(1, Math.floor(area.widthRatio * pageCanvas.width));
	const height = Math.max(1, Math.floor(area.heightRatio * pageCanvas.height));
	const boundedWidth = Math.max(1, Math.min(width, pageCanvas.width - x));
	const boundedHeight = Math.max(1, Math.min(height, pageCanvas.height - y));

	const croppedCanvas = document.createElement("canvas");
	croppedCanvas.width = boundedWidth;
	croppedCanvas.height = boundedHeight;
	const croppedContext = croppedCanvas.getContext("2d", { alpha: false });
	if (!croppedContext) return "";

	croppedContext.drawImage(
		pageCanvas,
		x,
		y,
		boundedWidth,
		boundedHeight,
		0,
		0,
		boundedWidth,
		boundedHeight,
	);

	return croppedCanvas.toDataURL("image/jpeg", 0.86);
}

export async function buildRandomReferenceFromPdfFile(
	file: File,
	random: RandomSource = Math.random,
): Promise<RandomReferencePreview | null> {
	if (!isPdfFile(file)) return null;

	const pdfjs = await loadPdfJs();
	const fileBuffer = await file.arrayBuffer();
	const loadingTask = pdfjs.getDocument({
		data: new Uint8Array(fileBuffer),
	});

	try {
		const pdfDocument = await loadingTask.promise;
		const pageNumbers = buildShuffledPageNumbers(pdfDocument.numPages, random);

		for (const pageNumber of pageNumbers) {
			const pageCanvas = await renderPageToCanvas(pdfDocument, pageNumber);
			if (!pageCanvas) continue;

			const area = buildRandomReferenceArea(pageNumber, random);
			const imageDataUrl = cropAreaToDataUrl(pageCanvas, area);
			if (!imageDataUrl) continue;

			return {
				pageNumber,
				area,
				areaLabel: formatAreaLabel(area),
				imageDataUrl,
			};
		}

		return null;
	} finally {
		await loadingTask.destroy();
	}
}
