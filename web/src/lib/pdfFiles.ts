export function isPdfFile(file: File): boolean {
	return (
		file.type.toLowerCase() === "application/pdf" ||
		file.name.toLowerCase().endsWith(".pdf")
	);
}
