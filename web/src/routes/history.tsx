import { createFileRoute } from "@tanstack/react-router";
import {
	Clock3,
	FileSearch,
	FileText,
	History,
	MessageSquareText,
	X,
} from "lucide-react";
import { type CSSProperties, useEffect, useMemo, useState } from "react";

import { Input } from "#/components/ui/input";
import { useEvidenceHistoryStore } from "#/hooks/evidenceHistory";
import { evidenceListToReferences } from "#/lib/evidence";

export const Route = createFileRoute("/history")({
	component: HistoryPage,
});

function formatAskedAt(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "Unknown time";

	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(date);
}

function renderPageRange(pageStart: number, pageEnd: number): string {
	if (pageStart === pageEnd) return `Page ${pageStart}`;
	return `Pages ${pageStart}-${pageEnd}`;
}

function HistoryEvidenceCard({
	documentName,
	nodeTitle,
	pageStart,
	pageEnd,
	animationDelayMs,
}: {
	documentName: string;
	nodeTitle: string;
	pageStart: number;
	pageEnd: number;
	animationDelayMs: number;
}) {
	const animationStyle: CSSProperties = {
		animationDelay: `${animationDelayMs}ms`,
	};

	return (
		<article
			className="reference-list-item rise-in rounded-xl p-3 flex flex-col gap-2"
			style={animationStyle}
		>
			<header className="flex items-start justify-between gap-3">
				<div className="min-w-0 flex items-center gap-2">
					<FileText className="reference-list-item__icon w-4 h-4 shrink-0" />
					<p className="reference-list-item__title truncate text-sm font-semibold">
						{documentName}
					</p>
				</div>
				<span className="reference-list-item__page shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold">
					{renderPageRange(pageStart, pageEnd)}
				</span>
			</header>

			<p className="text-xs font-medium text-[var(--sea-ink-soft)] truncate">
				{nodeTitle}
			</p>

			<div className="reference-list-item__excerpt min-h-0 rounded-lg overflow-hidden px-2 py-1.5">
				<p className="text-sm leading-6 text-[var(--sea-ink)]">
					Evidence captured from a previous query response.
				</p>
			</div>
		</article>
	);
}

export function HistoryPage() {
	const historyEntries = useEvidenceHistoryStore((state) => state.entries);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedEntryID, setSelectedEntryID] = useState<string | null>(null);

	const normalizedSearchQuery = searchQuery.trim().toLowerCase();
	const filteredEntries = useMemo(
		() =>
			historyEntries.filter((entry) =>
				entry.question.toLowerCase().includes(normalizedSearchQuery),
			),
		[historyEntries, normalizedSearchQuery],
	);

	useEffect(() => {
		if (historyEntries.length === 0) {
			setSelectedEntryID(null);
			return;
		}
		setSelectedEntryID((current) => {
			if (current && historyEntries.some((entry) => entry.id === current)) {
				return current;
			}
			return historyEntries[0]?.id ?? null;
		});
	}, [historyEntries]);

	const selectedEntry = useMemo(() => {
		if (!selectedEntryID) return historyEntries[0] ?? null;
		return (
			historyEntries.find((entry) => entry.id === selectedEntryID) ??
			historyEntries[0] ??
			null
		);
	}, [historyEntries, selectedEntryID]);

	const selectedReferences = useMemo(() => {
		if (!selectedEntry) return [];
		return evidenceListToReferences(selectedEntry.evidence, {});
	}, [selectedEntry]);

	const selectedDocumentCount = useMemo(
		() =>
			new Set(selectedReferences.map((reference) => reference.documentId)).size,
		[selectedReferences],
	);

	return (
		<section
			className="flex h-full gap-3 p-3"
			aria-label="Evidence history workspace"
		>
			<aside className="w-72 shrink-0 flex flex-col island-shell rounded-2xl overflow-hidden">
				<div className="p-4 border-b border-[var(--line)] shrink-0 space-y-3">
					<div>
						<p className="island-kicker">Asked Questions</p>
						<p className="mt-1 text-xs text-[var(--sea-ink-soft)]">
							{historyEntries.length} saved in this session
						</p>
					</div>
					<div className="relative">
						<Input
							value={searchQuery}
							onChange={(event) => setSearchQuery(event.target.value)}
							placeholder="Search questions..."
							className="pr-8 text-sm"
							aria-label="Search asked questions"
						/>
						{searchQuery ? (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--sea-ink-soft)] transition-colors hover:bg-[var(--sea-ink)]/8 hover:text-[var(--sea-ink)]"
								aria-label="Clear question search"
							>
								<X className="w-3.5 h-3.5" />
							</button>
						) : null}
					</div>
				</div>

				<div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
					{historyEntries.length === 0 ? (
						<div className="h-full flex flex-col items-center justify-center gap-3 px-4 text-center">
							<History className="w-8 h-8 text-[var(--sea-ink-soft)] opacity-40" />
							<p className="text-sm text-[var(--sea-ink-soft)]">
								No question history yet. Run a query on the dashboard first.
							</p>
						</div>
					) : filteredEntries.length === 0 ? (
						<div className="h-full flex flex-col items-center justify-center gap-3 px-4 text-center">
							<FileSearch className="w-8 h-8 text-[var(--sea-ink-soft)] opacity-35" />
							<p className="text-sm text-[var(--sea-ink-soft)]">
								No questions match your search.
							</p>
						</div>
					) : (
						filteredEntries.map((entry) => {
							const isSelected = entry.id === selectedEntry?.id;
							const evidenceCount = entry.evidence.length;
							const evidenceLabel =
								evidenceCount === 1
									? "1 evidence reference"
									: `${evidenceCount} evidence references`;
							return (
								<button
									key={entry.id}
									type="button"
									onClick={() => setSelectedEntryID(entry.id)}
									className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
										isSelected
											? "border-[var(--lagoon)]/30 bg-[var(--lagoon)]/8"
											: "border-transparent hover:border-[var(--line)] hover:bg-[var(--sea-ink)]/5"
									}`}
								>
									<p className="text-sm font-medium text-[var(--sea-ink)]">
										{entry.question}
									</p>
									<div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[var(--sea-ink-soft)]">
										<span className="inline-flex items-center gap-1">
											<Clock3 className="w-3 h-3" />
											{formatAskedAt(entry.askedAt)}
										</span>
										<span className="truncate">{evidenceLabel}</span>
									</div>
								</button>
							);
						})
					)}
				</div>
			</aside>

			<div className="flex-1 flex flex-col island-shell rounded-2xl overflow-hidden">
				<div className="p-4 border-b border-[var(--line)] shrink-0 space-y-2">
					<p className="island-kicker">Evidence History</p>
					{selectedEntry ? (
						<>
							<p className="text-[15px] font-medium text-[var(--sea-ink)]">
								{selectedEntry.question}
							</p>
							<p className="text-xs text-[var(--sea-ink-soft)]">
								Asked {formatAskedAt(selectedEntry.askedAt)} •{" "}
								{selectedReferences.length} evidence item
								{selectedReferences.length === 1 ? "" : "s"} across{" "}
								{selectedDocumentCount} document
								{selectedDocumentCount === 1 ? "" : "s"}
							</p>
						</>
					) : (
						<p className="text-sm text-[var(--sea-ink-soft)]">
							Select a question from the left to inspect its evidence.
						</p>
					)}
				</div>

				<div className="flex-1 min-h-0 overflow-y-auto p-3">
					{selectedEntry ? (
						<div className="space-y-3">
							<section className="feature-card overflow-hidden rounded-2xl border border-[var(--line)]">
								<header className="flex items-start gap-3 border-b border-[var(--line)] bg-[var(--surface-strong)]/95 px-4 py-3">
									<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--lagoon)]/10">
										<MessageSquareText className="h-4 w-4 text-[var(--lagoon-deep)]" />
									</div>
									<div className="min-w-0">
										<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--sea-ink-soft)]">
											Answer Snapshot
										</p>
										<p className="text-xs text-[var(--sea-ink-soft)]">
											Response recorded when this question was asked.
										</p>
									</div>
								</header>
								<div className="bg-[var(--surface-strong)]/80 px-4 py-3">
									<p className="rounded-lg border border-[var(--line)] bg-[var(--surface)]/70 px-3 py-2 text-[15px] leading-7 whitespace-pre-wrap text-[var(--sea-ink)]">
										{selectedEntry.answer}
									</p>
								</div>
							</section>

							<section className="space-y-2">
								<p className="island-kicker">Evidence</p>
								{selectedReferences.length === 0 ? (
									<div className="rounded-xl border border-[var(--line)] bg-[var(--surface)]/65 p-4 text-sm text-[var(--sea-ink-soft)]">
										No evidence references were returned for this question.
									</div>
								) : (
									<div className="space-y-2">
										{selectedReferences.map((reference, index) => (
											<HistoryEvidenceCard
												key={reference.id}
												documentName={reference.documentName}
												nodeTitle={reference.nodeTitle}
												pageStart={reference.pageStart}
												pageEnd={reference.pageEnd}
												animationDelayMs={Math.min(index, 6) * 55}
											/>
										))}
									</div>
								)}
							</section>
						</div>
					) : (
						<div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
							<History className="w-10 h-10 text-[var(--sea-ink-soft)] opacity-40" />
							<p className="text-sm text-[var(--sea-ink-soft)]">
								Select a question from the left to view its answer and
								referenced evidence.
							</p>
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
