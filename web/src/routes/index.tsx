import { createFileRoute } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";

import {
	REFERENCE_LIST_ITEM_HEIGHT,
	type ReferenceListItemData,
	ReferenceListItem,
} from "#/components/ReferenceListItem";
import { PreviewDialog } from "#/components/PreviewDialog";
import { Input } from "#/components/ui/input";
import {
	useDeleteDocument,
	useDeleteDocuments,
	useDocuments,
	useUploadDocument,
} from "#/hooks/documents";
import { getDocumentTree, queryDocuments } from "#/lib/api";
import {
	buildNodeTitleLookup,
	evidenceListToReferences,
	type NodeTitleLookupByDocument,
} from "#/lib/evidence";

export const Route = createFileRoute("/")({ component: Dashboard });

const REFERENCE_ROW_HEIGHT = REFERENCE_LIST_ITEM_HEIGHT + 8;

const STATUS_LABEL: Record<string, string> = {
	pending: "Uploaded",
	processing: "Processing",
	complete: "Ready",
	failed: "Failed",
};

const FILE_ACTION_BUTTON_CLASS =
	"rounded-lg border border-[var(--line)] px-2 py-1 text-xs font-medium text-[var(--sea-ink)] hover:bg-[var(--sea-ink)]/5 disabled:cursor-not-allowed disabled:opacity-60";

const FILE_ACTION_DESTRUCTIVE_BUTTON_CLASS =
	"rounded-lg border border-red-200 bg-red-50/70 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100/70 disabled:cursor-not-allowed disabled:opacity-60";

function Dashboard() {
	const [searchQuery, setSearchQuery] = useState("");
	const [isDragging, setIsDragging] = useState(false);
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);
	const [selectedReference, setSelectedReference] =
		useState<ReferenceListItemData | null>(null);
	const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
	const [referenceByDocumentId, setReferenceByDocumentId] = useState<
		Record<string, ReferenceListItemData>
	>({});
	const [referenceBuildCount, setReferenceBuildCount] = useState(0);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const parentRef = useRef<HTMLDivElement>(null);
	const referenceRefreshInFlightRef = useRef<Set<string>>(new Set());
	const inputId = useId();

	const { data: documents = [], isLoading } = useDocuments();
	const upload = useUploadDocument();
	const remove = useDeleteDocument();
	const removeMany = useDeleteDocuments();

	const documentsById = useMemo(() => {
		const map = new Map<string, (typeof documents)[number]>();
		for (const document of documents) {
			map.set(document.id, document);
		}
		return map;
	}, [documents]);

	const filteredDocuments = documents.filter((d) =>
		d.name.toLowerCase().includes(searchQuery.toLowerCase()),
	);
	const filteredDocumentIds = useMemo(
		() => filteredDocuments.map((doc) => doc.id),
		[filteredDocuments],
	);
	const selectedCount = selectedDocumentIds.length;
	const selectedVisibleCount = filteredDocumentIds.filter((id) =>
		selectedDocumentIds.includes(id),
	).length;
	const allVisibleSelected =
		filteredDocumentIds.length > 0 &&
		selectedVisibleCount === filteredDocumentIds.length;
	const isDeleting = remove.isPending || removeMany.isPending;

	const visibleDocumentIDs = useMemo(
		() => new Set(filteredDocuments.map((doc) => doc.id)),
		[filteredDocuments],
	);
	const visibleReferences = useMemo(
		() =>
			references.filter((reference) =>
				visibleDocumentIDs.has(reference.documentId),
			),
		[references, visibleDocumentIDs],
	);
	const selectedCompleteDocumentIDs = useMemo(
		() =>
			selectedDocumentIds.filter(
				(id) => documentsById.get(id)?.status === "complete",
			),
		[documentsById, selectedDocumentIds],
	);
	const allCompleteDocumentIDs = useMemo(
		() =>
			documents
				.filter((document) => document.status === "complete")
				.map((document) => document.id),
		[documents],
	);
	const queryableDocumentIDs =
		selectedCompleteDocumentIDs.length > 0
			? selectedCompleteDocumentIDs
			: allCompleteDocumentIDs;

	useEffect(() => {
		const availableIds = new Set(documents.map((doc) => doc.id));
		setSelectedDocumentIds((current) =>
			current.filter((id) => availableIds.has(id)),
		);
		setReferences((current) =>
			current.filter((reference) => availableIds.has(reference.documentId)),
		);
		setTreeTitlesByDocument((current) => {
			let changed = false;
			const next: NodeTitleLookupByDocument = {};
			for (const [docID, titleLookup] of Object.entries(current)) {
				if (!availableIds.has(docID)) {
					changed = true;
					continue;
				}
				next[docID] = titleLookup;
			}
			return changed ? next : current;
		});
		setSelectedReference((current) => {
			if (!current) return current;
			return availableIds.has(current.documentId) ? current : null;
		});
	}, [documents]);

	useEffect(() => {
		let isCancelled = false;
		const docsNeedingReference = documents.filter(
			(doc) =>
				doc.status === "complete" &&
				!referenceByDocumentId[doc.id] &&
				!referenceRefreshInFlightRef.current.has(doc.id),
		);

		for (const doc of docsNeedingReference) {
			referenceRefreshInFlightRef.current.add(doc.id);
			setReferenceBuildCount((current) => current + 1);
			void (async () => {
				try {
					const pageCount = Math.max(1, doc.page_count);
					const pageNumber = 1 + Math.floor(Math.random() * pageCount);
					const area = buildRandomReferenceArea(pageNumber);
					const randomPreview = {
						pageNumber,
						area,
						areaLabel: formatAreaLabel(area),
					};
					if (isCancelled) return;
					const referenceID = buildReferenceID(doc.id, randomPreview);
					setReferenceByDocumentId((current) => ({
						...current,
						[doc.id]: {
							id: referenceID,
							documentId: doc.id,
							documentName: doc.name,
							pageNumber: randomPreview.pageNumber,
							areaLabel: randomPreview.areaLabel,
						},
					}));
				} finally {
					referenceRefreshInFlightRef.current.delete(doc.id);
					if (!isCancelled) {
						setReferenceBuildCount((current) => Math.max(0, current - 1));
					}
				}
			})();
		}

		return () => {
			isCancelled = true;
		};
	}, [documents, referenceByDocumentId]);

	const rowVirtualizer = useVirtualizer({
		count: visibleReferences.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => REFERENCE_ROW_HEIGHT,
		overscan: 8,
	});

	const handleFiles = useCallback(
		async (files: FileList | null) => {
			if (!files) return;
			await Promise.all(
				Array.from(files).map(async (file) => {
					try {
						const uploadedDocument = await upload.mutateAsync(file);
						toast.success(`Uploaded "${uploadedDocument.name}"`);
						let randomPreview: Awaited<
							ReturnType<typeof buildRandomReferenceFromPdfFile>
						> = null;
						try {
							randomPreview = await buildRandomReferenceFromPdfFile(file);
						} catch {
							randomPreview = null;
						}
						if (!randomPreview) return;

						const referenceID = buildReferenceID(
							uploadedDocument.id,
							randomPreview,
						);
						setReferenceByDocumentId((current) => ({
							...current,
							[uploadedDocument.id]: {
								id: referenceID,
								documentId: uploadedDocument.id,
								documentName: uploadedDocument.name,
								pageNumber: randomPreview.pageNumber,
								areaLabel: randomPreview.areaLabel,
							},
						}));
					} catch {
						toast.error(`Failed to upload "${file.name}"`);
					} finally {
						setReferenceBuildCount((current) => Math.max(0, current - 1));
					}
				}),
			);
		},
		[upload],
	);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragging(false);
			void handleFiles(e.dataTransfer.files);
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

	const toggleDocumentSelection = useCallback((id: string) => {
		setSelectedDocumentIds((current) =>
			current.includes(id)
				? current.filter((selectedId) => selectedId !== id)
				: [...current, id],
		);
	}, []);

	const toggleVisibleSelection = useCallback(() => {
		setSelectedDocumentIds((current) => {
			if (filteredDocumentIds.length === 0) return current;
			const visibleSet = new Set(filteredDocumentIds);
			const selectedVisible = filteredDocumentIds.filter((id) =>
				current.includes(id),
			);
			if (selectedVisible.length === filteredDocumentIds.length) {
				return current.filter((id) => !visibleSet.has(id));
			}
			const next = new Set(current);
			for (const id of filteredDocumentIds) next.add(id);
			return Array.from(next);
		});
	}, [filteredDocumentIds]);

	const clearSelection = useCallback(() => {
		setSelectedDocumentIds([]);
	}, []);

	const handleDeleteSingle = useCallback(
		async (id: string, name: string) => {
			setSelectedDocumentIds((current) =>
				current.filter((selectedId) => selectedId !== id),
			);
			try {
				await remove.mutateAsync(id);
				toast.success(`Deleted "${name}"`);
			} catch {
				toast.error(`Failed to delete "${name}"`);
			}
		},
		[remove],
	);

	const handleDeleteSelected = useCallback(async () => {
		if (selectedCount === 0) return;
		const idsToDelete = [...selectedDocumentIds];
		try {
			await removeMany.mutateAsync(idsToDelete);
			setSelectedDocumentIds([]);
			const plural = idsToDelete.length === 1 ? "" : "s";
			toast.success(`Deleted ${idsToDelete.length} file${plural}`);
		} catch {
			toast.error("Failed to delete selected files");
		}
	}, [removeMany, selectedCount, selectedDocumentIds]);

	const handleDeleteAll = useCallback(async () => {
		if (documents.length === 0) return;
		const idsToDelete = documents.map((doc) => doc.id);
		try {
			await removeMany.mutateAsync(idsToDelete);
			setSelectedDocumentIds([]);
			setReferences([]);
			setSelectedReference(null);
			setQueryAnswer("");
			const plural = idsToDelete.length === 1 ? "" : "s";
			toast.success(`Deleted all ${idsToDelete.length} file${plural}`);
		} catch {
			toast.error("Failed to delete all files");
		}
	}, [documents, removeMany]);
	return (
		<section
			className="flex h-full gap-3 p-3 relative"
			aria-label="File upload workspace"
			onDrop={handleDrop}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
		>
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
				accept=".pdf,application/pdf"
				multiple
				className="sr-only"
				onChange={(e) => void handleFiles(e.target.files)}
			/>

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
					{documents.length > 0 && (
						<div className="mt-3 flex flex-wrap items-center gap-2">
							<button
								type="button"
								onClick={toggleVisibleSelection}
								disabled={isDeleting || filteredDocumentIds.length === 0}
								className={FILE_ACTION_BUTTON_CLASS}
							>
								{allVisibleSelected ? "Clear visible" : "Select visible"}
							</button>
							<button
								type="button"
								onClick={clearSelection}
								disabled={isDeleting || selectedCount === 0}
								className={FILE_ACTION_BUTTON_CLASS}
							>
								Clear selection
							</button>
							<button
								type="button"
								onClick={handleDeleteSelected}
								disabled={isDeleting || selectedCount === 0}
								className={FILE_ACTION_DESTRUCTIVE_BUTTON_CLASS}
							>
								{removeMany.isPending
									? "Deleting..."
									: `Delete selected (${selectedCount})`}
							</button>
							<button
								type="button"
								onClick={handleDeleteAll}
								disabled={isDeleting || documents.length === 0}
								className={FILE_ACTION_DESTRUCTIVE_BUTTON_CLASS}
							>
								{removeMany.isPending ? "Deleting..." : "Delete all"}
							</button>
						</div>
					)}
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
								className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
									selectedDocumentIds.includes(doc.id)
										? "bg-[var(--lagoon)]/10"
										: "hover:bg-[var(--sea-ink)]/5"
								}`}
							>
								<input
									type="checkbox"
									checked={selectedDocumentIds.includes(doc.id)}
									onChange={() => toggleDocumentSelection(doc.id)}
									disabled={isDeleting}
									aria-label={`Select ${doc.name}`}
									className="h-3.5 w-3.5 shrink-0 rounded border-[var(--line)] text-[var(--lagoon)] focus:ring-[var(--lagoon)]"
								/>
								<FileText className="w-4 h-4 shrink-0 text-[var(--lagoon-deep)]" />
								<span className="truncate flex-1 text-[var(--sea-ink)]">
									{doc.name}
								</span>
								<span className="text-xs text-[var(--sea-ink-soft)] shrink-0">
									{STATUS_LABEL[doc.status] ?? doc.status}
								</span>
								<button
									type="button"
									onClick={() => void handleDeleteSingle(doc.id, doc.name)}
									disabled={isDeleting}
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
							{selectedCount > 0 ? ` • ${selectedCount} selected` : ""}
						</p>
					)}
					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						disabled={upload.isPending}
						className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary dark:bg-white dark:text-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:scale-[1.02] hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
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

			<div className="flex-1 flex flex-col island-shell rounded-2xl overflow-hidden">
				<div className="p-4 border-b border-[var(--line)] shrink-0 space-y-3">
					<div>
						<p className="island-kicker">Query Evidence</p>
						<p className="text-xs text-[var(--sea-ink-soft)] mt-1">
							Scope: {queryScopeLabel}
						</p>
					</div>

					<div className="flex items-center gap-2">
						<Input
							value={question}
							onChange={(event) => setQuestion(event.target.value)}
							placeholder="Ask a question across ready documents..."
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									event.preventDefault();
									void handleRunQuery();
								}
							}}
						/>
						<button
							type="button"
							onClick={() => void handleRunQuery()}
							disabled={isQuerying}
							className="shrink-0 rounded-lg bg-primary dark:bg-white dark:text-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
						>
							{isQuerying ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								<SendHorizontal className="w-4 h-4" />
							)}
						</button>
					</div>
				</div>

				<div ref={parentRef} className="flex-1 min-h-0 overflow-y-auto p-3">
					{queryAnswer ? (
						<section className="mb-3 rounded-xl border border-[var(--line)] bg-white/70 p-3">
							<p className="text-xs uppercase tracking-wide text-[var(--sea-ink-soft)]">
								Answer
							</p>
							<p className="mt-1 whitespace-pre-wrap text-sm text-[var(--sea-ink)]">
								{queryAnswer}
							</p>
						</section>
					) : null}

					{visibleReferences.length === 0 ? (
						<div className="h-full flex items-center justify-center px-8 text-center">
							<p className="text-sm text-[var(--sea-ink-soft)]">
								{isQuerying
									? "Running query and collecting evidence..."
									: "Run a query to populate evidence references."}
							</p>
						</div>
					) : (
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
										reference={visibleReferences[virtualItem.index]}
										onPreview={handlePreview}
									/>
								</div>
							))}
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
