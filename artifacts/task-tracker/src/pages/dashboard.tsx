import { useState } from "react";
import { useLocation } from "wouter";
import {
  useListTasks,
  useGetTaskSummary,
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
  const deleteMutation = useDeleteTask();

  const filteredTasks = (tasks ?? []).filter((task) => {
    if (filter === "pending") return task.status !== "done";
    if (filter === "done") return task.status === "done";
    return true;
  });

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
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Welcome back, {user?.name}
            </p>
          </div>
          {user?.role === "manager" && (
            <button
              onClick={() => setLocation("/tasks/new")}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
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
          {[
            { label: "Total", value: summary?.total ?? 0, color: "bg-slate-50 border-slate-200", text: "text-slate-700" },
            { label: "To Do", value: summary?.todo ?? 0, color: "bg-gray-50 border-gray-200", text: "text-gray-700" },
            { label: "In Progress", value: summary?.in_progress ?? 0, color: "bg-blue-50 border-blue-200", text: "text-blue-700" },
            { label: "Done", value: summary?.done ?? 0, color: "bg-green-50 border-green-200", text: "text-green-700" },
          ].map((card) => (
            <div key={card.label} className={`${card.color} border rounded-xl p-5`}>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{card.label}</p>
              <p className={`text-3xl font-bold ${card.text}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Task List */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          {/* Filter tabs */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">
              {user?.role === "manager" ? "All Tasks" : "My Tasks"}
            </h2>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {(["all", "pending", "done"] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                    filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {f === "pending" ? "Pending" : f === "done" ? "Completed" : "All"}
                </button>
              ))}
            </div>
          </div>

          {tasksLoading ? (
            <div className="p-8 text-center text-gray-400">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">No tasks found</p>
              {user?.role === "manager" && (
                <button
                  onClick={() => setLocation("/tasks/new")}
                  className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Create your first task
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setLocation(`/tasks/${task.id}`)}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-medium text-gray-900 text-sm truncate">{task.title}</p>
                      <StatusBadge status={task.status as "todo" | "in_progress" | "done"} />
                    </div>
                    <p className="text-xs text-gray-500 truncate">{task.description}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      {task.deadline && (
                        <span className="text-xs text-gray-400">
                          Due: {new Date(task.deadline).toLocaleDateString()}
                        </span>
                      )}
                      {task.assignees && task.assignees.length > 0 && (
                        <span className="text-xs text-gray-400">
                          Assigned to: {task.assignees.map((a) => a.name).join(", ")}
                        </span>
                      )}
                      {task.completionPercent != null && (
                        <span className="text-xs text-blue-600 font-medium">{task.completionPercent}% complete</span>
                      )}
                    </div>
                  </div>

                  {task.completionPercent != null && (
                    <div className="w-20 hidden sm:block">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${task.completionPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {user?.role === "manager" && (
                    <button
                      onClick={(e) => handleDelete(task.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 rounded transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}

                  <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
