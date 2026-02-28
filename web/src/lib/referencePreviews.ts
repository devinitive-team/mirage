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
		if (pdfDocument.numPages < 1) return null;

		const pageNumber = randomIntInclusive(1, pdfDocument.numPages, random);
		const area = buildRandomReferenceArea(pageNumber, random);
		return {
			pageNumber,
			area,
			areaLabel: formatAreaLabel(area),
		};
	} finally {
		await loadingTask.destroy();
	}
}
