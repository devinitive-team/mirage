import { describe, expect, it } from "vitest";

import {
	normalizePageRange,
	resolvePagesToRender,
} from "#/lib/pdfPageSelection";

describe("pdfPageSelection", () => {
	it("normalizes page ranges to positive ascending integers", () => {
		expect(normalizePageRange(0.2, -5.6)).toStrictEqual([1, 1]);
		expect(normalizePageRange(8.9, 3.1)).toStrictEqual([8, 8]);
		expect(normalizePageRange(2.4, 5.9)).toStrictEqual([2, 5]);
	});

	it("renders all pages when no visible page list is provided", () => {
		expect(resolvePagesToRender(4)).toStrictEqual([1, 2, 3, 4]);
		expect(resolvePagesToRender(4, [])).toStrictEqual([1, 2, 3, 4]);
	});

	it("renders only valid selected pages when visible pages are provided", () => {
		expect(resolvePagesToRender(6, [5, 2, 2, 0, -1, 9, 3.8])).toStrictEqual([
			2, 3, 5,
		]);
	});

	it("returns an empty list for explicit selection with no valid pages", () => {
		expect(resolvePagesToRender(3, [0, -1, 99])).toStrictEqual([]);
	});
});
