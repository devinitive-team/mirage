import { Laptop, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "auto";

const MODE_OPTIONS = [
	{ value: "light", label: "Light", Icon: Sun },
	{ value: "dark", label: "Dark", Icon: Moon },
	{ value: "auto", label: "Auto", Icon: Laptop },
] as const;

function getInitialMode(): ThemeMode {
	if (typeof window === "undefined") {
		return "auto";
	}

	const stored = window.localStorage.getItem("theme");
	if (stored === "light" || stored === "dark" || stored === "auto") {
		return stored;
	}

	return "auto";
}

function applyThemeMode(mode: ThemeMode) {
	if (typeof window === "undefined") {
		return;
	}

	const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	const resolved = mode === "auto" ? (prefersDark ? "dark" : "light") : mode;

	document.documentElement.classList.remove("light", "dark");
	document.documentElement.classList.add(resolved);

	if (mode === "auto") {
		document.documentElement.removeAttribute("data-theme");
	} else {
		document.documentElement.setAttribute("data-theme", mode);
	}

	document.documentElement.style.colorScheme = resolved;
}

export default function ThemeToggle() {
	const [mode, setMode] = useState<ThemeMode>(getInitialMode);

	useEffect(() => {
		applyThemeMode(mode);
	}, [mode]);

	useEffect(() => {
		if (mode !== "auto") {
			return;
		}

		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => applyThemeMode("auto");

		if (typeof media.addEventListener === "function") {
			media.addEventListener("change", onChange);
		} else {
			media.addListener(onChange);
		}
		return () => {
			if (typeof media.removeEventListener === "function") {
				media.removeEventListener("change", onChange);
			} else {
				media.removeListener(onChange);
			}
		};
	}, [mode]);

	function setThemeMode(nextMode: ThemeMode) {
		setMode(nextMode);
		applyThemeMode(nextMode);
		window.localStorage.setItem("theme", nextMode);
	}

	return (
		<fieldset className="inline-flex items-center gap-1 rounded-full border border-border bg-background p-1">
			<legend className="sr-only">Theme mode</legend>
			{MODE_OPTIONS.map(({ value, label, Icon }) => {
				const isActive = mode === value;
				return (
					<button
						key={value}
						type="button"
						onClick={() => setThemeMode(value)}
						aria-label={`Use ${label.toLowerCase()} theme mode`}
						aria-pressed={isActive}
						title={label}
						className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 sm:text-sm ${
							isActive
								? "bg-primary text-primary-foreground"
								: "text-foreground/75 hover:bg-primary/10 hover:text-foreground"
						}`}
					>
						<Icon size={15} aria-hidden="true" />
						<span className="hidden sm:inline">{label}</span>
					</button>
				);
			})}
		</fieldset>
	);
}
