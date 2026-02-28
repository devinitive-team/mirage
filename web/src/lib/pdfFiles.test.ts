import { describe, expect, it } from "vitest";

import { isPdfFile } from "#/lib/pdfFiles";

describe("isPdfFile", () => {
	it("accepts file with PDF mime type", () => {
		const file = new File(["%PDF-1.7"], "doc.bin", {
			type: "application/pdf",
		});

		expect(isPdfFile(file)).toBe(true);
	});

	it("accepts file with .pdf extension", () => {
		const file = new File(["content"], "report.PDF", {
			type: "application/octet-stream",
		});

		expect(isPdfFile(file)).toBe(true);
	});

	it("rejects non-pdf file", () => {
		const file = new File(["content"], "notes.txt", {
			type: "text/plain",
		});

		expect(isPdfFile(file)).toBe(false);
	});
});
