import type { ReferenceListItemData } from "#/components/ReferenceListItem";
import type { DocumentTree, Evidence } from "#/lib/types";

export type NodeTitleLookup = Record<string, string>;
export type NodeTitleLookupByDocument = Record<string, NodeTitleLookup>;

export function normalizePageRange(
	pageStart: number,
	pageEnd: number,
): { pageStart: number; pageEnd: number } {
	const normalizedStart = Math.max(1, Math.floor(pageStart));
	const normalizedEnd = Math.max(normalizedStart, Math.floor(pageEnd));

	return {
		pageStart: normalizedStart,
		pageEnd: normalizedEnd,
	};
}

export function buildNodeTitleLookup(tree: DocumentTree): NodeTitleLookup {
	const lookup: NodeTitleLookup = {};

	const visit = (node: DocumentTree["root"]) => {
		lookup[node.node_id] = node.title;
		for (const child of node.children ?? []) {
			visit(child);
		}
	};

	visit(tree.root);
	return lookup;
}

export function evidenceToReference(
	item: Evidence,
	index: number,
	titlesByDocument: NodeTitleLookupByDocument = {},
): ReferenceListItemData {
	const pages = normalizePageRange(item.page_start, item.page_end);
	const titleFromTree =
		titlesByDocument[item.document_id]?.[item.node_id]?.trim() || "";
	const title = item.node_title?.trim() || titleFromTree || "Untitled section";
	const snippet = item.snippet?.trim();

	return {
		id: `${item.document_id}:${item.node_id}:${pages.pageStart}:${pages.pageEnd}:${index}`,
		documentId: item.document_id,
		documentName: item.document_name,
		nodeId: item.node_id,
		nodeTitle: title,
		pageStart: pages.pageStart,
		pageEnd: pages.pageEnd,
		snippet: snippet || undefined,
	};
}

export function evidenceListToReferences(
	evidenceList: Array<Evidence>,
	titlesByDocument: NodeTitleLookupByDocument = {},
): Array<ReferenceListItemData> {
	return evidenceList.map((item, index) =>
		evidenceToReference(item, index, titlesByDocument),
	);
}
