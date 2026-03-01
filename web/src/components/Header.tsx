import { Link } from "@tanstack/react-router";

import MirageLogo from "./MirageLogo";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
	return (
		<header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
			<nav className="flex w-full items-center justify-between gap-3 py-2">
				<div className="inline-flex min-w-0 items-center gap-4 px-2.5 sm:px-3">
					<MirageLogo />
					<div className="leading-tight shrink-0">
						<p className="display-title m-0 text-lg font-semibold tracking-[0.01em]">
							Mirage
						</p>
					</div>
					<div className="hidden items-center gap-4 sm:flex">
						<Link
							to="/"
							activeOptions={{ exact: true }}
							className="nav-link text-sm font-medium"
							activeProps={{
								className: "nav-link is-active text-sm font-medium",
							}}
						>
							Dashboard
						</Link>
						<Link
							to="/history"
							className="nav-link text-sm font-medium"
							activeProps={{
								className: "nav-link is-active text-sm font-medium",
							}}
						>
							History
						</Link>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-3 sm:hidden">
						<Link
							to="/"
							activeOptions={{ exact: true }}
							className="nav-link text-xs font-medium"
							activeProps={{
								className: "nav-link is-active text-xs font-medium",
							}}
						>
							Dashboard
						</Link>
						<Link
							to="/history"
							className="nav-link text-xs font-medium"
							activeProps={{
								className: "nav-link is-active text-xs font-medium",
							}}
						>
							History
						</Link>
					</div>
					<ThemeToggle />
				</div>
			</nav>
		</header>
	);
}
