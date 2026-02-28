import { normalizePageRange } from "#/lib/pdfPageSelection";

export type MatchableTextItem = {
	str: string;
};

export type PositionedTextItem = MatchableTextItem & {
	left: number;
	top: number;
	width: number;
	height: number;
};

export type HighlightRect = {
	leftPct: number;
	topPct: number;
	widthPct: number;
	heightPct: number;
};

export type PdfHighlightRange = {
	id: string;
	pageStart: number;
	pageEnd: number;
	nodeTitle?: string;
	snippet?: string;
};

type TextContentItem = {
	str: string;
	transform: Array<number>;
	width: number;
	height: number;
};

function normalizeTextWithSourceMap(input: string): {
	text: string;
	sourceIndexes: Array<number>;
} {
	let text = "";
	const sourceIndexes: Array<number> = [];
	let pendingWhitespaceIndex: number | null = null;

	for (let index = 0; index < input.length; index += 1) {
		const character = input[index];
		if (character.trim().length === 0) {
			if (text.length > 0 && pendingWhitespaceIndex === null) {
				pendingWhitespaceIndex = index;
			}
			continue;
		}

		if (pendingWhitespaceIndex !== null) {
			text += " ";
			sourceIndexes.push(pendingWhitespaceIndex);
			pendingWhitespaceIndex = null;
		}

		text += character.toLowerCase();
		sourceIndexes.push(index);
	}

	return { text, sourceIndexes };
}

function normalizeText(input: string): string {
	return normalizeTextWithSourceMap(input).text;
}

function buildJoinedText(items: Array<MatchableTextItem>): {
	text: string;
	sourceToItemIndex: Array<number>;
} {
	let text = "";
	const sourceToItemIndex: Array<number> = [];

	items.forEach((item, index) => {
		if (index > 0) {
			text += " ";
			sourceToItemIndex.push(-1);
		}
		for (const character of item.str) {
			text += character;
			sourceToItemIndex.push(index);
		}
	});

	return { text, sourceToItemIndex };
}

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(maximum, Math.max(minimum, value));
}

function isTextContentItem(item: unknown): item is TextContentItem {
	if (!item || typeof item !== "object") return false;
	const candidate = item as Partial<TextContentItem>;
	return (
		typeof candidate.str === "string" &&
		Array.isArray(candidate.transform) &&
		candidate.transform.length >= 6 &&
		typeof candidate.width === "number" &&
		typeof candidate.height === "number"
	);
}

export function findSnippetItemIndexes(
	items: Array<MatchableTextItem>,
	snippet: string,
): Array<number> {
	const normalizedSnippet = normalizeText(snippet.trim());
	if (!normalizedSnippet) return [];
	if (items.length === 0) return [];

	const { text: joinedText, sourceToItemIndex } = buildJoinedText(items);
	const normalizedTextMap = normalizeTextWithSourceMap(joinedText);
	const matchStart = normalizedTextMap.text.indexOf(normalizedSnippet);
	if (matchStart < 0) return [];

	const matchEnd = matchStart + normalizedSnippet.length - 1;
	const sourceStart = normalizedTextMap.sourceIndexes[matchStart];
	const sourceEnd = normalizedTextMap.sourceIndexes[matchEnd];
	if (sourceStart === undefined || sourceEnd === undefined) return [];

	const itemIndexes = new Set<number>();
	for (let index = sourceStart; index <= sourceEnd; index += 1) {
		const itemIndex = sourceToItemIndex[index];
		if (itemIndex !== undefined && itemIndex >= 0) {
			itemIndexes.add(itemIndex);
		}
	}

	return Array.from(itemIndexes).sort((left, right) => left - right);
}

export function getRangeSnippet(range: PdfHighlightRange): string | null {
	if (typeof range.snippet !== "string") return null;
	const snippet = range.snippet.trim();
	return snippet.length > 0 ? snippet : null;
}

export function rangeIncludesPage(
	range: PdfHighlightRange,
	pageNumber: number,
): boolean {
	const [start, end] = normalizePageRange(range.pageStart, range.pageEnd);
	return pageNumber >= start && pageNumber <= end;
}

export function getRangesForPage(
	ranges: Array<PdfHighlightRange>,
	pageNumber: number,
): Array<PdfHighlightRange> {
	return ranges.filter((range) => rangeIncludesPage(range, pageNumber));
}

export function dedupeRects(rects: Array<HighlightRect>): Array<HighlightRect> {
	const seen = new Set<string>();
	const uniqueRects: Array<HighlightRect> = [];

	for (const rect of rects) {
		const key = `${rect.leftPct.toFixed(3)}:${rect.topPct.toFixed(3)}:${rect.widthPct.toFixed(3)}:${rect.heightPct.toFixed(3)}`;
		if (seen.has(key)) continue;
		seen.add(key);
		uniqueRects.push(rect);
	}

	return uniqueRects;
}

export function toPositionedTextItems(
	textContentItems: Array<unknown>,
	viewportHeight: number,
): Array<PositionedTextItem> {
	const positionedItems: Array<PositionedTextItem> = [];

	for (const item of textContentItems) {
		if (!isTextContentItem(item)) continue;
		if (item.str.length === 0) continue;

		const transformHeight = item.transform[3] ?? 0;
		const left = item.transform[4] ?? 0;
		const baselineY = item.transform[5] ?? 0;
		const width = Math.max(0, item.width);
		const height = Math.max(Math.abs(item.height), Math.abs(transformHeight));
		const top = viewportHeight - baselineY - height;
		if (
			!Number.isFinite(left) ||
			!Number.isFinite(top) ||
			!Number.isFinite(width) ||
			!Number.isFinite(height)
		) {
			continue;
		}

		positionedItems.push({
			str: item.str,
			left,
			top,
			width,
			height,
		});
	}

	return positionedItems;
}

export function toHighlightRect(
	item: PositionedTextItem,
	viewportWidth: number,
	viewportHeight: number,
): HighlightRect | null {
	if (viewportWidth <= 0 || viewportHeight <= 0) return null;
	if (item.width <= 0 || item.height <= 0) return null;

	const leftPct = clamp((item.left / viewportWidth) * 100, 0, 100);
	const topPct = clamp((item.top / viewportHeight) * 100, 0, 100);
	const widthPct = clamp((item.width / viewportWidth) * 100, 0, 100 - leftPct);
	const heightPct = clamp(
		(item.height / viewportHeight) * 100,
		0,
		100 - topPct,
	);
	if (widthPct <= 0 || heightPct <= 0) return null;

	return { leftPct, topPct, widthPct, heightPct };
}
