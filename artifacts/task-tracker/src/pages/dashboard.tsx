import { useState } from "react";
import { useLocation } from "wouter";
import {
  useListTasks,
  useGetTaskSummary,
  useListUsers,
  getListTasksQueryKey,
  getGetTaskSummaryQueryKey,
  useDeleteTask,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import StatusBadge from "@/components/StatusBadge";

type FilterType = "all" | "pending" | "done";

export default function DashboardPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<FilterType>("all");
  const queryClient = useQueryClient();

  const { data: tasks, isLoading: tasksLoading } = useListTasks();
  const { data: summary } = useGetTaskSummary();
  const { data: users } = useListUsers();
  const deleteMutation = useDeleteTask();

  const filteredTasks = (tasks ?? []).filter((task) => {
    if (filter === "pending") return task.status !== "done";
    if (filter === "done") return task.status === "done";
    return true;
  });

  // Compute per-employee task counts for manager view
  const employeeSummary = (() => {
    if (user?.role !== "manager") return [];
    const employees = (users ?? []).filter(u => u.role === "employee");
    return employees
      .map(emp => {
        const assigned = (tasks ?? []).filter(t =>
          t.assignees?.some(a => a.id === emp.id)
        );
        const pending = assigned.filter(t => t.status !== "done").length;
        const done = assigned.filter(t => t.status === "done").length;
        return { ...emp, total: assigned.length, pending, done };
      })
      .sort((a, b) => b.pending - a.pending);
  })();

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this task?")) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTaskSummaryQueryKey() });
        },
      }
    );
  };

  return (
    <Layout>
      <div className="p-8 max-w-6xl">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-[hsl(213,31%,18%)]">
              {user?.role === "manager" ? "All Tasks" : "My Tasks"}
            </h2>
            <p className="text-[hsl(213,20%,50%)] text-sm mt-0.5">
              {filter === "pending" ? "Showing pending tasks" : filter === "done" ? "Showing completed tasks" : "Showing all tasks"}
            </p>
          </div>
          {user?.role === "manager" && (
            <button
              onClick={() => setLocation("/tasks/new")}
              className="flex items-center gap-2 bg-[hsl(207,89%,45%)] hover:bg-[hsl(207,89%,40%)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Task
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-[hsl(214,32%,88%)] rounded-xl p-5 shadow-sm">
            <p className="text-[10px] font-semibold text-[hsl(213,20%,55%)] uppercase tracking-wider mb-2">Total</p>
            <p className="text-3xl font-bold text-[hsl(213,31%,18%)]">{summary?.total ?? 0}</p>
          </div>
          <div className="bg-white border border-[hsl(214,32%,88%)] rounded-xl p-5 shadow-sm">
            <p className="text-[10px] font-semibold text-[hsl(213,20%,55%)] uppercase tracking-wider mb-2">To Do</p>
            <p className="text-3xl font-bold text-[hsl(213,31%,32%)]">{summary?.todo ?? 0}</p>
            <div className="mt-2 h-1 bg-gray-100 rounded-full">
              <div className="h-full bg-gray-400 rounded-full" style={{ width: summary?.total ? `${((summary.todo ?? 0) / summary.total) * 100}%` : "0%" }} />
            </div>
          </div>
          <div className="bg-white border border-[hsl(207,89%,90%)] rounded-xl p-5 shadow-sm">
            <p className="text-[10px] font-semibold text-[hsl(207,60%,50%)] uppercase tracking-wider mb-2">In Progress</p>
            <p className="text-3xl font-bold text-[hsl(207,89%,40%)]">{summary?.in_progress ?? 0}</p>
            <div className="mt-2 h-1 bg-[hsl(207,89%,90%)] rounded-full">
              <div className="h-full bg-[hsl(207,89%,50%)] rounded-full" style={{ width: summary?.total ? `${((summary.in_progress ?? 0) / summary.total) * 100}%` : "0%" }} />
            </div>
          </div>
          <div className="bg-white border border-[hsl(142,50%,88%)] rounded-xl p-5 shadow-sm">
            <p className="text-[10px] font-semibold text-[hsl(142,50%,40%)] uppercase tracking-wider mb-2">Done</p>
            <p className="text-3xl font-bold text-[hsl(142,60%,35%)]">{summary?.done ?? 0}</p>
            <div className="mt-2 h-1 bg-[hsl(142,50%,90%)] rounded-full">
              <div className="h-full bg-[hsl(142,71%,42%)] rounded-full" style={{ width: summary?.total ? `${((summary.done ?? 0) / summary.total) * 100}%` : "0%" }} />
            </div>
          </div>
        </div>

        <div className={`grid gap-6 ${user?.role === "manager" ? "grid-cols-3" : "grid-cols-1"}`}>
          {/* Task List */}
          <div className={`bg-white border border-[hsl(214,32%,88%)] rounded-xl shadow-sm ${user?.role === "manager" ? "col-span-2" : ""}`}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(214,32%,91%)]">
              <h3 className="font-semibold text-[hsl(213,31%,18%)] text-sm">Task List</h3>
              <div className="flex gap-1 bg-[hsl(210,40%,95%)] p-1 rounded-lg">
                {(["all", "pending", "done"] as FilterType[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      filter === f
                        ? "bg-white text-[hsl(213,31%,18%)] shadow-sm"
                        : "text-[hsl(213,20%,50%)] hover:text-[hsl(213,31%,18%)]"
                    }`}
                  >
                    {f === "pending" ? "Pending" : f === "done" ? "Completed" : "All"}
                  </button>
                ))}
              </div>
            </div>

            {tasksLoading ? (
              <div className="p-8 text-center text-[hsl(213,20%,60%)] text-sm">Loading tasks...</div>
            ) : filteredTasks.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-10 h-10 bg-[hsl(210,40%,94%)] rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-[hsl(213,20%,65%)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-[hsl(213,20%,55%)] text-sm">No tasks found</p>
                {user?.role === "manager" && (
                  <button
                    onClick={() => setLocation("/tasks/new")}
                    className="mt-3 text-[hsl(207,89%,45%)] hover:text-[hsl(207,89%,38%)] text-sm font-medium"
                  >
                    Create your first task
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[hsl(214,32%,94%)]">
                {filteredTasks.map((task) => {
                  const avgProgress = task.employeeProgress && task.employeeProgress.length > 0
                    ? Math.round(task.employeeProgress.reduce((s, p) => s + p.completionPercent, 0) / task.employeeProgress.length)
                    : task.completionPercent ?? null;
                  return (
                    <div
                      key={task.id}
                      onClick={() => setLocation(`/tasks/${task.id}`)}
                      className="px-5 py-4 hover:bg-[hsl(210,40%,98%)] cursor-pointer transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-[hsl(213,31%,18%)] text-sm truncate">{task.title}</p>
                            <StatusBadge status={task.status as "todo" | "in_progress" | "done"} />
                          </div>
                          <p className="text-xs text-[hsl(213,20%,55%)] truncate mb-2">{task.description}</p>

                          {/* Progress bar */}
                          {avgProgress != null && (
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="flex-1 h-1.5 bg-[hsl(210,40%,92%)] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[hsl(207,89%,50%)] rounded-full transition-all duration-500"
                                  style={{ width: `${avgProgress}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-[hsl(207,89%,42%)] font-semibold whitespace-nowrap">{avgProgress}%</span>
                            </div>
                          )}

                          <div className="flex items-center gap-3 flex-wrap">
                            {task.deadline && (
                              <span className="text-[10px] text-[hsl(213,20%,58%)]">
                                Due {new Date(task.deadline).toLocaleDateString()}
                              </span>
                            )}
                            {task.assignees && task.assignees.length > 0 && (
                              <span className="text-[10px] text-[hsl(213,20%,58%)]">
                                {task.assignees.map(a => a.name).join(", ")}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          {user?.role === "manager" && (
                            <button
                              onClick={(e) => handleDelete(task.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-[hsl(213,20%,65%)] hover:text-[hsl(0,72%,51%)] rounded transition-all"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                          <svg className="w-4 h-4 text-[hsl(214,32%,80%)] group-hover:text-[hsl(207,89%,50%)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Manager: Employee Workload */}
          {user?.role === "manager" && (
            <div className="bg-white border border-[hsl(214,32%,88%)] rounded-xl shadow-sm h-fit">
              <div className="px-5 py-4 border-b border-[hsl(214,32%,91%)]">
                <h3 className="font-semibold text-[hsl(213,31%,18%)] text-sm">Team Workload</h3>
                <p className="text-[10px] text-[hsl(213,20%,55%)] mt-0.5">Pending tasks per employee</p>
              </div>
              <div className="p-5 space-y-4">
                {employeeSummary.length === 0 ? (
                  <p className="text-sm text-[hsl(213,20%,60%)]">No employees found</p>
                ) : (
                  employeeSummary.map((emp) => (
                    <div key={emp.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[hsl(207,89%,92%)] flex items-center justify-center flex-shrink-0">
                            <span className="text-[hsl(207,89%,35%)] text-[10px] font-bold">{emp.name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[hsl(213,31%,18%)]">{emp.name}</p>
                            <p className="text-[10px] text-[hsl(213,20%,55%)]">{emp.total} tasks total</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {emp.pending > 0 && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              emp.pending >= 3
                                ? "bg-red-50 text-red-600"
                                : emp.pending >= 2
                                ? "bg-orange-50 text-orange-600"
                                : "bg-[hsl(207,89%,94%)] text-[hsl(207,89%,38%)]"
                            }`}>
                              {emp.pending} pending
                            </span>
                          )}
                          {emp.pending === 0 && emp.total > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-semibold">
                              all done
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-1.5 bg-[hsl(210,40%,93%)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            emp.pending >= 3 ? "bg-red-400" : emp.pending >= 2 ? "bg-orange-400" : "bg-[hsl(207,89%,55%)]"
                          }`}
                          style={{ width: emp.total > 0 ? `${(emp.pending / Math.max(...employeeSummary.map(e => e.total), 1)) * 100}%` : "0%" }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
