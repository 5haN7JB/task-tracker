import { Router, type IRouter } from "express";
import { eq, inArray, sql, and } from "drizzle-orm";
import { db, tasksTable, taskAssigneesTable, usersTable, taskEmployeeProgressTable } from "@workspace/db";
import {
  CreateTaskBody,
  UpdateTaskBody,
  GetTaskParams,
  UpdateTaskParams,
  DeleteTaskParams,
  AddFeedbackParams,
  AddFeedbackBody,
  UpdateMyProgressParams,
  UpdateMyProgressBody,
} from "@workspace/api-zod";
import { requireAuth, requireManager } from "../lib/auth";

const router: IRouter = Router();

async function getTaskWithAssignees(taskId: number) {
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
  if (!task) return null;

  const assigneeRows = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    })
    .from(taskAssigneesTable)
    .innerJoin(usersTable, eq(taskAssigneesTable.userId, usersTable.id))
    .where(eq(taskAssigneesTable.taskId, taskId));

  const progressRows = await db
    .select({
      userId: taskEmployeeProgressTable.userId,
      userName: usersTable.name,
      completionPercent: taskEmployeeProgressTable.completionPercent,
      expectedCompletionDate: taskEmployeeProgressTable.expectedCompletionDate,
      updatedAt: taskEmployeeProgressTable.updatedAt,
    })
    .from(taskEmployeeProgressTable)
    .innerJoin(usersTable, eq(taskEmployeeProgressTable.userId, usersTable.id))
    .where(eq(taskEmployeeProgressTable.taskId, taskId));

  return {
    ...task,
    deadline: task.deadline ?? null,
    completionPercent: task.completionPercent ?? null,
    expectedCompletionTime: task.expectedCompletionTime ?? null,
    feedback: task.feedback ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    assignees: assigneeRows.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })),
    employeeProgress: progressRows.map(p => ({
      userId: p.userId,
      userName: p.userName,
      completionPercent: p.completionPercent,
      expectedCompletionDate: p.expectedCompletionDate ?? null,
      updatedAt: p.updatedAt ? p.updatedAt.toISOString() : null,
    })),
  };
}

router.get("/tasks/summary", requireAuth, async (req, res): Promise<void> => {
  let whereClause = undefined;

  if (req.session.role === "employee") {
    const assignedRows = await db
      .select({ taskId: taskAssigneesTable.taskId })
      .from(taskAssigneesTable)
      .where(eq(taskAssigneesTable.userId, req.session.userId!));
    const assignedIds = assignedRows.map(r => r.taskId);

    if (assignedIds.length === 0) {
      res.json({ todo: 0, in_progress: 0, done: 0, total: 0 });
      return;
    }
    whereClause = inArray(tasksTable.id, assignedIds);
  }

  const rows = await db
    .select({ status: tasksTable.status, count: sql<number>`count(*)::int` })
    .from(tasksTable)
    .where(whereClause)
    .groupBy(tasksTable.status);

  const summary = { todo: 0, in_progress: 0, done: 0, total: 0 };
  for (const row of rows) {
    const key = row.status as keyof typeof summary;
    if (key in summary) {
      summary[key] = row.count;
      summary.total += row.count;
    }
  }

  res.json(summary);
});

router.get("/tasks", requireAuth, async (req, res): Promise<void> => {
  let taskIds: number[] | null = null;

  if (req.session.role === "employee") {
    const assignedRows = await db
      .select({ taskId: taskAssigneesTable.taskId })
      .from(taskAssigneesTable)
      .where(eq(taskAssigneesTable.userId, req.session.userId!));
    taskIds = assignedRows.map(r => r.taskId);
  }

  let tasks;
  if (taskIds !== null) {
    if (taskIds.length === 0) {
      res.json([]);
      return;
    }
    tasks = await db.select().from(tasksTable).where(inArray(tasksTable.id, taskIds));
  } else {
    tasks = await db.select().from(tasksTable);
  }

  const result = await Promise.all(tasks.map(t => getTaskWithAssignees(t.id)));
  res.json(result.filter(Boolean));
});

router.post("/tasks", requireManager, async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { assigneeIds, ...taskData } = parsed.data;

  const [task] = await db.insert(tasksTable).values({
    ...taskData,
    createdById: req.session.userId!,
  }).returning();

  if (assigneeIds && assigneeIds.length > 0) {
    await db.insert(taskAssigneesTable).values(
      assigneeIds.map(userId => ({ taskId: task.id, userId }))
    );
  }

  const result = await getTaskWithAssignees(task.id);
  res.status(201).json(result);
});

router.get("/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid task ID" });
    return;
  }

  const task = await getTaskWithAssignees(params.data.id);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json(task);
});

router.patch("/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid task ID" });
    return;
  }

  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { assigneeIds, ...taskData } = parsed.data;

  const [existing] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  if (Object.keys(taskData).length > 0) {
    await db.update(tasksTable).set(taskData).where(eq(tasksTable.id, params.data.id));
  }

  if (assigneeIds !== undefined) {
    await db.delete(taskAssigneesTable).where(eq(taskAssigneesTable.taskId, params.data.id));
    if (assigneeIds.length > 0) {
      await db.insert(taskAssigneesTable).values(
        assigneeIds.map(userId => ({ taskId: params.data.id, userId }))
      );
    }
  }

  const result = await getTaskWithAssignees(params.data.id);
  res.json(result);
});

router.delete("/tasks/:id", requireManager, async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid task ID" });
    return;
  }

  const [deleted] = await db.delete(tasksTable).where(eq(tasksTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/tasks/:id/feedback", requireManager, async (req, res): Promise<void> => {
  const params = AddFeedbackParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid task ID" });
    return;
  }

  const parsed = AddFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  await db.update(tasksTable).set({ feedback: parsed.data.feedback }).where(eq(tasksTable.id, params.data.id));

  const result = await getTaskWithAssignees(params.data.id);
  res.json(result);
});

router.patch("/tasks/:id/my-progress", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateMyProgressParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid task ID" });
    return;
  }

  const parsed = UpdateMyProgressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.session.userId!;
  const taskId = params.data.id;

  const [existing] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
  if (!existing) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  // Upsert the employee's progress record
  const existingProgress = await db
    .select()
    .from(taskEmployeeProgressTable)
    .where(and(eq(taskEmployeeProgressTable.taskId, taskId), eq(taskEmployeeProgressTable.userId, userId)));

  if (existingProgress.length > 0) {
    await db
      .update(taskEmployeeProgressTable)
      .set({
        completionPercent: parsed.data.completionPercent,
        expectedCompletionDate: parsed.data.expectedCompletionDate ?? null,
      })
      .where(and(eq(taskEmployeeProgressTable.taskId, taskId), eq(taskEmployeeProgressTable.userId, userId)));
  } else {
    await db.insert(taskEmployeeProgressTable).values({
      taskId,
      userId,
      completionPercent: parsed.data.completionPercent,
      expectedCompletionDate: parsed.data.expectedCompletionDate ?? null,
    });
  }

  // Also update the task-level completionPercent with the average
  const allProgress = await db
    .select({ pct: taskEmployeeProgressTable.completionPercent })
    .from(taskEmployeeProgressTable)
    .where(eq(taskEmployeeProgressTable.taskId, taskId));

  if (allProgress.length > 0) {
    const avg = Math.round(allProgress.reduce((s, p) => s + p.pct, 0) / allProgress.length);
    await db.update(tasksTable).set({ completionPercent: avg }).where(eq(tasksTable.id, taskId));
  }

  const result = await getTaskWithAssignees(taskId);
  res.json(result);
});

export default router;
