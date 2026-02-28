import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

import { cn } from "#/lib/utils";

export type ToastTone = "success" | "error" | "info";

export interface ToastItem {
	id: number;
	message: string;
	tone: ToastTone;
}

interface ToastStackProps {
	toasts: ToastItem[];
	onDismiss: (id: number) => void;
}

const TOAST_STYLE_BY_TONE: Record<ToastTone, string> = {
	success:
		"border-emerald-200/80 bg-emerald-50/90 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-950/70 dark:text-emerald-100",
	error:
		"border-red-200/80 bg-red-50/90 text-red-900 dark:border-red-400/30 dark:bg-red-950/70 dark:text-red-100",
	info: "border-[var(--line)] bg-[var(--surface-strong)] text-[var(--sea-ink)]",
};

const TOAST_ICON_BY_TONE = {
	success: CheckCircle2,
	error: AlertTriangle,
	info: Info,
} as const;

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
	if (toasts.length === 0) return null;

	return (
		<div
			className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[120] px-3 sm:top-[max(1rem,env(safe-area-inset-top))]"
			aria-live="polite"
		>
			<div className="mx-auto flex w-full max-w-md flex-col gap-2">
				{toasts.map((toast) => {
					const Icon = TOAST_ICON_BY_TONE[toast.tone];
					return (
						<output
							key={toast.id}
							className={cn(
								"pointer-events-auto flex items-start gap-2 rounded-xl border px-3 py-2.5 shadow-lg backdrop-blur-sm",
								TOAST_STYLE_BY_TONE[toast.tone],
							)}
						>
							<Icon className="mt-0.5 h-4 w-4 shrink-0" />
							<p className="flex-1 text-sm font-medium leading-5">
								{toast.message}
							</p>
							<button
								type="button"
								onClick={() => onDismiss(toast.id)}
								className="shrink-0 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100"
								aria-label="Dismiss notification"
							>
								<X className="h-3.5 w-3.5" />
							</button>
						</output>
					);
				})}
			</div>
		</div>
	);
}
