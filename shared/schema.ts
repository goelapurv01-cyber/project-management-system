import { pgTable, text, serial, integer, boolean, timestamp, jsonb, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

// Re-export auth models
export * from "./models/auth";
export * from "./models/chat";

// === WORKSPACES ===
export const workspaces = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ownerId: text("owner_id").notNull(), // Linked to auth.users.id
  createdAt: timestamp("created_at").defaultNow(),
});

export const workspaceRelations = relations(workspaces, ({ one, many }) => ({
  projects: many(projects),
  members: many(workspaceMembers),
}));

export const workspaceMembers = pgTable("workspace_members", {
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id),
  userId: text("user_id").notNull(), // Linked to auth.users.id
  role: text("role").notNull().default("member"), // 'admin', 'member', 'viewer'
  joinedAt: timestamp("joined_at").defaultNow(),
}, (t) => [primaryKey({ columns: [t.workspaceId, t.userId] })]);

// === PROJECTS ===
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  key: text("key").notNull(), // e.g. "PROJ"
  description: text("description"),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projectRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [projects.workspaceId],
    references: [workspaces.id],
  }),
  columns: many(columns),
  tasks: many(tasks),
}));

// === KANBAN COLUMNS ===
export const columns = pgTable("columns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  order: integer("order").notNull(), // Position in the board
  createdAt: timestamp("created_at").defaultNow(),
});

export const columnRelations = relations(columns, ({ one, many }) => ({
  project: one(projects, {
    fields: [columns.projectId],
    references: [projects.id],
  }),
  tasks: many(tasks),
}));

// === TASKS ===
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"), // Rich text content
  priority: text("priority").default("medium"), // 'low', 'medium', 'high', 'urgent'
  status: text("status").default("todo"), // Simplified status for lists, but columns used for kanban
  columnId: integer("column_id").references(() => columns.id), // Nullable for backlog
  projectId: integer("project_id").notNull().references(() => projects.id),
  assigneeId: text("assignee_id"), // Linked to auth.users.id
  reporterId: text("reporter_id").notNull(), // Linked to auth.users.id
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  storyPoints: integer("story_points"),
});

export const taskRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  column: one(columns, {
    fields: [tasks.columnId],
    references: [columns.id],
  }),
  comments: many(comments),
  activityLogs: many(activityLogs),
}));

// === COMMENTS ===
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  taskId: integer("task_id").notNull().references(() => tasks.id),
  userId: text("user_id").notNull(), // Linked to auth.users.id
  createdAt: timestamp("created_at").defaultNow(),
});

export const commentRelations = relations(comments, ({ one }) => ({
  task: one(tasks, {
    fields: [comments.taskId],
    references: [tasks.id],
  }),
}));

// === ACTIVITY LOGS (For Analytics) ===
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(), // 'task', 'project', 'comment'
  entityId: integer("entity_id").notNull(),
  action: text("action").notNull(), // 'create', 'update', 'delete', 'move'
  userId: text("user_id").notNull(),
  metadata: jsonb("metadata"), // Store details like { fromColumn: 1, toColumn: 2 }
  createdAt: timestamp("created_at").defaultNow(),
});

export const activityLogRelations = relations(activityLogs, ({ one }) => ({
  // Optional relations depending on usage, usually just queried by entityId/Type
}));

// === ZOD SCHEMAS ===
export const insertWorkspaceSchema = createInsertSchema(workspaces).omit({ id: true, createdAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export const insertColumnSchema = createInsertSchema(columns).omit({ id: true, createdAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true });

// === TYPES ===
export type Workspace = typeof workspaces.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Column = typeof columns.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;

export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertColumn = z.infer<typeof insertColumnSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;

// Complex Types for API Responses
export type ProjectWithColumns = Project & {
  columns: (Column & { tasks: Task[] })[];
};

export type TaskWithDetails = Task & {
  assignee?: typeof users.$inferSelect;
  comments: (Comment & { user?: typeof users.$inferSelect })[];
};
