import { createFileRoute } from "@tanstack/react-router";
import { FileUpload } from "#/components/FileUpload";
import { SearchInput } from "#/components/SearchInput";

export const Route = createFileRoute("/")({ component: App });

function App() {
	return (
		<main className="page-wrap px-4 pb-8 pt-14">

			<div className="mt-8 grid gap-8 lg:grid-cols-2">
				<section className="island-shell rounded-2xl p-6">
					<p className="island-kicker mb-4">Upload Files</p>
					<FileUpload
						onFileSelect={(files) => console.log("Files selected:", files)}
						accept=".pdf,.doc,.docx,.txt"
						multiple={true}
					/>
				</section>

				<section className="island-shell rounded-2xl p-6">
					<p className="island-kicker mb-4">Search</p>
					<SearchInput
						placeholder="Search documents..."
						onSearch={(query) => console.log("Search query:", query)}
					/>
				</section>
			</div>

		</main>
	);
}
