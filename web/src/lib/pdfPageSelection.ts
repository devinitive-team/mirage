function normalizePageNumber(pageNumber: number): number | null {
	if (!Number.isFinite(pageNumber)) return null;
	const normalized = Math.floor(pageNumber);
	return normalized < 1 ? null : normalized;
}

export function normalizePageRange(
	pageStart: number,
	pageEnd: number,
): [number, number] {
	const start = Math.max(1, Math.floor(pageStart));
	const end = Math.max(start, Math.floor(pageEnd));
	return [start, end];
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
