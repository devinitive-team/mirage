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
	const searchPhrase = reference?.searchPhrase?.trim() ?? "";
	const phraseLabel = searchPhrase ? `"${searchPhrase}"` : "N/A";
	const contextLabel =
		reference?.areaLabel ?? `Page ${reference?.pageNumber ?? "-"}`;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-[70vw] max-w-[70vw] sm:max-w-[70vw] h-[85vh] max-h-[85vh] p-0">
				<div className="relative h-full w-full">
					{reference && (
						<DialogHeader className="px-6 pt-6 pb-3 border-b border-[var(--line)]">
							<DialogTitle className="text-base">
								{reference.documentName}
							</DialogTitle>
							<DialogDescription>
								{contextLabel} · Highlighted phrase: {phraseLabel}
							</DialogDescription>
						</DialogHeader>
					)}
					<Suspense fallback={<div className="p-4">Loading PDF viewer...</div>}>
						{reference ? (
							<PdfViewer
								key={`${reference.id}-${reference.pageNumber}-${searchPhrase}`}
								documentId={reference.documentId}
								documentName={reference.documentName}
								pageNumber={reference.pageNumber}
								searchPhrase={searchPhrase || "Selected region"}
							/>
						) : (
							<div className="p-4">No reference selected.</div>
						)}
					</Suspense>
				</div>
			</DialogContent>
		</Dialog>
	);
}
