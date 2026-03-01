import { MessageSquareText } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "#/lib/utils";

type ParsedAnswerBlock =
	| { id: string; type: "paragraph"; text: string }
	| {
			id: string;
			type: "ordered";
			items: Array<{
				id: string;
				title: string;
				bullets: Array<{ id: string; text: string }>;
			}>;
	  }
	| {
			id: string;
			type: "unordered";
			items: Array<{ id: string; text: string }>;
	  };

type QueryAnswerSectionProps = {
	answer: string;
	title?: string;
	description?: string;
	className?: string;
	bodyClassName?: string;
};

function stripAnsiEscapeSequences(value: string): string {
	let normalized = "";
	let index = 0;
	while (index < value.length) {
		const char = value[index];
		if (char === "\u001b") {
			index += 1;
			if (value[index] === "[") {
				index += 1;
				while (index < value.length) {
					const code = value.charCodeAt(index);
					index += 1;
					if (code >= 64 && code <= 126) {
						break;
					}
				}
			}
			continue;
		}
		normalized += char;
		index += 1;
	}
	return normalized;
}

function uniqueKeyFactory() {
	const seen = new Map<string, number>();
	return (prefix: string, value: string): string => {
		const normalizedValue = value.trim() || `${prefix}-empty`;
		const keyBase = `${prefix}:${normalizedValue}`;
		const currentCount = (seen.get(keyBase) ?? 0) + 1;
		seen.set(keyBase, currentCount);
		return `${keyBase}:${currentCount}`;
	};
}

function normalizeAnswerText(answer: string): string {
	return stripAnsiEscapeSequences(answer)
		.replaceAll("\u009b", "")
		.replaceAll("\u0000", "")
		.replaceAll("\u0007", "")
		.replaceAll("\u0008", "")
		.replaceAll("\u000c", "")
		.replaceAll("\\n", "\n")
		.replace(/\r\n?/g, "\n")
		.trim();
}

function renderInlineMarkdown(text: string): ReactNode {
	const segments = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
	const getSegmentKey = uniqueKeyFactory();
	return segments.map((segment) => {
		const isStrong = segment.startsWith("**") && segment.endsWith("**");
		if (!isStrong) {
			return <span key={getSegmentKey("inline", segment)}>{segment}</span>;
		}
		return (
			<strong key={getSegmentKey("strong", segment)}>
				{segment.slice(2, Math.max(2, segment.length - 2))}
			</strong>
		);
	});
}

function parseAnswerMarkdown(answer: string): ParsedAnswerBlock[] {
	const normalized = normalizeAnswerText(answer);
	if (!normalized) return [];

	const lines = normalized.split("\n");
	const blocks: ParsedAnswerBlock[] = [];
	const getNodeKey = uniqueKeyFactory();
	let lineIndex = 0;

	while (lineIndex < lines.length) {
		const line = lines[lineIndex]?.trimEnd() ?? "";

		if (!line.trim()) {
			lineIndex += 1;
			continue;
		}

		const orderedMatch = line.match(/^\s*\d+\.\s+(.*)$/);
		if (orderedMatch) {
			const items: Array<{
				id: string;
				title: string;
				bullets: Array<{ id: string; text: string }>;
			}> = [];
			while (lineIndex < lines.length) {
				const itemLine = lines[lineIndex]?.trimEnd() ?? "";
				const itemMatch = itemLine.match(/^\s*\d+\.\s+(.*)$/);
				if (!itemMatch) break;

				const title = itemMatch[1]?.trim() ?? "";
				lineIndex += 1;
				const bullets: Array<{ id: string; text: string }> = [];
				while (lineIndex < lines.length) {
					const bulletLine = lines[lineIndex] ?? "";
					const bulletMatch = bulletLine.match(/^\s*-\s+(.*)$/);
					if (bulletMatch) {
						const bulletText = bulletMatch[1]?.trim() ?? "";
						bullets.push({
							id: getNodeKey("ordered-bullet", bulletText),
							text: bulletText,
						});
						lineIndex += 1;
						continue;
					}

					if (!bulletLine.trim()) {
						lineIndex += 1;
						continue;
					}

					break;
				}

				items.push({
					id: getNodeKey("ordered-item", title),
					title,
					bullets,
				});
			}
			if (items.length > 0) {
				blocks.push({
					id: getNodeKey(
						"ordered-block",
						items.map((item) => item.title).join("|"),
					),
					type: "ordered",
					items,
				});
				continue;
			}
		}

		const bulletMatch = line.match(/^\s*-\s+(.*)$/);
		if (bulletMatch) {
			const items: Array<{ id: string; text: string }> = [];
			while (lineIndex < lines.length) {
				const current = lines[lineIndex] ?? "";
				const currentBulletMatch = current.match(/^\s*-\s+(.*)$/);
				if (!currentBulletMatch) break;
				const itemText = currentBulletMatch[1]?.trim() ?? "";
				items.push({
					id: getNodeKey("unordered-item", itemText),
					text: itemText,
				});
				lineIndex += 1;
			}
			if (items.length > 0) {
				blocks.push({
					id: getNodeKey(
						"unordered-block",
						items.map((item) => item.text).join("|"),
					),
					type: "unordered",
					items,
				});
				continue;
			}
		}

		const paragraphLines: string[] = [];
		while (lineIndex < lines.length) {
			const current = lines[lineIndex] ?? "";
			if (!current.trim()) {
				lineIndex += 1;
				break;
			}
			if (/^\s*\d+\.\s+/.test(current) || /^\s*-\s+/.test(current)) break;
			paragraphLines.push(current.trim());
			lineIndex += 1;
		}
		if (paragraphLines.length > 0) {
			const text = paragraphLines.join(" ");
			blocks.push({
				id: getNodeKey("paragraph", text),
				type: "paragraph",
				text,
			});
		}
	}

	return blocks;
}

export function QueryAnswerSection({
	answer,
	title = "Answer",
	description = "Response generated from the selected evidence scope.",
	className,
	bodyClassName,
}: QueryAnswerSectionProps) {
	const blocks = parseAnswerMarkdown(answer);
	const fallback = normalizeAnswerText(answer);

	return (
		<section
			className={cn(
				"feature-card mb-4 overflow-hidden rounded-2xl border border-[var(--line)]",
				className,
			)}
		>
			<header className="flex items-start gap-3 border-b border-[var(--line)] bg-[var(--surface-strong)]/95 px-4 py-3">
				<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--lagoon)]/10">
					<MessageSquareText className="h-4 w-4 text-[var(--lagoon-deep)]" />
				</div>
				<div className="min-w-0">
					<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--sea-ink-soft)]">
						{title}
					</p>
					<p className="text-xs text-[var(--sea-ink-soft)]">{description}</p>
				</div>
			</header>
			<div
				className={cn(
					"max-h-[40vh] space-y-2 overflow-y-auto bg-[var(--surface-strong)]/80 px-4 py-3",
					bodyClassName,
				)}
			>
				{blocks.length === 0 ? (
					<p className="rounded-lg border border-[var(--line)] bg-[var(--surface)]/70 px-3 py-2 text-[15px] leading-7 whitespace-pre-wrap text-[var(--sea-ink)]">
						{fallback}
					</p>
				) : (
					blocks.map((block) => {
						if (block.type === "paragraph") {
							return (
								<p
									key={block.id}
									className="rounded-lg border border-[var(--line)] bg-[var(--surface)]/70 px-3 py-2 text-[15px] leading-7 text-[var(--sea-ink)]"
								>
									{renderInlineMarkdown(block.text)}
								</p>
							);
						}

						if (block.type === "unordered") {
							return (
								<ul
									key={block.id}
									className="space-y-2 rounded-lg border border-[var(--line)] bg-[var(--surface)]/70 px-4 py-3 text-[15px] leading-7 text-[var(--sea-ink)] list-disc list-inside"
								>
									{block.items.map((item) => (
										<li key={item.id}>{renderInlineMarkdown(item.text)}</li>
									))}
								</ul>
							);
						}

						return (
							<ol
								key={block.id}
								className="space-y-3 rounded-lg border border-[var(--line)] bg-[var(--surface)]/70 px-4 py-3 text-[15px] leading-7 text-[var(--sea-ink)]"
							>
								{block.items.map((item) => (
									<li key={item.id} className="list-decimal list-inside">
										<p className="font-semibold">
											{renderInlineMarkdown(item.title)}
										</p>
										{item.bullets.length > 0 ? (
											<ul className="mt-1 space-y-1 pl-4 text-[14px] list-disc">
												{item.bullets.map((bullet) => (
													<li key={bullet.id}>
														{renderInlineMarkdown(bullet.text)}
													</li>
												))}
											</ul>
										) : null}
									</li>
								))}
							</ol>
						);
					})
				)}
			</div>
		</section>
	);
}
