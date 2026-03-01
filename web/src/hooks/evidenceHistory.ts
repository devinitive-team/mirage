import { create } from "zustand";

import type { Evidence } from "#/lib/types";

export type EvidenceHistoryEntry = {
	id: string;
	question: string;
	answer: string;
	askedAt: string;
	evidence: Evidence[];
};

type EvidenceHistoryEntryInput = {
	id?: string;
	question: string;
	answer: string;
	askedAt?: string;
	evidence: Evidence[];
};

type EvidenceHistoryState = {
	entries: EvidenceHistoryEntry[];
	addEntry: (entry: EvidenceHistoryEntryInput) => void;
	replaceEntries: (entries: EvidenceHistoryEntry[]) => void;
	clearEntries: () => void;
};

function toTimestamp(value: string): number {
	const parsed = Date.parse(value);
	return Number.isNaN(parsed) ? 0 : parsed;
}

function sortNewestFirst(
	entries: EvidenceHistoryEntry[],
): EvidenceHistoryEntry[] {
	return [...entries].sort(
		(left, right) => toTimestamp(right.askedAt) - toTimestamp(left.askedAt),
	);
}

function createHistoryEntryId(askedAt: string): string {
	return `history-${askedAt}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useEvidenceHistoryStore = create<EvidenceHistoryState>((set) => ({
	entries: [],
	addEntry: (entry) => {
		const askedAt = entry.askedAt ?? new Date().toISOString();
		const normalized: EvidenceHistoryEntry = {
			id: entry.id ?? createHistoryEntryId(askedAt),
			question: entry.question,
			answer: entry.answer,
			askedAt,
			evidence: entry.evidence,
		};

		set((state) => ({
			entries: sortNewestFirst([normalized, ...state.entries]),
		}));
	},
	replaceEntries: (entries) => set({ entries: sortNewestFirst(entries) }),
	clearEntries: () => set({ entries: [] }),
}));
