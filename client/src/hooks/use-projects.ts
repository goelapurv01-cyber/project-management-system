import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertProject } from "@shared/schema";

export function useProjects(workspaceId: number) {
  return useQuery({
    queryKey: [api.projects.list.path, workspaceId],
    queryFn: async () => {
      const url = buildUrl(api.projects.list.path, { workspaceId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch projects");
      return api.projects.list.responses[200].parse(await res.json());
    },
    enabled: !!workspaceId,
  });
}

export function useProjectBoard(projectId: number) {
  return useQuery({
    queryKey: [api.projects.getBoard.path, projectId],
    queryFn: async () => {
      const url = buildUrl(api.projects.getBoard.path, { id: projectId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch project board");
      return api.projects.getBoard.responses[200].parse(await res.json());
    },
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspaceId, ...data }: InsertProject & { workspaceId: number }) => {
      const url = buildUrl(api.projects.create.path, { workspaceId });
      const res = await fetch(url, {
        method: api.projects.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.projects.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create project");
      }
      return api.projects.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      const url = buildUrl(api.projects.list.path, { workspaceId: variables.workspaceId });
      queryClient.invalidateQueries({ queryKey: [api.projects.list.path, variables.workspaceId] });
    },
  });
}
