import { z } from 'zod';
import { 
  insertWorkspaceSchema, 
  insertProjectSchema, 
  insertColumnSchema, 
  insertTaskSchema, 
  insertCommentSchema,
  workspaces,
  projects,
  columns,
  tasks,
  comments,
  activityLogs
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  workspaces: {
    list: {
      method: 'GET' as const,
      path: '/api/workspaces',
      responses: {
        200: z.array(z.custom<typeof workspaces.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/workspaces',
      input: insertWorkspaceSchema,
      responses: {
        201: z.custom<typeof workspaces.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/workspaces/:id',
      responses: {
        200: z.custom<typeof workspaces.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  projects: {
    list: {
      method: 'GET' as const,
      path: '/api/workspaces/:workspaceId/projects',
      responses: {
        200: z.array(z.custom<typeof projects.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/workspaces/:workspaceId/projects',
      input: insertProjectSchema.omit({ workspaceId: true }),
      responses: {
        201: z.custom<typeof projects.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    getBoard: {
      method: 'GET' as const,
      path: '/api/projects/:id/board',
      responses: {
        200: z.custom<typeof projects.$inferSelect & { columns: (typeof columns.$inferSelect & { tasks: typeof tasks.$inferSelect[] })[] }>(),
        404: errorSchemas.notFound,
      },
    },
  },
  columns: {
    create: {
      method: 'POST' as const,
      path: '/api/projects/:projectId/columns',
      input: insertColumnSchema.omit({ projectId: true }),
      responses: {
        201: z.custom<typeof columns.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    updateOrder: {
      method: 'PATCH' as const,
      path: '/api/projects/:projectId/columns/order',
      input: z.object({ columnIds: z.array(z.number()) }),
      responses: {
        200: z.void(),
      },
    },
  },
  tasks: {
    create: {
      method: 'POST' as const,
      path: '/api/projects/:projectId/tasks',
      input: insertTaskSchema.omit({ projectId: true, reporterId: true }),
      responses: {
        201: z.custom<typeof tasks.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/tasks/:id',
      input: insertTaskSchema.partial(),
      responses: {
        200: z.custom<typeof tasks.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/tasks/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    move: {
      method: 'PATCH' as const,
      path: '/api/tasks/:id/move',
      input: z.object({ columnId: z.number(), order: z.number().optional() }),
      responses: {
        200: z.custom<typeof tasks.$inferSelect>(),
      },
    },
  },
  analytics: {
    getVelocity: {
      method: 'GET' as const,
      path: '/api/projects/:id/analytics/velocity',
      responses: {
        200: z.array(z.object({ date: z.string(), completed: z.number() })),
      },
    },
  },
  ai: {
    generateSubtasks: {
      method: 'POST' as const,
      path: '/api/ai/subtasks',
      input: z.object({ taskDescription: z.string() }),
      responses: {
        200: z.array(z.string()),
      },
    },
    summarizeTask: {
      method: 'POST' as const,
      path: '/api/ai/summarize',
      input: z.object({ content: z.string() }),
      responses: {
        200: z.object({ summary: z.string() }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
