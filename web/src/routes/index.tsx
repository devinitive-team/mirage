import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useCallback, useId } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FileText, Upload, X } from "lucide-react";

import { Input } from "#/components/ui/input";

export const Route = createFileRoute("/")({ component: Dashboard });

const DUMMY_RESULTS = Array.from({ length: 500 }, (_, i) => ({ id: i }));

function Dashboard() {
	const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const parentRef = useRef<HTMLDivElement>(null);
	const inputId = useId();

	const filteredFiles = uploadedFiles.filter((f) =>
		f.name.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	const rowVirtualizer = useVirtualizer({
		count: DUMMY_RESULTS.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 88,
		overscan: 8,
	});

	const handleFiles = useCallback((files: FileList | null) => {
		if (!files) return;
		const newFiles = Array.from(files);
		setUploadedFiles((prev) => {
			const existingNames = new Set(prev.map((f) => f.name));
			return [...prev, ...newFiles.filter((f) => !existingNames.has(f.name))];
		});
	}, []);

	const removeFile = useCallback((name: string) => {
		setUploadedFiles((prev) => prev.filter((f) => f.name !== name));
	}, []);

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
		<div
			className="flex h-full gap-3 p-3 relative"
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
					{filteredFiles.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-full gap-2 py-8">
							<FileText className="w-8 h-8 text-[var(--sea-ink-soft)] opacity-30" />
							<p className="text-sm text-[var(--sea-ink-soft)] text-center">
								{uploadedFiles.length === 0
									? "Drop files anywhere or use the upload button"
									: "No files match your search"}
							</p>
						</div>
					) : (
						filteredFiles.map((file) => (
							<div
								key={file.name}
								className="group flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[var(--sea-ink)]/5 transition-colors"
							>
								<FileText className="w-4 h-4 shrink-0 text-[var(--lagoon-deep)]" />
								<span className="truncate flex-1 text-[var(--sea-ink)]">
									{file.name}
								</span>
								<span className="text-xs text-[var(--sea-ink-soft)] shrink-0">
									{(file.size / 1024).toFixed(0)}KB
								</span>
								<button
									type="button"
									onClick={() => removeFile(file.name)}
									className="shrink-0 opacity-0 group-hover:opacity-100 text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)] transition-opacity"
								>
									<X className="w-3.5 h-3.5" />
								</button>
							</div>
						))
					)}
				</div>

				<div className="p-3 border-t border-[var(--line)] shrink-0 space-y-2">
					{uploadedFiles.length > 0 && (
						<p className="text-xs text-center text-[var(--sea-ink-soft)]">
							{uploadedFiles.length} file{uploadedFiles.length !== 1 ? "s" : ""}{" "}
							total
						</p>
					)}
					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
						style={{
							background: "linear-gradient(135deg, var(--lagoon), var(--lagoon-deep))",
							color: "white",
							boxShadow: "0 4px 14px rgba(79, 184, 178, 0.35), 0 2px 6px rgba(23, 58, 64, 0.12)",
						}}
					>
						<Upload className="w-4 h-4" />
						Upload Files
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
								<div className="h-full rounded-lg bg-[var(--sea-ink)]/5 border border-[var(--line)]" />
							</div>
						))}
					</div>
				</div>
			</div>

		</div>
	);
}
