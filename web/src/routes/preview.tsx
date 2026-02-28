import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/preview")({ component: PreviewPage });

function PreviewPage() {
	return (
		<main className="page-wrap px-4 pb-8 pt-14">
			<h1>Preview</h1>
		</main>
	);
}
