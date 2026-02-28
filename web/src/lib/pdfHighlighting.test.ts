import { describe, expect, it } from "vitest";

import {
	dedupeRects,
	findSnippetItemIndexes,
	getRangeSnippet,
	getRangesForPage,
	toHighlightRect,
	toPositionedTextItems,
	type PdfHighlightRange,
} from "#/lib/pdfHighlighting";

describe("pdfHighlighting", () => {
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

	it("normalizes and filters ranges for a single page", () => {
		const ranges: Array<PdfHighlightRange> = [
			{ id: "a", pageStart: 2, pageEnd: 4 },
			{ id: "b", pageStart: 6.8, pageEnd: 5.2 },
		];

		expect(getRangesForPage(ranges, 1)).toStrictEqual([]);
		expect(getRangesForPage(ranges, 3)).toStrictEqual([ranges[0]]);
		expect(getRangesForPage(ranges, 6)).toStrictEqual([ranges[1]]);
	});

	it("extracts snippet text only when it is present and non-empty", () => {
		expect(
			getRangeSnippet({ id: "a", pageStart: 1, pageEnd: 1, snippet: " the " }),
		).toBe("the");
		expect(
			getRangeSnippet({ id: "a", pageStart: 1, pageEnd: 1, snippet: " " }),
		).toBeNull();
		expect(getRangeSnippet({ id: "a", pageStart: 1, pageEnd: 1 })).toBeNull();
	});

	it("maps text content items to viewport-aligned positions", () => {
		const items = toPositionedTextItems(
			[
				{
					str: "alpha",
					transform: [1, 0, 0, 12, 40, 80],
					width: 24,
					height: 10,
				},
			],
			100,
		);

		expect(items).toStrictEqual([
			{
				str: "alpha",
				left: 40,
				top: 8,
				width: 24,
				height: 12,
			},
		]);
	});

	it("converts positioned items to clamped highlight percentages", () => {
		expect(
			toHighlightRect(
				{ str: "alpha", left: 40, top: 10, width: 30, height: 20 },
				100,
				200,
			),
		).toStrictEqual({
			leftPct: 40,
			topPct: 5,
			widthPct: 30,
			heightPct: 10,
		});
	});

	it("deduplicates overlapping rects based on geometric values", () => {
		expect(
			dedupeRects([
				{ leftPct: 10, topPct: 20, widthPct: 30, heightPct: 40 },
				{ leftPct: 10, topPct: 20, widthPct: 30, heightPct: 40 },
				{ leftPct: 11, topPct: 20, widthPct: 30, heightPct: 40 },
			]),
		).toStrictEqual([
			{ leftPct: 10, topPct: 20, widthPct: 30, heightPct: 40 },
			{ leftPct: 11, topPct: 20, widthPct: 30, heightPct: 40 },
		]);
	});
});
