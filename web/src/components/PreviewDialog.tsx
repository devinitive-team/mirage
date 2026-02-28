import { lazy, Suspense, useEffect, useMemo, useState } from "react";

import type { ReferenceListItemData } from "#/components/ReferenceListItem";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

const PdfViewer = lazy(() =>
	import("./PdfViewer").then((mod) => ({ default: mod.PdfViewer })),
);

type PreviewMode = "evidence" | "document";

type PreviewDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	reference: ReferenceListItemData | null;
};

function buildPageRange(pageStart: number, pageEnd: number): Array<number> {
	const normalizedStart = Math.max(1, Math.floor(Math.min(pageStart, pageEnd)));
	const normalizedEnd = Math.max(1, Math.floor(Math.max(pageStart, pageEnd)));
	const pages: Array<number> = [];

	for (let page = normalizedStart; page <= normalizedEnd; page += 1) {
		pages.push(page);
	}

	return pages;
}

export function PreviewDialog({
	open,
	onOpenChange,
	reference,
}: PreviewDialogProps) {
	const [mode, setMode] = useState<PreviewMode>("evidence");

	useEffect(() => {
		if (!reference) {
			setMode("evidence");
			return;
		}
		setMode("evidence");
	}, [reference]);

	const contextLabel = reference
		? reference.pageStart === reference.pageEnd
			? `${reference.nodeTitle} · Page ${reference.pageStart}`
			: `${reference.nodeTitle} · Pages ${reference.pageStart}-${reference.pageEnd}`
		: "-";
	const evidencePageNumbers = useMemo(() => {
		if (!reference) return [];
		return buildPageRange(reference.pageStart, reference.pageEnd);
	}, [reference]);
	const visiblePageNumbers =
		mode === "evidence" && evidencePageNumbers.length > 0
			? evidencePageNumbers
			: undefined;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex h-[85vh] max-h-[85vh] w-[70vw] max-w-[70vw] flex-col overflow-hidden p-0 sm:max-w-[70vw]">
				<div className="relative flex h-full min-h-0 w-full flex-col">
					{reference && (
						<DialogHeader className="shrink-0 border-b border-[var(--line)] px-6 pt-6 pb-3">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div className="space-y-1">
									<DialogTitle className="text-base">
										{reference.documentName}
									</DialogTitle>
									<DialogDescription>{contextLabel}</DialogDescription>
								</div>
								<fieldset className="inline-flex items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--sand)] p-1">
									<legend className="sr-only">Preview page mode</legend>
									<button
										type="button"
										className={`rounded px-2.5 py-1 text-xs font-medium transition ${
											mode === "evidence"
												? "bg-[var(--lagoon)] text-white"
												: "text-[var(--sea-ink)] hover:bg-white"
										}`}
										aria-pressed={mode === "evidence"}
										onClick={() => setMode("evidence")}
									>
										Evidence pages
									</button>
									<button
										type="button"
										className={`rounded px-2.5 py-1 text-xs font-medium transition ${
											mode === "document"
												? "bg-[var(--lagoon)] text-white"
												: "text-[var(--sea-ink)] hover:bg-white"
										}`}
										aria-pressed={mode === "document"}
										onClick={() => setMode("document")}
									>
										Whole document
									</button>
								</fieldset>
							</div>
						</DialogHeader>
					)}
					<Suspense
						fallback={
							<div className="flex min-h-0 flex-1 items-center p-4">
								Loading PDF viewer...
							</div>
						}
					>
						{reference ? (
							<div className="min-h-0 flex-1 overflow-hidden">
								<PdfViewer
									key={`${reference.id}-${reference.pageStart}-${reference.pageEnd}-${mode}`}
									documentId={reference.documentId}
									highlightRanges={[
										{
											id: reference.id,
											pageStart: reference.pageStart,
											pageEnd: reference.pageEnd,
											nodeTitle: reference.nodeTitle,
										},
									]}
									visiblePageNumbers={visiblePageNumbers}
								/>
							</div>
						) : (
							<div className="flex min-h-0 flex-1 items-center p-4">
								No reference selected.
							</div>
						)}
					</Suspense>
				</div>
			</DialogContent>
		</Dialog>
	);
}
