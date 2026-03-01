import { FileText } from "lucide-react";
import { memo } from "react";

export type ReferenceListItemData = {
	id: string;
	documentId: string;
	documentName: string;
	nodeId: string;
	nodeTitle: string;
	pageStart: number;
	pageEnd: number;
};

export type GroupedReferenceListItemData = {
	id: string;
	documentId: string;
	documentName: string;
	evidence: ReferenceListItemData[];
};

function toEvidenceSortValue(reference: ReferenceListItemData): string {
	return `${String(reference.pageStart).padStart(6, "0")}:${String(
		reference.pageEnd,
	).padStart(6, "0")}:${reference.nodeTitle}`;
}

export function groupReferencesByDocument(
	references: ReferenceListItemData[],
): GroupedReferenceListItemData[] {
	const groupedByDocument = new Map<string, GroupedReferenceListItemData>();

	for (const reference of references) {
		const existingGroup = groupedByDocument.get(reference.documentId);
		if (existingGroup) {
			existingGroup.evidence.push(reference);
			continue;
		}

		groupedByDocument.set(reference.documentId, {
			id: `document-group:${reference.documentId}`,
			documentId: reference.documentId,
			documentName: reference.documentName,
			evidence: [reference],
		});
	}

	return Array.from(groupedByDocument.values()).map((group) => ({
		...group,
		evidence: [...group.evidence].sort((left, right) =>
			toEvidenceSortValue(left).localeCompare(toEvidenceSortValue(right)),
		),
	}));
}

function toPageRangeLabel(reference: ReferenceListItemData): string {
	return reference.pageStart === reference.pageEnd
		? `Page ${reference.pageStart}`
		: `Pages ${reference.pageStart}-${reference.pageEnd}`;
}

type ReferenceListItemProps = {
	referenceGroup: GroupedReferenceListItemData;
	onPreview: (reference: ReferenceListItemData) => void;
};

export const ReferenceListItem = memo(function ReferenceListItem({
	referenceGroup,
	onPreview,
}: ReferenceListItemProps) {
	const evidenceCount = referenceGroup.evidence.length;
	const evidenceCountLabel =
		evidenceCount === 1 ? "1 evidence hit" : `${evidenceCount} evidence hits`;

	return (
		<article className="reference-list-item rounded-xl p-3">
			<header className="flex items-start justify-between gap-3">
				<div className="min-w-0 flex items-center gap-2">
					<FileText className="reference-list-item__icon w-4 h-4 shrink-0" />
					<p className="reference-list-item__title truncate text-sm font-semibold">
						{referenceGroup.documentName}
					</p>
				</div>
				<span className="shrink-0 rounded-full border border-[var(--line)] bg-[var(--surface)]/70 px-2 py-0.5 text-[11px] font-medium text-[var(--sea-ink-soft)]">
					{evidenceCountLabel}
				</span>
			</header>

			<div className="mt-3 flex flex-wrap gap-2">
				{referenceGroup.evidence.map((reference) => (
					<button
						type="button"
						key={reference.id}
						onClick={() => onPreview(reference)}
						aria-label={`Open preview for ${referenceGroup.documentName} ${toPageRangeLabel(reference)} ${reference.nodeTitle}`}
						className="reference-list-item__page max-w-full rounded-lg border px-2.5 py-1 text-left transition-colors hover:border-[var(--lagoon-deep)]/45 hover:bg-[var(--surface)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lagoon)]"
					>
						<p className="text-xs font-semibold text-[var(--sea-ink)]">
							{toPageRangeLabel(reference)}
						</p>
						<p className="max-w-52 truncate text-[11px] text-[var(--sea-ink-soft)]">
							{reference.nodeTitle}
						</p>
					</button>
				))}
			</div>
		</article>
	);
});
