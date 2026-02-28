import { afterEach, describe, expect, it, vi } from "vitest";

import { deleteDocuments } from "#/lib/api";

describe("deleteDocuments", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("sends one DELETE request per document id", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			statusText: "OK",
		});
		vi.stubGlobal("fetch", fetchMock);

		await deleteDocuments(["doc-1", "doc-2", "doc-3"]);

		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(fetchMock).toHaveBeenNthCalledWith(
			1,
			"http://localhost:2137/api/v1/documents/doc-1",
			{ method: "DELETE" },
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			2,
			"http://localhost:2137/api/v1/documents/doc-2",
			{ method: "DELETE" },
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			3,
			"http://localhost:2137/api/v1/documents/doc-3",
			{ method: "DELETE" },
		);
	});

	it("skips network calls when no ids are provided", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		await deleteDocuments([]);

		expect(fetchMock).not.toHaveBeenCalled();
	});
});
