import MirageLogo from "./MirageLogo";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
	return (
		<header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
			<nav className="page-wrap flex items-center justify-between gap-3">
				<div className="inline-flex items-center gap-3 px-2.5 sm:px-3 sm:py-2">
					<MirageLogo />
					<div className="leading-tight">
						<p className="display-title m-0 text-lg font-semibold tracking-[0.01em]">
							Mirage
						</p>
					</div>
				</div>
				<ThemeToggle />
			</nav>
		</header>
	);
}
