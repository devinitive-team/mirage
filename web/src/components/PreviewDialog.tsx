import { lazy, Suspense, useEffect, useState } from "react";
import { X } from "lucide-react";

import type { ReferenceListItemData } from "#/components/ReferenceListItem";
import {
	formatPreviewContextLabel,
	resolvePreviewDialogState,
	type PreviewMode,
} from "#/lib/previewDialogState";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";

const PdfViewer = lazy(() =>
	import("./PdfViewer").then((mod) => ({ default: mod.PdfViewer })),
);

type PreviewDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	reference: ReferenceListItemData | null;
};

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

	const contextLabel = formatPreviewContextLabel(reference);
	const {
		effectiveMode,
		highlightRanges,
		showScopeToggle,
		visiblePageNumbers,
	} = resolvePreviewDialogState(reference, mode);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="flex h-[85vh] max-h-[85vh] w-[70vw] max-w-[70vw] flex-col overflow-hidden p-0 sm:max-w-[70vw]"
			>
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
								<div className="flex items-center gap-2 self-start">
									{showScopeToggle ? (
										<fieldset className="inline-flex items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--sand)] p-1">
											<legend className="sr-only">Preview page mode</legend>
											<button
												type="button"
												className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors ${
													mode === "evidence"
														? "border-[var(--lagoon)] bg-[var(--lagoon)] text-[var(--sand)]"
														: "border-transparent text-[var(--sea-ink)] hover:bg-[var(--surface)]"
												}`}
												aria-pressed={mode === "evidence"}
												onClick={() => setMode("evidence")}
											>
												Evidence pages
											</button>
											<button
												type="button"
												className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors ${
													mode === "document"
														? "border-[var(--lagoon)] bg-[var(--lagoon)] text-[var(--sand)]"
														: "border-transparent text-[var(--sea-ink)] hover:bg-[var(--surface)]"
												}`}
												aria-pressed={mode === "document"}
												onClick={() => setMode("document")}
											>
												Whole document
											</button>
										</fieldset>
									) : null}
									<div className="inline-flex items-center rounded-md border border-[var(--line)] bg-[var(--sand)] p-1">
										<DialogClose
											className="inline-flex items-center justify-center rounded border border-transparent px-2.5 py-1 text-xs font-medium text-[var(--sea-ink-soft)] transition-colors hover:border-[var(--line)] hover:bg-[var(--surface)] hover:text-[var(--sea-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lagoon)] focus-visible:ring-offset-2"
											aria-label="Close preview"
										>
											<X className="h-4 w-4" />
											<span className="sr-only">Close</span>
										</DialogClose>
									</div>
								</div>
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
									key={`${reference.id}-${reference.pageStart}-${reference.pageEnd}-${effectiveMode}`}
									documentId={reference.documentId}
									highlightRanges={highlightRanges}
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
