import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clearHistory, listHistory } from "#/lib/api";

export const historyQueryKey = ["history"] as const;

export function useHistory() {
	return useQuery({
		queryKey: historyQueryKey,
		queryFn: () => listHistory(),
	});
}

export function useClearHistory() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: clearHistory,
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: historyQueryKey }),
	});
}
