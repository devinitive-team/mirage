import { createFileRoute } from "@tanstack/react-router";
import { Clock3, FileSearch, History, Loader2, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PreviewDialog } from "#/components/PreviewDialog";
import { QueryAnswerSection } from "#/components/QueryAnswerSection";
import {
	ReferenceListItem,
	groupReferencesByDocument,
	type ReferenceListItemData,
} from "#/components/ReferenceListItem";
import { Input } from "#/components/ui/input";
import { useClearHistory, useHistory } from "#/hooks/history";
import { evidenceListToReferences } from "#/lib/evidence";

export const Route = createFileRoute("/history")({
	head: () => ({
		meta: [{ title: "Mirage | History" }],
	}),
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

export function HistoryPage() {
	const { data, isLoading } = useHistory();
	const clearHistory = useClearHistory();
	const historyEntries = data?.items ?? [];
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedEntryID, setSelectedEntryID] = useState<string | null>(null);
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);
	const [selectedReference, setSelectedReference] =
		useState<ReferenceListItemData | null>(null);

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
		return evidenceListToReferences(selectedEntry.evidence ?? [], {});
	}, [selectedEntry]);
	const groupedSelectedReferences = useMemo(
		() => groupReferencesByDocument(selectedReferences),
		[selectedReferences],
	);

	const selectedDocumentCount = useMemo(
		() =>
			new Set(selectedReferences.map((reference) => reference.documentId)).size,
		[selectedReferences],
	);

	useEffect(() => {
		setSelectedReference((current) => {
			if (!current) return null;
			return selectedReferences.some((reference) => reference.id === current.id)
				? current
				: null;
		});
	}, [selectedReferences]);

	useEffect(() => {
		if (!selectedReference) {
			setIsPreviewOpen(false);
		}
	}, [selectedReference]);

	const handleClearHistory = () => {
		clearHistory.mutate(undefined, {
			onError: () => toast.error("Failed to clear history."),
		});
	};

	const handlePreview = useCallback((reference: ReferenceListItemData) => {
		setSelectedReference(reference);
		setIsPreviewOpen(true);
	}, []);

	const handlePreviewOpenChange = useCallback((open: boolean) => {
		setIsPreviewOpen(open);
		if (!open) {
			setSelectedReference(null);
		}
	}, []);

	return (
		<section
			className="flex h-full gap-3 p-3"
			aria-label="Evidence history workspace"
		>
			<aside className="w-72 shrink-0 flex flex-col island-shell rounded-2xl overflow-hidden">
				<div className="p-4 border-b border-[var(--line)] shrink-0 h-[7.75rem] flex flex-col justify-between gap-3">
					<div className="flex items-center justify-between">
						<div>
							<p className="island-kicker">Asked Questions</p>
							<p className="mt-1 text-xs text-[var(--sea-ink-soft)]">
								{historyEntries.length} saved
							</p>
						</div>
						{historyEntries.length > 0 && (
							<button
								type="button"
								onClick={handleClearHistory}
								disabled={clearHistory.isPending}
								className="rounded-lg p-1.5 text-[var(--sea-ink-soft)] transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50"
								aria-label="Clear all history"
							>
								<Trash2 className="w-3.5 h-3.5" />
							</button>
						)}
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
					{isLoading ? (
						<div className="flex items-center justify-center h-full py-8">
							<Loader2 className="w-6 h-6 animate-spin text-[var(--sea-ink-soft)]" />
						</div>
					) : historyEntries.length === 0 ? (
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
							const evidenceCount = entry.evidence?.length ?? 0;
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
											{formatAskedAt(entry.asked_at)}
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
				<div className="p-4 border-b border-[var(--line)] shrink-0 h-[7.75rem] flex flex-col gap-2">
					<p className="island-kicker">Evidence History</p>
					{selectedEntry ? (
						<div className="space-y-1">
							<p className="text-[15px] font-medium text-[var(--sea-ink)]">
								{selectedEntry.question}
							</p>
							<p className="text-xs text-[var(--sea-ink-soft)]">
								Asked {formatAskedAt(selectedEntry.asked_at)} •{" "}
								{selectedReferences.length} evidence item
								{selectedReferences.length === 1 ? "" : "s"} across{" "}
								{selectedDocumentCount} document
								{selectedDocumentCount === 1 ? "" : "s"}
							</p>
						</div>
					) : (
						<p className="text-sm text-[var(--sea-ink-soft)]">
							Select a question from the left to inspect its evidence.
						</p>
					)}
				</div>

				<div className="flex-1 min-h-0 overflow-y-auto p-3">
					{selectedEntry ? (
						<div className="space-y-3">
							<QueryAnswerSection
								answer={selectedEntry.answer}
								title="Answer Snapshot"
								description="Response recorded when this question was asked."
								className="mb-0"
							/>

							<section className="space-y-2">
								<p className="island-kicker">Evidence</p>
								{groupedSelectedReferences.length === 0 ? (
									<div className="rounded-xl border border-[var(--line)] bg-[var(--surface)]/65 p-4 text-sm text-[var(--sea-ink-soft)]">
										No evidence references were returned for this question.
									</div>
								) : (
									<div className="space-y-2">
										{groupedSelectedReferences.map((referenceGroup) => (
											<div key={referenceGroup.id}>
												<ReferenceListItem
													referenceGroup={referenceGroup}
													onPreview={handlePreview}
												/>
											</div>
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

			<PreviewDialog
				open={isPreviewOpen}
				onOpenChange={handlePreviewOpenChange}
				reference={selectedReference}
			/>
		</section>
	);
}
