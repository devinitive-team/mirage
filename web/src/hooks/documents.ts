import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteDocument, listDocuments, uploadDocument } from "#/lib/api";
import type { Document } from "#/lib/types";

export const documentsQueryKey = ["documents"] as const;

export function useDocuments() {
	return useQuery({
		queryKey: documentsQueryKey,
		queryFn: () => listDocuments(),
		refetchInterval: (query) => {
			const data = query.state.data as Document[] | undefined;
			if (!data) return false;
			const isProcessing = data.some((d) =>
				["pending", "ocr", "indexing"].includes(d.status),
			);
			return isProcessing ? 2000 : false;
		},
	});
}

export function useUploadDocument() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: uploadDocument,
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: documentsQueryKey }),
	});
}

export function useDeleteDocument() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: deleteDocument,
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: documentsQueryKey }),
	});
}
