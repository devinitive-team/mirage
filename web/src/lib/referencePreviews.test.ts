import { describe, expect, it } from "vitest";

import {
	buildRandomReferenceArea,
	formatAreaLabel,
} from "#/lib/referencePreviews";

function fixedRandom(value: number): () => number {
	return () => value;
}

describe("buildRandomReferenceArea", () => {
	it("builds an in-bounds random area for a page", () => {
		const area = buildRandomReferenceArea(4, fixedRandom(0.5));

		expect(area.pageNumber).toBe(4);
		expect(area.widthRatio).toBeGreaterThan(0);
		expect(area.heightRatio).toBeGreaterThan(0);
		expect(area.xRatio).toBeGreaterThanOrEqual(0);
		expect(area.yRatio).toBeGreaterThanOrEqual(0);
		expect(area.xRatio + area.widthRatio).toBeLessThanOrEqual(1);
		expect(area.yRatio + area.heightRatio).toBeLessThanOrEqual(1);
	});

	it("formats a readable area label", () => {
		const label = formatAreaLabel({
			pageNumber: 2,
			xRatio: 0.11,
			yRatio: 0.22,
			widthRatio: 0.33,
			heightRatio: 0.44,
		});

		expect(label).toBe("Page 2 - area x 11%, y 22%, w 33%, h 44%");
	});
});
