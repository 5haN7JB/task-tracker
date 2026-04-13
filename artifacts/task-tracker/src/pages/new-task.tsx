import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateTask, useListUsers, getListTasksQueryKey, getGetTaskSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";

export default function NewTaskPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: users } = useListUsers();
  const createTask = useCreateTask();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<number[]>([]);
  const [error, setError] = useState("");

  const employees = (users ?? []).filter((u) => u.role === "employee");

  const toggleAssignee = (id: number) => {
    setSelectedAssignees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    createTask.mutate(
      {
        data: {
          title,
          description,
          deadline: deadline || null,
          assigneeIds: selectedAssignees,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTaskSummaryQueryKey() });
          setLocation("/dashboard");
        },
        onError: (err: unknown) => {
          const apiErr = err as { data?: { error?: string } };
          setError(apiErr?.data?.error || "Failed to create task");
        },
      }
    );
  };

  return (
    <Layout>
      <div className="p-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => setLocation("/dashboard")}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Task</h1>
            <p className="text-gray-500 text-sm">Fill in the details below</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Task Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Build login page"
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what needs to be done..."
                required
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Deadline (optional)
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign to Employees
              </label>
              {employees.length === 0 ? (
                <p className="text-sm text-gray-400">No employees found</p>
              ) : (
                <div className="space-y-2">
                  {employees.map((emp) => (
                    <label
                      key={emp.id}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAssignees.includes(emp.id)}
                        onChange={() => toggleAssignee(emp.id)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{emp.name}</p>
                        <p className="text-xs text-gray-500">{emp.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setLocation("/dashboard")}
                className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createTask.isPending}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createTask.isPending ? "Creating..." : "Create Task"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
