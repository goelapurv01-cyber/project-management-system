import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { openai } from "./replit_integrations/audio"; // Re-using openai client from integration

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth Setup
  await setupAuth(app);
  registerAuthRoutes(app);

  // Workspaces
  app.get(api.workspaces.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const workspaces = await storage.getWorkspaces(userId);
    res.json(workspaces);
  });

  app.post(api.workspaces.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.workspaces.create.input.parse(req.body);
      const workspace = await storage.createWorkspace({ ...input, ownerId: userId });
      res.status(201).json(workspace);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input" });
        return;
      }
      throw err;
    }
  });

  app.get(api.workspaces.get.path, isAuthenticated, async (req, res) => {
    const workspace = await storage.getWorkspace(Number(req.params.id));
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });
    res.json(workspace);
  });

  // Projects
  app.get(api.projects.list.path, isAuthenticated, async (req, res) => {
    const projects = await storage.getProjects(Number(req.params.workspaceId));
    res.json(projects);
  });

  app.post(api.projects.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.projects.create.input.parse(req.body);
      const project = await storage.createProject({ 
        ...input, 
        workspaceId: Number(req.params.workspaceId) 
      });
      res.status(201).json(project);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input" });
        return;
      }
      throw err;
    }
  });

  app.get(api.projects.getBoard.path, isAuthenticated, async (req, res) => {
    const board = await storage.getProjectBoard(Number(req.params.id));
    if (!board) return res.status(404).json({ message: "Project not found" });
    res.json(board);
  });

  // Columns
  app.post(api.columns.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.columns.create.input.parse(req.body);
      const column = await storage.createColumn({
        ...input,
        projectId: Number(req.params.projectId),
      });
      res.status(201).json(column);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input" });
        return;
      }
      throw err;
    }
  });

  app.patch(api.columns.updateOrder.path, isAuthenticated, async (req, res) => {
    await storage.updateColumnOrder(req.body.columnIds);
    res.json({ success: true });
  });

  // Tasks
  app.post(api.tasks.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.tasks.create.input.parse(req.body);
      const task = await storage.createTask({
        ...input,
        projectId: Number(req.params.projectId),
        reporterId: userId,
      });
      res.status(201).json(task);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input" });
        return;
      }
      throw err;
    }
  });

  app.patch(api.tasks.update.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.tasks.update.input.parse(req.body);
      const task = await storage.updateTask(Number(req.params.id), input);
      res.json(task);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input" });
        return;
      }
      res.status(404).json({ message: "Task not found" });
    }
  });

  app.delete(api.tasks.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteTask(Number(req.params.id));
    res.status(204).send();
  });

  app.patch(api.tasks.move.path, isAuthenticated, async (req, res) => {
    const task = await storage.moveTask(
      Number(req.params.id),
      req.body.columnId,
      req.body.order
    );
    res.json(task);
  });

  // Analytics
  app.get(api.analytics.getVelocity.path, isAuthenticated, async (req, res) => {
    const velocity = await storage.getProjectVelocity(Number(req.params.id));
    res.json(velocity);
  });

  // AI Features
  app.post(api.ai.generateSubtasks.path, isAuthenticated, async (req, res) => {
    try {
      const { taskDescription } = req.body;
      
      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          {
            role: "system",
            content: "You are a helpful project manager. Generate a list of subtasks for the following task description. Return only a JSON array of strings."
          },
          {
            role: "user",
            content: taskDescription
          }
        ],
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      const subtasks = JSON.parse(content || "{\"subtasks\": []}").subtasks || [];
      
      res.json(subtasks);
    } catch (error) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ message: "Failed to generate subtasks" });
    }
  });

  app.post(api.ai.summarizeTask.path, isAuthenticated, async (req, res) => {
    try {
      const { content } = req.body;
      
      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          {
            role: "system",
            content: "Summarize the following task description concisely in 1-2 sentences."
          },
          {
            role: "user",
            content
          }
        ]
      });

      res.json({ summary: response.choices[0].message.content });
    } catch (error) {
      console.error("AI Summary Error:", error);
      res.status(500).json({ message: "Failed to summarize task" });
    }
  });

  // Seed Data Endpoint (For demonstration)
  app.post("/api/seed", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    
    // Create a demo workspace
    const workspace = await storage.createWorkspace({
      name: "Demo Workspace",
      slug: "demo-workspace",
      ownerId: userId,
    });

    // Create a demo project
    const project = await storage.createProject({
      name: "Website Redesign",
      key: "WEB",
      description: "Redesigning the corporate website for 2025.",
      workspaceId: workspace.id,
    });

    // Add some tasks
    const columns = await storage.getProjectBoard(project.id);
    if (columns?.columns[0]) {
      await storage.createTask({
        title: "Design Homepage",
        description: "Create high-fidelity mockups for the new homepage.",
        priority: "high",
        columnId: columns.columns[0].id,
        projectId: project.id,
        reporterId: userId,
        storyPoints: 5,
      });
      await storage.createTask({
        title: "Implement Auth",
        description: "Setup Replit Auth for user login.",
        priority: "critical",
        columnId: columns.columns[0].id,
        projectId: project.id,
        reporterId: userId,
        storyPoints: 8,
      });
    }

    res.json({ message: "Seed data created successfully", workspaceId: workspace.id });
  });

  return httpServer;
}
