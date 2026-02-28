import { lazy, Suspense } from "react";

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
	const contextLabel = reference
		? reference.pageStart === reference.pageEnd
			? `${reference.nodeTitle} · Page ${reference.pageStart}`
			: `${reference.nodeTitle} · Pages ${reference.pageStart}-${reference.pageEnd}`
		: "-";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="h-[85vh] max-h-[85vh] w-[70vw] max-w-[70vw] gap-0 overflow-hidden p-0 sm:max-w-[70vw]">
				<div className="relative flex h-full w-full min-h-0 flex-col overflow-hidden">
					{reference && (
						<DialogHeader className="px-6 pt-6 pb-3 border-b border-[var(--line)]">
							<DialogTitle className="text-base">
								{reference.documentName}
							</DialogTitle>
							<DialogDescription>{contextLabel}</DialogDescription>
						</DialogHeader>
					)}
					<div className="min-h-0 flex-1 overflow-hidden">
						<Suspense
							fallback={<div className="p-4">Loading PDF viewer...</div>}
						>
							{reference ? (
								<PdfViewer
									key={`${reference.id}-${reference.pageStart}-${reference.pageEnd}`}
									documentId={reference.documentId}
									highlightRanges={[
										{
											id: reference.id,
											pageStart: reference.pageStart,
											pageEnd: reference.pageEnd,
											snippet: reference.snippet,
											nodeTitle: reference.nodeTitle,
										},
									]}
								/>
							) : (
								<div className="p-4">No reference selected.</div>
							)}
						</Suspense>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
