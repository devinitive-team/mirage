let pdfJsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

export async function loadPdfJs(): Promise<typeof import("pdfjs-dist")> {
	if (!pdfJsPromise) {
		pdfJsPromise = Promise.all([
			import("pdfjs-dist"),
			import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
		])
			.then(([pdfjs, workerModule]) => {
				if (pdfjs.GlobalWorkerOptions.workerSrc !== workerModule.default) {
					pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
				}
				return pdfjs;
			})
			.catch((error) => {
				pdfJsPromise = null;
				throw error;
			});
	}

	return pdfJsPromise;
}
