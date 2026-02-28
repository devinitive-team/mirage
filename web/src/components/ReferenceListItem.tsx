import { FileText } from "lucide-react";
import { memo, useMemo } from "react";

export const REFERENCE_LIST_ITEM_HEIGHT = 192;

export type ReferenceListItemData = {
	id: number;
	documentName: string;
	pageNumber: number;
	excerpt: string;
	searchPhrase: string;
};

type HighlightPart = {
	text: string;
	isMatch: boolean;
};

type ReferenceListItemProps = {
	reference: ReferenceListItemData;
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
}: ReferenceListItemProps) {
	const highlightedParts = useMemo(
		() => splitBySearchPhrase(reference.excerpt, reference.searchPhrase),
		[reference.excerpt, reference.searchPhrase],
	);

	return (
		<article className="reference-list-item h-full rounded-xl p-3 flex flex-col gap-2">
			<header className="flex items-start justify-between gap-3">
				<div className="min-w-0 flex items-center gap-2">
					<FileText className="reference-list-item__icon w-4 h-4 shrink-0" />
					<p className="reference-list-item__title truncate text-sm font-semibold">
						{reference.documentName}
					</p>
				</div>
				<span className="reference-list-item__page shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold">
					Page {reference.pageNumber}
				</span>
			</header>

			<div className="reference-list-item__excerpt min-h-0 flex-1 overflow-y-auto rounded-lg px-2 py-1.5">
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
			</div>
		</article>
	);
});
