import { db } from "./db";
import {
  workspaces, projects, columns, tasks, comments, activityLogs,
  type Workspace, type InsertWorkspace,
  type Project, type InsertProject,
  type Column, type InsertColumn,
  type Task, type InsertTask,
  type Comment, type InsertComment,
  type ActivityLog,
  type ProjectWithColumns,
  type TaskWithDetails
} from "@shared/schema";
import { eq, and, asc, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Workspaces
  getWorkspaces(userId: string): Promise<Workspace[]>;
  getWorkspace(id: number): Promise<Workspace | undefined>;
  createWorkspace(workspace: InsertWorkspace): Promise<Workspace>;

  // Projects
  getProjects(workspaceId: number): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  getProjectBoard(projectId: number): Promise<ProjectWithColumns | undefined>;

  // Columns
  createColumn(column: InsertColumn): Promise<Column>;
  updateColumnOrder(columnIds: number[]): Promise<void>;

  // Tasks
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: number): Promise<void>;
  moveTask(taskId: number, columnId: number, order?: number): Promise<Task>;
  getTask(id: number): Promise<TaskWithDetails | undefined>;

  // Comments
  createComment(comment: InsertComment): Promise<Comment>;
  getComments(taskId: number): Promise<Comment[]>;

  // Analytics
  getProjectVelocity(projectId: number): Promise<{ date: string; completed: number }[]>;

  // Activity Logs
  logActivity(log: Omit<ActivityLog, "id" | "createdAt">): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Workspaces
  async getWorkspaces(userId: string): Promise<Workspace[]> {
    // In a real app, we'd check members table too
    return await db.select().from(workspaces).where(eq(workspaces.ownerId, userId));
  }

  async getWorkspace(id: number): Promise<Workspace | undefined> {
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));
    return workspace;
  }

  async createWorkspace(workspace: InsertWorkspace): Promise<Workspace> {
    const [newWorkspace] = await db.insert(workspaces).values(workspace).returning();
    return newWorkspace;
  }

  // Projects
  async getProjects(workspaceId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.workspaceId, workspaceId));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    
    // Create default columns
    const defaultColumns = ["Todo", "In Progress", "Done"];
    for (let i = 0; i < defaultColumns.length; i++) {
      await this.createColumn({
        name: defaultColumns[i],
        projectId: newProject.id,
        order: i,
      });
    }

    return newProject;
  }

  async getProjectBoard(projectId: number): Promise<ProjectWithColumns | undefined> {
    const project = await this.getProject(projectId);
    if (!project) return undefined;

    const projectColumns = await db
      .select()
      .from(columns)
      .where(eq(columns.projectId, projectId))
      .orderBy(asc(columns.order));

    const columnsWithTasks = await Promise.all(
      projectColumns.map(async (col) => {
        const colTasks = await db
          .select()
          .from(tasks)
          .where(eq(tasks.columnId, col.id))
          .orderBy(desc(tasks.priority)); // Simple ordering for now
        return { ...col, tasks: colTasks };
      })
    );

    return { ...project, columns: columnsWithTasks };
  }

  // Columns
  async createColumn(column: InsertColumn): Promise<Column> {
    const [newColumn] = await db.insert(columns).values(column).returning();
    return newColumn;
  }

  async updateColumnOrder(columnIds: number[]): Promise<void> {
    // In a real app, this should be a transaction
    for (let i = 0; i < columnIds.length; i++) {
      await db.update(columns).set({ order: i }).where(eq(columns.id, columnIds[i]));
    }
  }

  // Tasks
  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: number, updates: Partial<InsertTask>): Promise<Task> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async moveTask(taskId: number, columnId: number, order?: number): Promise<Task> {
    // For simplicity, we just update the columnId. 
    // Full drag-and-drop reordering within a column would require an 'order' field on tasks.
    const [updatedTask] = await db
      .update(tasks)
      .set({ columnId, updatedAt: new Date() })
      .where(eq(tasks.id, taskId))
      .returning();
    return updatedTask;
  }

  async getTask(id: number): Promise<TaskWithDetails | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!task) return undefined;

    const taskComments = await this.getComments(id);
    
    // In a real app, we'd join with users table
    return { ...task, comments: taskComments };
  }

  // Comments
  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db.insert(comments).values(comment).returning();
    return newComment;
  }

  async getComments(taskId: number): Promise<Comment[]> {
    return await db.select().from(comments).where(eq(comments.taskId, taskId)).orderBy(asc(comments.createdAt));
  }

  // Analytics
  async getProjectVelocity(projectId: number): Promise<{ date: string; completed: number }[]> {
    // This is a simplified velocity chart (tasks completed per day)
    // In a real app, we'd use story points and sprints
    
    // Mock data for demonstration if no real data exists
    const mockData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toISOString().split('T')[0],
        completed: Math.floor(Math.random() * 5),
      };
    });

    return mockData;
  }

  // Activity Logs
  async logActivity(log: Omit<ActivityLog, "id" | "createdAt">): Promise<void> {
    await db.insert(activityLogs).values(log);
  }
}

export const storage = new DatabaseStorage();
