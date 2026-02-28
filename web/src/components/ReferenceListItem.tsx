import { FileText } from "lucide-react";
import { memo } from "react";

export const REFERENCE_LIST_ITEM_HEIGHT = 192;

export type ReferenceListItemData = {
	id: string;
	documentId: string;
	documentName: string;
	nodeId: string;
	nodeTitle: string;
	pageStart: number;
	pageEnd: number;
	snippet?: string;
};

type ReferenceListItemProps = {
	reference: ReferenceListItemData;
	onPreview: (reference: ReferenceListItemData) => void;
};

export const ReferenceListItem = memo(function ReferenceListItem({
	reference,
	onPreview,
}: ReferenceListItemProps) {
	const areaLabel =
		reference.pageStart === reference.pageEnd
			? `Page ${reference.pageStart}`
			: `Pages ${reference.pageStart}-${reference.pageEnd}`;
	const description =
		reference.snippet?.trim() || "Open preview to inspect evidence context.";

	return (
		<button
			type="button"
			className="reference-list-item h-full w-full rounded-xl p-3 flex flex-col gap-2 text-left cursor-pointer transition-all hover:-translate-y-0.5 hover:border-[var(--lagoon-deep)]/40 hover:shadow-lg active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lagoon)]"
			onClick={() => onPreview(reference)}
		>
			<header className="flex items-start justify-between gap-3">
				<div className="min-w-0 flex items-center gap-2">
					<FileText className="reference-list-item__icon w-4 h-4 shrink-0" />
					<p className="reference-list-item__title truncate text-sm font-semibold">
						{reference.documentName}
					</p>
				</div>
				<span className="reference-list-item__page shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold">
					{areaLabel}
				</span>
			</header>

			<p className="text-xs font-medium text-[var(--sea-ink-soft)] truncate">
				{reference.nodeTitle}
			</p>

			<div className="reference-list-item__excerpt min-h-0 flex-1 rounded-lg overflow-hidden px-2 py-1.5">
				<p className="text-sm leading-6 text-[var(--sea-ink)] whitespace-pre-wrap break-words">
					{description}
				</p>
			</div>
		</button>
	);
});
