import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import type { Task, Profile } from "./types";

// ─── Query keys ──────────────────────────────────────────────────────────────
export const TASKS_KEY = ["tasks"] as const;
export const taskKey = (id: string) => ["task", id] as const;
export const USERS_KEY = ["users"] as const;

// ─── Data transformer ─────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformTask(raw: any): Task {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? null,
    status: raw.status,
    deadline: raw.deadline ?? null,
    completionPercent: raw.completion_percent ?? 0,
    feedback: raw.feedback ?? null,
    createdById: raw.created_by_id,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    assignees: (raw.task_assignees ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((a: any) => a.profiles)
      .filter(Boolean)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => ({
        id: p.id,
        email: p.email,
        name: p.name,
        role: p.role,
        createdAt: p.created_at,
      })),
    employeeProgress: (raw.task_employee_progress ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((ep: any) => ({
        userId: ep.user_id,
        userName: ep.profiles?.name ?? "Unknown",
        completionPercent: ep.completion_percent ?? 0,
        expectedCompletionDate: ep.expected_completion_date ?? null,
        updatedAt: ep.updated_at ?? null,
      })),
  };
}

const TASK_SELECT = `
  id, title, description, status, deadline, completion_percent, feedback,
  created_by_id, created_at, updated_at,
  task_assignees (
    profiles ( id, email, name, role, created_at )
  ),
  task_employee_progress (
    user_id, completion_percent, expected_completion_date, updated_at,
    profiles ( name )
  )
`;

// ─── Queries ──────────────────────────────────────────────────────────────────

/** List tasks. RLS ensures employees see only their assigned tasks. */
export function useListTasks() {
  return useQuery({
    queryKey: TASKS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(TASK_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(transformTask);
    },
  });
}

/** Fetch a single task by ID. */
export function useGetTask(taskId: string) {
  return useQuery({
    queryKey: taskKey(taskId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(TASK_SELECT)
        .eq("id", taskId)
        .single();
      if (error) throw error;
      return transformTask(data);
    },
    enabled: !!taskId,
  });
}

/** List all user profiles (used for assignee pickers). */
export function useListUsers() {
  return useQuery({
    queryKey: USERS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, name, role, created_at")
        .order("name");
      if (error) throw error;
      return (data ?? []).map(
        (p): Profile => ({
          id: p.id,
          email: p.email,
          name: p.name,
          role: p.role,
          createdAt: p.created_at,
        })
      );
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string;
      description?: string;
      deadline?: string | null;
      assigneeIds?: string[];
    }) => {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert task
      const { data: task, error: taskErr } = await supabase
        .from("tasks")
        .insert({
          title: payload.title,
          description: payload.description || null,
          deadline: payload.deadline || null,
          created_by_id: user.id,
        })
        .select("id")
        .single();
      if (taskErr) throw taskErr;

      // Insert assignees
      if (payload.assigneeIds && payload.assigneeIds.length > 0) {
        const { error: assignErr } = await supabase
          .from("task_assignees")
          .insert(
            payload.assigneeIds.map((uid) => ({
              task_id: task.id,
              user_id: uid,
            }))
          );
        if (assignErr) throw assignErr;
      }

      return task;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      taskId: string;
      status?: "todo" | "in_progress" | "done";
      assigneeIds?: string[];
      completionPercent?: number;
    }) => {
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (payload.status !== undefined) updates.status = payload.status;
      if (payload.completionPercent !== undefined)
        updates.completion_percent = payload.completionPercent;

      if (Object.keys(updates).length > 1) {
        const { error } = await supabase
          .from("tasks")
          .update(updates)
          .eq("id", payload.taskId);
        if (error) throw error;
      }

      // Handle assignees replacement
      if (payload.assigneeIds !== undefined) {
        const { error: delErr } = await supabase
          .from("task_assignees")
          .delete()
          .eq("task_id", payload.taskId);
        if (delErr) throw delErr;

        if (payload.assigneeIds.length > 0) {
          const { error: insErr } = await supabase
            .from("task_assignees")
            .insert(
              payload.assigneeIds.map((uid) => ({
                task_id: payload.taskId,
                user_id: uid,
              }))
            );
          if (insErr) throw insErr;
        }
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: TASKS_KEY });
      qc.invalidateQueries({ queryKey: taskKey(variables.taskId) });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}

export function useAddFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { taskId: string; feedback: string }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ feedback: payload.feedback, updated_at: new Date().toISOString() })
        .eq("id", payload.taskId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: taskKey(variables.taskId) });
      qc.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}

export function useUpdateMyProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      taskId: string;
      completionPercent: number;
      expectedCompletionDate?: string | null;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("task_employee_progress")
        .upsert(
          {
            task_id: payload.taskId,
            user_id: user.id,
            completion_percent: payload.completionPercent,
            expected_completion_date: payload.expectedCompletionDate ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "task_id,user_id" }
        );
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: taskKey(variables.taskId) });
      qc.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}
