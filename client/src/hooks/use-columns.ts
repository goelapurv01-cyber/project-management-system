import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertColumn } from "@shared/schema";

export function useCreateColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, ...data }: Partial<InsertColumn> & { projectId: number }) => {
      const url = buildUrl(api.columns.create.path, { projectId });
      const res = await fetch(url, {
        method: api.columns.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create column");
      return api.columns.create.responses[201].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.projects.getBoard.path, data.projectId] });
    },
  });
}
