import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertWorkspace } from "@shared/schema";

export function useWorkspaces() {
  return useQuery({
    queryKey: [api.workspaces.list.path],
    queryFn: async () => {
      const res = await fetch(api.workspaces.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch workspaces");
      return api.workspaces.list.responses[200].parse(await res.json());
    },
  });
}

export function useWorkspace(id: number) {
  return useQuery({
    queryKey: [api.workspaces.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.workspaces.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch workspace");
      return api.workspaces.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertWorkspace) => {
      const res = await fetch(api.workspaces.create.path, {
        method: api.workspaces.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.workspaces.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create workspace");
      }
      return api.workspaces.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.workspaces.list.path] });
    },
  });
}
