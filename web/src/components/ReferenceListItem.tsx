import { FileText } from "lucide-react";
import { memo, useMemo } from "react";

export const REFERENCE_LIST_ITEM_HEIGHT = 192;

export type ReferenceListItemData = {
	id: string;
	documentName: string;
	pageNumber: number;
	areaLabel?: string;
	previewImageUrl?: string;
	excerpt?: string;
	searchPhrase?: string;
};

type HighlightPart = {
	text: string;
	isMatch: boolean;
};

type ReferenceListItemProps = {
	reference: ReferenceListItemData;
	onPreview: (reference: ReferenceListItemData) => void;
};

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitBySearchPhrase(
	excerpt: string,
	searchPhrase: string,
): HighlightPart[] {
	const query = searchPhrase.trim();
	if (!query) return [{ text: excerpt, isMatch: false }];

	const matcher = new RegExp(`(${escapeRegExp(query)})`, "ig");
	return excerpt
		.split(matcher)
		.filter((part) => part.length > 0)
		.map((part) => ({
			text: part,
			isMatch: part.toLocaleLowerCase() === query.toLocaleLowerCase(),
		}));
}

export const ReferenceListItem = memo(function ReferenceListItem({
	reference,
	onPreview,
}: ReferenceListItemProps) {
	const excerpt = reference.excerpt ?? "";
	const searchPhrase = reference.searchPhrase ?? "";
	const highlightedParts = useMemo(
		() => splitBySearchPhrase(excerpt, searchPhrase),
		[excerpt, searchPhrase],
	);
	const areaLabel = reference.areaLabel ?? `Page ${reference.pageNumber}`;

	return (
		<button
			type="button"
			className="reference-list-item h-full w-full rounded-xl p-3 flex flex-col gap-2 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lagoon)]"
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

			<div
				className={`reference-list-item__excerpt min-h-0 flex-1 rounded-lg ${
					reference.previewImageUrl
						? "overflow-hidden p-1.5"
						: "overflow-y-auto px-2 py-1.5"
				}`}
			>
				{reference.previewImageUrl ? (
					<img
						alt={`${reference.documentName} preview`}
						className="reference-list-item__preview"
						loading="lazy"
						src={reference.previewImageUrl}
					/>
				) : (
					<p className="text-sm leading-6 text-[var(--sea-ink)] whitespace-pre-wrap break-words">
						{highlightedParts.map((part, index) =>
							part.isMatch ? (
								<mark
									key={`${part.text}-${index}`}
									className="reference-list-item__mark rounded-sm px-0.5"
								>
									{part.text}
								</mark>
							) : (
								<span key={`${part.text}-${index}`}>{part.text}</span>
							),
						)}
					</p>
				)}
			</div>
		</button>
	);
});
