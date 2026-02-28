import { describe, expect, it } from "vitest";

import {
	findSnippetItemIndexes,
	normalizePageRange,
	resolvePagesToRender,
} from "#/components/PdfViewer";

describe("PdfViewer helpers", () => {
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

	it("matches snippets across text items with case and whitespace normalization", () => {
		const indexes = findSnippetItemIndexes(
			[
				{ str: "Revenue" },
				{ str: " increased" },
				{ str: " 14% " },
				{ str: "year-over-year growth" },
			],
			"revenue   increased 14%",
		);

		expect(indexes).toStrictEqual([0, 1, 2]);
	});

	it("returns only the first matching occurrence", () => {
		const indexes = findSnippetItemIndexes(
			[{ str: "alpha beta" }, { str: "alpha beta" }],
			"alpha beta",
		);

		expect(indexes).toStrictEqual([0]);
	});

	it("returns an empty list when snippet cannot be matched", () => {
		expect(
			findSnippetItemIndexes([{ str: "financial results" }], "not present"),
		).toStrictEqual([]);
		expect(
			findSnippetItemIndexes([{ str: "financial results" }], "   "),
		).toStrictEqual([]);
	});
});
