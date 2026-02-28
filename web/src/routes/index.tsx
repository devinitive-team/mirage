import { createFileRoute } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
	FileText,
	Loader2,
	MoreHorizontal,
	SendHorizontal,
	Upload,
	X,
} from "lucide-react";
import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";

import { PreviewDialog } from "#/components/PreviewDialog";
import {
	REFERENCE_LIST_ITEM_HEIGHT,
	ReferenceListItem,
	type ReferenceListItemData,
} from "#/components/ReferenceListItem";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Input } from "#/components/ui/input";
import {
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
import { isPdfFile } from "#/lib/pdfFiles";

export const Route = createFileRoute("/")({ component: Dashboard });

const REFERENCE_ROW_HEIGHT = REFERENCE_LIST_ITEM_HEIGHT + 8;

const STATUS_LABEL: Record<string, string> = {
	pending: "Uploaded",
	processing: "Indexing",
	complete: "Ready",
	failed: "Failed",
};

type UploadingFileItem = {
	id: string;
	name: string;
};

function buildUploadedFilePreviewReference(
	documentId: string,
	documentName: string,
): ReferenceListItemData {
	return {
		id: `uploaded-preview:${documentId}`,
		documentId,
		documentName,
		nodeId: "uploaded-file-preview",
		nodeTitle: "Uploaded file preview",
		pageStart: 1,
		pageEnd: 1,
	};
}

function EvidenceLoadingState({ compact = false }: { compact?: boolean }) {
	const animatedDots = (
		<span className="ml-1 inline-flex items-center gap-1 align-middle">
			<span className="h-1.5 w-1.5 rounded-full bg-[var(--sea-ink-soft)]/85 animate-bounce" />
			<span className="h-1.5 w-1.5 rounded-full bg-[var(--sea-ink-soft)]/70 animate-bounce [animation-delay:120ms]" />
			<span className="h-1.5 w-1.5 rounded-full bg-[var(--sea-ink-soft)]/55 animate-bounce [animation-delay:240ms]" />
		</span>
	);

	if (compact) {
		return (
			<section className="mb-3 rounded-xl border border-[var(--line)] bg-[var(--surface-strong)]/90 p-3">
				<div className="flex items-center gap-2 text-sm font-medium text-[var(--sea-ink)]">
					<Loader2 className="h-4 w-4 animate-spin text-[var(--lagoon-deep)]" />
					<span>
						Collecting evidence from ready files
						{animatedDots}
					</span>
				</div>
			</section>
		);
	}

	return (
		<div className="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)]/95 p-5 shadow-sm">
			<div className="flex items-center gap-3">
				<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--lagoon)]/10">
					<Loader2 className="h-4 w-4 animate-spin text-[var(--lagoon-deep)]" />
				</div>
				<div className="min-w-0">
					<p className="text-sm font-semibold text-[var(--sea-ink)]">
						Waiting for evidence from the backend
						{animatedDots}
					</p>
					<p className="text-xs text-[var(--sea-ink-soft)]">
						Searching uploaded PDFs and preparing highlighted references.
					</p>
				</div>
			</div>
			<div className="space-y-2">
				<div className="h-2 w-full rounded-full bg-[var(--lagoon)]/12 animate-pulse" />
				<div className="h-2 w-5/6 rounded-full bg-[var(--lagoon)]/10 animate-pulse [animation-delay:120ms]" />
				<div className="h-2 w-2/3 rounded-full bg-[var(--lagoon)]/8 animate-pulse [animation-delay:240ms]" />
			</div>
		</div>
	);
}

function createUploadingFileId(file: File): string {
	return `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	if (target.isContentEditable) return true;
	const tag = target.tagName.toLowerCase();
	return tag === "input" || tag === "textarea" || tag === "select";
}

function Dashboard() {
	const [searchQuery, setSearchQuery] = useState("");
	const [isDragging, setIsDragging] = useState(false);
	const [uploadingFiles, setUploadingFiles] = useState<UploadingFileItem[]>([]);
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);
	const [selectedReference, setSelectedReference] =
		useState<ReferenceListItemData | null>(null);
	const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
	const [references, setReferences] = useState<ReferenceListItemData[]>([]);
	const [question, setQuestion] = useState("");
	const [queryAnswer, setQueryAnswer] = useState("");
	const [isQuerying, setIsQuerying] = useState(false);
	const [treeTitlesByDocument, setTreeTitlesByDocument] =
		useState<NodeTitleLookupByDocument>({});
	const fileInputRef = useRef<HTMLInputElement>(null);
	const parentRef = useRef<HTMLDivElement>(null);
	const inputId = useId();

	const { data: documents = [], isLoading } = useDocuments();
	const upload = useUploadDocument();
	const removeMany = useDeleteDocuments();

	const documentsById = useMemo(() => {
		const map = new Map<string, (typeof documents)[number]>();
		for (const document of documents) {
			map.set(document.id, document);
		}
		return map;
	}, [documents]);

	const filteredDocuments = documents.filter((document) =>
		document.name.toLowerCase().includes(searchQuery.toLowerCase()),
	);
	const filteredUploadingFiles = useMemo(
		() =>
			uploadingFiles.filter((file) =>
				file.name.toLowerCase().includes(searchQuery.toLowerCase()),
			),
		[searchQuery, uploadingFiles],
	);
	const filteredDocumentIds = useMemo(
		() => filteredDocuments.map((document) => document.id),
		[filteredDocuments],
	);
	const selectedCount = selectedDocumentIds.length;
	const allFilesSelected =
		documents.length > 0 && selectedCount === documents.length;
	const uploadingCount = uploadingFiles.length;
	const totalFileCount = documents.length + uploadingCount;
	const processingCount = documents.filter((document) =>
		["pending", "processing"].includes(document.status),
	).length;
	const isDeleting = removeMany.isPending;

	const visibleDocumentIDs = useMemo(
		() => new Set(filteredDocuments.map((document) => document.id)),
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
	const queryScopeLabel = useMemo(() => {
		if (queryableDocumentIDs.length === 0) {
			if (processingCount > 0) {
				const plural = processingCount === 1 ? "" : "s";
				return `${processingCount} file${plural} still indexing`;
			}
			if (uploadingCount > 0) {
				const plural = uploadingCount === 1 ? "" : "s";
				return `${uploadingCount} file${plural} uploading`;
			}
			return "No ready files";
		}
		if (selectedCompleteDocumentIDs.length > 0) {
			const plural = selectedCompleteDocumentIDs.length === 1 ? "" : "s";
			return `${selectedCompleteDocumentIDs.length} selected ready file${plural}`;
		}
		return `All ready files (${allCompleteDocumentIDs.length})`;
	}, [
		allCompleteDocumentIDs.length,
		processingCount,
		queryableDocumentIDs.length,
		selectedCompleteDocumentIDs.length,
		uploadingCount,
	]);

	useEffect(() => {
		const availableIds = new Set(documents.map((document) => document.id));
		setSelectedDocumentIds((current) =>
			current.filter((id) => availableIds.has(id)),
		);
		setReferences((current) =>
			current.filter((reference) => availableIds.has(reference.documentId)),
		);
		setTreeTitlesByDocument((current) => {
			let changed = false;
			const next: NodeTitleLookupByDocument = {};
			for (const [documentID, titleLookup] of Object.entries(current)) {
				if (!availableIds.has(documentID)) {
					changed = true;
					continue;
				}
				next[documentID] = titleLookup;
			}
			return changed ? next : current;
		});
		setSelectedReference((current) => {
			if (!current) return current;
			return availableIds.has(current.documentId) ? current : null;
		});
	}, [documents]);

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
					if (!isPdfFile(file)) {
						toast.error(
							`"${file.name}" is not a PDF file. Please upload a .pdf document.`,
						);
						return;
					}
					const uploadingFileId = createUploadingFileId(file);
					setUploadingFiles((current) => [
						...current,
						{ id: uploadingFileId, name: file.name },
					]);
					try {
						const uploadedDocument = await upload.mutateAsync(file);
						toast.success(`Uploaded "${uploadedDocument.name}"`);
					} catch {
						toast.error(`Failed to upload "${file.name}"`);
					} finally {
						setUploadingFiles((current) =>
							current.filter((item) => item.id !== uploadingFileId),
						);
					}
				}),
			);
		},
		[upload],
	);

	const handleDrop = useCallback(
		(event: React.DragEvent) => {
			event.preventDefault();
			setIsDragging(false);
			void handleFiles(event.dataTransfer.files);
		},
		[handleFiles],
	);

	const handleDragOver = useCallback((event: React.DragEvent) => {
		event.preventDefault();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((event: React.DragEvent) => {
		if (event.currentTarget.contains(event.relatedTarget as Node)) return;
		setIsDragging(false);
	}, []);

	const handlePreview = useCallback((reference: ReferenceListItemData) => {
		setSelectedReference(reference);
		setIsPreviewOpen(true);
	}, []);

	const handleUploadedFilePreview = useCallback(
		(documentId: string, documentName: string) => {
			handlePreview(
				buildUploadedFilePreviewReference(documentId, documentName),
			);
		},
		[handlePreview],
	);

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

	const selectVisibleFiles = useCallback(() => {
		setSelectedDocumentIds((current) => {
			if (filteredDocumentIds.length === 0) return current;
			const next = new Set(current);
			for (const id of filteredDocumentIds) next.add(id);
			return Array.from(next);
		});
	}, [filteredDocumentIds]);

	const clearSelection = useCallback(() => {
		setSelectedDocumentIds([]);
	}, []);

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
		const idsToDelete = documents.map((document) => document.id);
		try {
			await removeMany.mutateAsync(idsToDelete);
			setSelectedDocumentIds([]);
			setReferences([]);
			setTreeTitlesByDocument({});
			setSelectedReference(null);
			setQueryAnswer("");
			const plural = idsToDelete.length === 1 ? "" : "s";
			toast.success(`Deleted all ${idsToDelete.length} file${plural}`);
		} catch {
			toast.error("Failed to delete all files");
		}
	}, [documents, removeMany]);

	const handleMenuDeleteSelected = useCallback(() => {
		void handleDeleteSelected();
	}, [handleDeleteSelected]);

	const handleMenuDeleteAll = useCallback(() => {
		void handleDeleteAll();
	}, [handleDeleteAll]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.defaultPrevented) return;
			if (isInteractiveTarget(event.target)) return;
			if (!(event.metaKey || event.ctrlKey)) return;
			if (event.shiftKey || event.altKey) return;
			if (event.repeat) return;

			switch (event.code) {
				case "KeyA": {
					if (isDeleting) return;
					event.preventDefault();
					if (allFilesSelected) {
						clearSelection();
						return;
					}
					if (filteredDocumentIds.length === 0) return;
					selectVisibleFiles();
					return;
				}
				default:
					return;
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [
		allFilesSelected,
		clearSelection,
		filteredDocumentIds.length,
		isDeleting,
		selectVisibleFiles,
	]);

	const handleRunQuery = useCallback(async () => {
		const trimmedQuestion = question.trim();
		if (!trimmedQuestion) {
			toast.error("Enter a question first.");
			return;
		}
		if (queryableDocumentIDs.length === 0) {
			setReferences([]);
			setQueryAnswer("");
			toast.error("No ready documents to query.");
			return;
		}

		setIsQuerying(true);
		try {
			let mergedTreeTitlesByDocument = treeTitlesByDocument;
			const missingTreeDocumentIDs = queryableDocumentIDs.filter(
				(documentID) => !treeTitlesByDocument[documentID],
			);
			if (missingTreeDocumentIDs.length > 0) {
				const fetchedTreeEntries = await Promise.all(
					missingTreeDocumentIDs.map(async (documentID) => {
						try {
							const tree = await getDocumentTree(documentID);
							return [documentID, buildNodeTitleLookup(tree)] as const;
						} catch {
							return null;
						}
					}),
				);

				const fetchedTreeTitles: NodeTitleLookupByDocument = {};
				for (const entry of fetchedTreeEntries) {
					if (!entry) continue;
					const [documentID, titleLookup] = entry;
					fetchedTreeTitles[documentID] = titleLookup;
				}
				if (Object.keys(fetchedTreeTitles).length > 0) {
					mergedTreeTitlesByDocument = {
						...treeTitlesByDocument,
						...fetchedTreeTitles,
					};
					setTreeTitlesByDocument((current) => ({
						...current,
						...fetchedTreeTitles,
					}));
				}
			}

			const result = await queryDocuments({
				document_ids: queryableDocumentIDs,
				question: trimmedQuestion,
			});

			setQueryAnswer(result.answer);
			const nextReferences = evidenceListToReferences(
				result.evidence ?? [],
				mergedTreeTitlesByDocument,
			);
			setReferences(nextReferences);
			setSelectedReference((current) => {
				if (!current) return current;
				return nextReferences.some((reference) => reference.id === current.id)
					? current
					: null;
			});
		} catch {
			toast.error("Failed to run query.");
		}
		setIsQuerying(false);
	}, [question, queryableDocumentIDs, treeTitlesByDocument]);

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
				onChange={(event) => void handleFiles(event.target.files)}
			/>

			<aside className="w-72 shrink-0 flex flex-col island-shell rounded-2xl overflow-hidden">
				<div className="p-4 border-b border-[var(--line)] shrink-0">
					<p className="island-kicker mb-3">Uploaded Files</p>
					<div className="relative">
						<Input
							value={searchQuery}
							onChange={(event) => setSearchQuery(event.target.value)}
							placeholder="Search files..."
							className="pr-8 text-sm"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--sea-ink-soft)] transition-colors hover:bg-[var(--sea-ink)]/8 hover:text-[var(--sea-ink)]"
							>
								<X className="w-3.5 h-3.5" />
							</button>
						)}
					</div>
					{documents.length > 0 && (
						<div className="mt-3 flex items-center justify-end">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										type="button"
										className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-2 py-1 text-xs font-medium text-[var(--sea-ink)] hover:bg-[var(--sea-ink)]/5"
									>
										<MoreHorizontal className="h-4 w-4" />
										Actions
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-56">
									<DropdownMenuItem
										onSelect={selectVisibleFiles}
										disabled={isDeleting || filteredDocumentIds.length === 0}
										className="text-xs"
									>
										<span>Select all visible files</span>
										<DropdownMenuShortcut>⌘A</DropdownMenuShortcut>
									</DropdownMenuItem>
									<DropdownMenuItem
										onSelect={clearSelection}
										disabled={isDeleting || selectedCount === 0}
										className="text-xs"
									>
										<span>Clear selected files</span>
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onSelect={handleMenuDeleteSelected}
										disabled={isDeleting || selectedCount === 0}
										className="text-xs text-red-700 focus:text-red-700 dark:text-red-300 dark:focus:text-red-300"
									>
										<span>
											{removeMany.isPending
												? "Deleting..."
												: `Delete selected (${selectedCount})`}
										</span>
									</DropdownMenuItem>
									<DropdownMenuItem
										onSelect={handleMenuDeleteAll}
										disabled={isDeleting || documents.length === 0}
										className="text-xs text-red-700 focus:text-red-700 dark:text-red-300 dark:focus:text-red-300"
									>
										<span>
											{removeMany.isPending
												? "Deleting..."
												: `Delete all (${documents.length})`}
										</span>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					)}
				</div>

				<div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
					{isLoading && documents.length === 0 && uploadingCount === 0 ? (
						<div className="flex items-center justify-center h-full py-8">
							<Loader2 className="w-6 h-6 animate-spin text-[var(--sea-ink-soft)]" />
						</div>
					) : filteredUploadingFiles.length === 0 &&
						filteredDocuments.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-full gap-2 py-8">
							<FileText className="w-8 h-8 text-[var(--sea-ink-soft)] opacity-30" />
							<p className="text-sm text-[var(--sea-ink-soft)] text-center">
								{totalFileCount === 0
									? "Drop files anywhere or use the upload button"
									: "No files match your search"}
							</p>
						</div>
					) : (
						<>
							{filteredUploadingFiles.map((file) => (
								<div
									key={file.id}
									className="flex items-center gap-2 rounded-lg border border-sky-300/40 bg-sky-50/40 px-3 py-2 text-sm dark:border-sky-700/45 dark:bg-sky-950/20"
								>
									<span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
										<Loader2 className="h-3 w-3 animate-spin text-sky-700 dark:text-sky-300" />
									</span>
									<div className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1">
										<FileText className="h-4 w-4 shrink-0 text-sky-700 dark:text-sky-300" />
										<div className="min-w-0 flex-1">
											<span className="block truncate text-[var(--sea-ink)]">
												{file.name}
											</span>
											<span className="relative mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-sky-200/55 dark:bg-sky-900/35">
												<span className="absolute inset-y-0 left-[-55%] w-1/2 rounded-full bg-sky-500/80 animate-[file-uploading_0.9s_linear_infinite]" />
											</span>
										</div>
										<span className="shrink-0 text-[11px] font-medium text-sky-700 dark:text-sky-300">
											Uploading
										</span>
									</div>
								</div>
							))}
							{filteredDocuments.map((document) => {
								const isPendingStatus = document.status === "pending";
								const isProcessingStatus =
									isPendingStatus || document.status === "processing";
								const statusTextClass =
									document.status === "complete"
										? "text-emerald-700 dark:text-emerald-300"
										: document.status === "failed"
											? "text-red-700 dark:text-red-300"
											: isPendingStatus
												? "text-amber-700 dark:text-amber-300"
												: "text-[var(--sea-ink-soft)]";
								const statusText = isProcessingStatus
									? isPendingStatus
										? "Queued"
										: "Indexing"
									: (STATUS_LABEL[document.status] ?? document.status);
								const loadingTrackClass = isPendingStatus
									? "bg-amber-300/35 dark:bg-amber-900/35"
									: "bg-[var(--lagoon)]/12";
								const loadingBarClass = isPendingStatus
									? "bg-amber-500/80 animate-[file-indexing_1.45s_ease-in-out_infinite]"
									: "bg-[var(--lagoon)]/70 animate-[file-indexing_1.05s_ease-in-out_infinite]";
								const loadingBarWidthClass = isPendingStatus
									? "w-1/4"
									: "w-2/5";
								return (
									<div
										key={document.id}
										className={`group flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm transition-colors ${
											selectedDocumentIds.includes(document.id)
												? "bg-[var(--lagoon)]/10 hover:bg-[var(--lagoon)]/15"
												: "hover:bg-[var(--sea-ink)]/5 hover:border-[var(--line)]"
										}`}
									>
										<input
											type="checkbox"
											checked={selectedDocumentIds.includes(document.id)}
											onChange={() => toggleDocumentSelection(document.id)}
											disabled={isDeleting}
											aria-label={`Select ${document.name}`}
											className="h-3.5 w-3.5 shrink-0 rounded border-[var(--line)] text-[var(--lagoon)] focus:ring-[var(--lagoon)]"
										/>
										<button
											type="button"
											onClick={() =>
												handleUploadedFilePreview(document.id, document.name)
											}
											aria-label={`Preview ${document.name}`}
											className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-[var(--lagoon)]/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lagoon)]"
										>
											<FileText className="w-4 h-4 shrink-0 text-[var(--lagoon-deep)]" />
											<div className="min-w-0 flex-1">
												<span className="block truncate text-[var(--sea-ink)]">
													{document.name}
												</span>
												{isProcessingStatus ? (
													<span
														className={`relative mt-1 block h-1.5 w-full overflow-hidden rounded-full ${loadingTrackClass}`}
													>
														<span
															className={`absolute inset-y-0 left-[-45%] rounded-full ${loadingBarClass} ${loadingBarWidthClass}`}
														/>
													</span>
												) : null}
											</div>
											<span
												className={`shrink-0 text-[11px] font-medium ${statusTextClass}`}
											>
												{statusText}
											</span>
										</button>
									</div>
								);
							})}
						</>
					)}
				</div>

				<div className="p-3 border-t border-[var(--line)] shrink-0 space-y-2">
					{totalFileCount > 0 && (
						<p className="text-xs text-center text-[var(--sea-ink-soft)]">
							{totalFileCount} file{totalFileCount !== 1 ? "s" : ""} total
							{selectedCount > 0 ? ` • ${selectedCount} selected` : ""}
							{uploadingCount > 0 ? ` • ${uploadingCount} uploading` : ""}
							{processingCount > 0 ? ` • ${processingCount} indexing` : ""}
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
					{isQuerying && visibleReferences.length > 0 ? (
						<EvidenceLoadingState compact />
					) : null}

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
							{isQuerying ? (
								<EvidenceLoadingState />
							) : (
								<p className="text-sm text-[var(--sea-ink-soft)]">
									Run a query to populate evidence references.
								</p>
							)}
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
