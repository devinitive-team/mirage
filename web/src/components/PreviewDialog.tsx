import { lazy, Suspense, useState } from "react";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

const PdfViewer = lazy(() =>
	import("./PdfViewer").then((mod) => ({ default: mod.PdfViewer })),
);

export function PreviewDialog() {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<button type="button" className="nav-link">
					Preview
				</button>
			</DialogTrigger>
			<DialogContent className="max-w-[90vw] w-[900px] h-[85vh] max-h-[85vh] p-0">
				<div className="h-full w-full">
					<Suspense fallback={<div className="p-4">Loading PDF viewer...</div>}>
						<PdfViewer />
					</Suspense>
				</div>
			</DialogContent>
		</Dialog>
	);
}
