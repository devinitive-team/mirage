import { useState } from "react";
import { cn } from "#/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface FileUploadProps {
	onFileSelect?: (files: File[]) => void;
	accept?: string;
	multiple?: boolean;
	className?: string;
}

export function FileUpload({
	onFileSelect,
	accept = "*",
	multiple = true,
	className,
}: FileUploadProps) {
	const [files, setFiles] = useState<File[]>([]);
	const inputId = `file-upload-${Math.random().toString(36).slice(2, 9)}`;

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
		setFiles(selectedFiles);
		onFileSelect?.(selectedFiles);
	};

	const clearFiles = () => {
		setFiles([]);
	};

	return (
		<div className={cn("space-y-4", className)}>
			<div
				className={cn(
					"relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-16 transition-colors",
					"border-[var(--sea-ink-soft)]/30 hover:border-[var(--sea-ink-soft)]",
					files.length > 0 && "border-solid border-[var(--sea-ink-soft)]",
				)}
			>
				<label
					htmlFor={inputId}
					className="flex flex-col items-center justify-center gap-3 text-center cursor-pointer w-full h-full absolute inset-0 p-16"
				>
					<div className="rounded-full bg-[var(--sea-ink)]/10 p-3">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							className="text-[var(--sea-ink)]"
							aria-hidden="true"
						>
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
							<polyline points="17 8 12 3 7 8" />
							<line x1="12" x2="12" y1="3" y2="15" />
						</svg>
					</div>
					<div className="space-y-1">
						<p className="text-sm font-medium text-[var(--sea-ink)]">
							Drag and drop your files here
						</p>
						<p className="text-xs text-[var(--sea-ink-soft)]">
							or click to browse from your computer
						</p>
					</div>
					<Input
						id={inputId}
						type="file"
						accept={accept}
						multiple={multiple}
						onChange={handleFileChange}
						className="w-full h-full cursor-pointer opacity-0"
						aria-label="Upload files"
					/>
				</label>
			</div>

			{files.length > 0 && (
				<div className="space-y-2">
					<p className="text-sm font-medium text-[var(--sea-ink)]">
						Selected files ({files.length})
					</p>
					<ul className="space-y-1">
						{files.map((file, index) => (
							<li
								key={`${file.name}-${index}`}
								className="flex items-center gap-2 rounded-md bg-[var(--sea-ink)]/5 px-3 py-2 text-sm text-[var(--sea-ink)]"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									aria-hidden="true"
								>
									<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
									<polyline points="14 2 14 8 20 8" />
								</svg>
								<span className="truncate">{file.name}</span>
								<span className="text-xs text-[var(--sea-ink-soft)]">
									({(file.size / 1024).toFixed(1)} KB)
								</span>
							</li>
						))}
					</ul>
					<Button variant="outline" size="sm" onClick={clearFiles}>
						Clear files
					</Button>
				</div>
			)}
		</div>
	);
}
