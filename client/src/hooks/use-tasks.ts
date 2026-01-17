import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertTask } from "@shared/schema";
import { z } from "zod";

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, ...data }: Partial<InsertTask> & { projectId: number }) => {
      // Coerce numeric fields if coming from strings
      const payload = {
        ...data,
        storyPoints: data.storyPoints ? Number(data.storyPoints) : undefined,
        columnId: data.columnId ? Number(data.columnId) : undefined,
      };
      
      const url = buildUrl(api.tasks.create.path, { projectId });
      const res = await fetch(url, {
        method: api.tasks.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) {
         if (res.status === 400) {
          const error = api.tasks.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create task");
      }
      return api.tasks.create.responses[201].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.projects.getBoard.path, data.projectId] });
    },
  });
}

export function useMoveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, columnId, order }: { id: number; columnId: number; order?: number }) => {
      const url = buildUrl(api.tasks.move.path, { id });
      const res = await fetch(url, {
        method: api.tasks.move.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId, order }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to move task");
      return api.tasks.move.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.projects.getBoard.path, data.projectId] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.tasks.delete.path, { id });
      const res = await fetch(url, { 
        method: api.tasks.delete.method,
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to delete task");
    },
    onSuccess: () => {
      // We'd ideally need the projectId here to invalidate specifically, 
      // but invalidating all boards is a safe fallback or we can pass projectId in the hook call
      queryClient.invalidateQueries({ queryKey: [api.projects.getBoard.path] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertTask>) => {
      const url = buildUrl(api.tasks.update.path, { id });
      const res = await fetch(url, {
        method: api.tasks.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update task");
      return api.tasks.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.projects.getBoard.path, data.projectId] });
    },
  });
}

export function useAiSubtasks() {
  return useMutation({
    mutationFn: async (taskDescription: string) => {
      const res = await fetch(api.ai.generateSubtasks.path, {
        method: api.ai.generateSubtasks.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskDescription }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate subtasks");
      return api.ai.generateSubtasks.responses[200].parse(await res.json());
    },
  });
}

export function useAiSummarize() {
  return useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(api.ai.summarizeTask.path, {
        method: api.ai.summarizeTask.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to summarize task");
      return api.ai.summarizeTask.responses[200].parse(await res.json());
    },
  });
}
