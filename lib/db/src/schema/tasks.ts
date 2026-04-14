import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const tasksTable = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status", { enum: ["todo", "in_progress", "done"] }).notNull().default("todo"),
  deadline: text("deadline"),
  completionPercent: integer("completion_percent"),
  expectedCompletionTime: text("expected_completion_time"),
  feedback: text("feedback"),
  createdById: integer("created_by_id").notNull().references(() => usersTable.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const taskAssigneesTable = sqliteTable("task_assignees", {
  taskId: integer("task_id").notNull().references(() => tasksTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
});

export const taskEmployeeProgressTable = sqliteTable("task_employee_progress", {
  taskId: integer("task_id").notNull().references(() => tasksTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  completionPercent: integer("completion_percent").notNull().default(0),
  expectedCompletionDate: text("expected_completion_date"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
export type TaskAssignee = typeof taskAssigneesTable.$inferSelect;
export type TaskEmployeeProgress = typeof taskEmployeeProgressTable.$inferSelect;
