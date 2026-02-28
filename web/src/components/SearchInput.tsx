import { useCallback, useState } from "react";
import { cn } from "#/lib/utils";
import { Input } from "./ui/input";

interface SearchInputProps {
	onSearch?: (query: string) => void;
	placeholder?: string;
	className?: string;
}

export function SearchInput({
	onSearch,
	placeholder = "Search...",
	className,
}: SearchInputProps) {
	const [query, setQuery] = useState("");

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			onSearch?.(query);
		},
		[query, onSearch],
	);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setQuery(e.target.value);
	};

	const handleClear = () => {
		setQuery("");
		onSearch?.("");
	};

	return (
		<form onSubmit={handleSubmit} className={cn("relative", className)}>
			<div className="relative">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sea-ink-soft)]"
					aria-hidden="true"
				>
					<circle cx="11" cy="11" r="8" />
					<path d="m21 21-4.3-4.3" />
				</svg>
				<Input
					type="search"
					value={query}
					onChange={handleChange}
					placeholder={placeholder}
					className="pl-10 pr-10"
				/>
				{query && (
					<button
						type="button"
						onClick={handleClear}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--sea-ink-soft)] transition-colors hover:text-[var(--sea-ink)]"
						aria-label="Clear search"
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
							<path d="M18 6 6 18" />
							<path d="m6 6 12 12" />
						</svg>
					</button>
				)}
			</div>
		</form>
	);
}
