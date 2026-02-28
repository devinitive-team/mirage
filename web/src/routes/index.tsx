import { createFileRoute } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";

import {
	REFERENCE_LIST_ITEM_HEIGHT,
	type ReferenceListItemData,
	ReferenceListItem,
} from "#/components/ReferenceListItem";
import { Input } from "#/components/ui/input";
import {
	useDeleteDocument,
	useDocuments,
	useUploadDocument,
} from "#/hooks/documents";

export const Route = createFileRoute("/")({ component: Dashboard });

const REFERENCE_ROW_HEIGHT = REFERENCE_LIST_ITEM_HEIGHT + 8;

const REFERENCE_FILES = [
	"2025_Annual_Report.pdf",
	"Market_Sizing_Notes.pdf",
	"Customer_Interviews_Q4.pdf",
	"Implementation_Roadmap.pdf",
];

const SEARCH_PHRASES = [
	"operating margin",
	"renewal rate",
	"response latency",
	"compliance controls",
];

const EXCERPT_TEMPLATES = [
	"The document notes that {phrase} improved after the second release window. The same section compares current outcomes against last quarter baselines and includes caveats about sample size and collection methodology.",
	"In the methodology appendix, {phrase} is used as the primary indicator for deciding whether a rollout can continue. The author highlights a threshold and lists scenarios where manual review is still required.",
	"The risk section references {phrase} during dependency analysis. It explains which assumptions hold for enterprise accounts and where additional verification is required before publishing results.",
	"A summary paragraph ties {phrase} to user-facing outcomes and prioritization. The recommendation is to monitor this signal weekly and correlate shifts with support load and incident trends.",
];

const DUMMY_RESULTS: ReferenceListItemData[] = Array.from(
	{ length: 500 },
	(_, i) => {
		const searchPhrase = SEARCH_PHRASES[i % SEARCH_PHRASES.length];
		return {
			id: i,
			documentName: REFERENCE_FILES[i % REFERENCE_FILES.length],
			pageNumber: (i % 47) + 1,
			searchPhrase,
			excerpt: EXCERPT_TEMPLATES[i % EXCERPT_TEMPLATES.length].replaceAll(
				"{phrase}",
				searchPhrase,
			),
		};
	},
);

const STATUS_LABEL: Record<string, string> = {
	pending: "Pending",
	ocr: "OCR",
	indexing: "Indexing",
	ready: "Ready",
	failed: "Failed",
};

function Dashboard() {
	const [searchQuery, setSearchQuery] = useState("");
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const parentRef = useRef<HTMLDivElement>(null);
	const inputId = useId();

	const { data: documents = [], isLoading } = useDocuments();
	const upload = useUploadDocument();
	const remove = useDeleteDocument();

	const filteredDocuments = documents.filter((d) =>
		d.name.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	const rowVirtualizer = useVirtualizer({
		count: DUMMY_RESULTS.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => REFERENCE_ROW_HEIGHT,
		overscan: 8,
	});

	const handleFiles = useCallback(
		async (files: FileList | null) => {
			if (!files) return;
			await Promise.all(Array.from(files).map((f) => upload.mutateAsync(f)));
		},
		[upload],
	);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragging(false);
			handleFiles(e.dataTransfer.files);
		},
		[handleFiles],
	);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		if (e.currentTarget.contains(e.relatedTarget as Node)) return;
		setIsDragging(false);
	}, []);

	return (
		<section
			className="flex h-full gap-3 p-3 relative"
			aria-label="File upload workspace"
			onDrop={handleDrop}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
		>
			{/* Drag overlay */}
			{isDragging && (
				<div className="absolute inset-0 z-50 m-3 rounded-2xl border-2 border-dashed border-[var(--lagoon)] bg-[var(--lagoon)]/5 backdrop-blur-sm flex flex-col items-center justify-center gap-4 pointer-events-none">
					<div className="rounded-full bg-[var(--lagoon)]/15 p-6">
						<Upload className="w-12 h-12 text-[var(--lagoon)]" />
					</div>
					<p className="text-lg font-semibold text-[var(--sea-ink)]">
						Drop files to upload
					</p>
				</div>
			)}

			<input
				ref={fileInputRef}
				id={inputId}
				type="file"
				accept=".pdf,.doc,.docx,.txt"
				multiple
				className="sr-only"
				onChange={(e) => handleFiles(e.target.files)}
			/>

			{/* Left Panel: Uploaded Files */}
			<aside className="w-72 shrink-0 flex flex-col island-shell rounded-2xl overflow-hidden">
				<div className="p-4 border-b border-[var(--line)] shrink-0">
					<p className="island-kicker mb-3">Uploaded Files</p>
					<div className="relative">
						<Input
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search files..."
							className="pr-8 text-sm"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
							>
								<X className="w-3.5 h-3.5" />
							</button>
						)}
					</div>
				</div>

				<div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
					{isLoading ? (
						<div className="flex items-center justify-center h-full py-8">
							<Loader2 className="w-6 h-6 animate-spin text-[var(--sea-ink-soft)]" />
						</div>
					) : filteredDocuments.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-full gap-2 py-8">
							<FileText className="w-8 h-8 text-[var(--sea-ink-soft)] opacity-30" />
							<p className="text-sm text-[var(--sea-ink-soft)] text-center">
								{documents.length === 0
									? "Drop files anywhere or use the upload button"
									: "No files match your search"}
							</p>
						</div>
					) : (
						filteredDocuments.map((doc) => (
							<div
								key={doc.id}
								className="group flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[var(--sea-ink)]/5 transition-colors"
							>
								<FileText className="w-4 h-4 shrink-0 text-[var(--lagoon-deep)]" />
								<span className="truncate flex-1 text-[var(--sea-ink)]">
									{doc.name}
								</span>
								<span className="text-xs text-[var(--sea-ink-soft)] shrink-0">
									{STATUS_LABEL[doc.status] ?? doc.status}
								</span>
								<button
									type="button"
									onClick={() => remove.mutate(doc.id)}
									className="shrink-0 opacity-0 group-hover:opacity-100 text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)] transition-opacity"
								>
									<X className="w-3.5 h-3.5" />
								</button>
							</div>
						))
					)}
				</div>

				<div className="p-3 border-t border-[var(--line)] shrink-0 space-y-2">
					{documents.length > 0 && (
						<p className="text-xs text-center text-[var(--sea-ink-soft)]">
							{documents.length} file{documents.length !== 1 ? "s" : ""} total
						</p>
					)}
					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						disabled={upload.isPending}
						className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
						style={{
							background:
								"linear-gradient(135deg, var(--lagoon), var(--lagoon-deep))",
							color: "white",
							boxShadow:
								"0 4px 14px rgba(79, 184, 178, 0.35), 0 2px 6px rgba(23, 58, 64, 0.12)",
						}}
					>
						{upload.isPending ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<Upload className="w-4 h-4" />
						)}
						{upload.isPending ? "Uploading..." : "Upload Files"}
					</button>
				</div>
			</aside>

			{/* Main: References */}
			<div className="flex-1 flex flex-col island-shell rounded-2xl overflow-hidden">
				<div className="p-4 border-b border-[var(--line)] shrink-0">
					<p className="island-kicker">References</p>
					<p className="text-xs text-[var(--sea-ink-soft)] mt-1">
						{DUMMY_RESULTS.length} found across documents
					</p>
				</div>

				<div ref={parentRef} className="flex-1 min-h-0 overflow-y-auto p-3">
					<div
						style={{
							height: `${rowVirtualizer.getTotalSize()}px`,
							position: "relative",
						}}
					>
						{rowVirtualizer.getVirtualItems().map((virtualItem) => (
							<div
								key={virtualItem.key}
								style={{
									position: "absolute",
									top: 0,
									left: 0,
									width: "100%",
									height: `${virtualItem.size}px`,
									transform: `translateY(${virtualItem.start}px)`,
								}}
								className="p-1"
							>
								<ReferenceListItem
									reference={DUMMY_RESULTS[virtualItem.index]}
								/>
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
