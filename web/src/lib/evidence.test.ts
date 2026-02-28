import { describe, expect, it } from "vitest";

import {
	buildNodeTitleLookup,
	evidenceListToReferences,
	normalizePageRange,
} from "#/lib/evidence";

describe("normalizePageRange", () => {
	it("normalizes invalid ranges to a one-indexed inclusive range", () => {
		expect(normalizePageRange(0, 0)).toEqual({ pageStart: 1, pageEnd: 1 });
		expect(normalizePageRange(4, 2)).toEqual({ pageStart: 4, pageEnd: 4 });
		expect(normalizePageRange(2.8, 4.9)).toEqual({ pageStart: 2, pageEnd: 4 });
	});
});

describe("buildNodeTitleLookup", () => {
	it("collects node titles recursively", () => {
		const tree = {
			document_id: "doc-1",
			root: {
				node_id: "root",
				title: "Root",
				start_page: 1,
				end_page: 3,
				summary: "",
				children: [
					{
						node_id: "a",
						title: "Section A",
						start_page: 1,
						end_page: 1,
						summary: "",
						children: [],
					},
				],
			},
		};

		expect(buildNodeTitleLookup(tree)).toEqual({
			root: "Root",
			a: "Section A",
		});
	});
});

describe("evidenceListToReferences", () => {
	it("maps evidence to references using fallback tree titles", () => {
		const references = evidenceListToReferences(
			[
				{
					document_id: "doc-1",
					document_name: "Quarterly.pdf",
					node_id: "a",
					node_title: "",
					page_start: 2,
					page_end: 3,
					snippet: "Revenue grew 14%",
				},
			],
			{
				"doc-1": {
					a: "Financial Results",
				},
			},
		);

		expect(references).toEqual([
			{
				id: "doc-1:a:2:3:0",
				documentId: "doc-1",
				documentName: "Quarterly.pdf",
				nodeId: "a",
				nodeTitle: "Financial Results",
				pageStart: 2,
				pageEnd: 3,
				snippet: "Revenue grew 14%",
			},
		]);
	});
});
