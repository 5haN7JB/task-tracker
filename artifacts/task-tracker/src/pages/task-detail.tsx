import { useState } from "react";
import { useLocation, useParams } from "wouter";
import {
  useGetTask,
  useUpdateTask,
  useAddFeedback,
  getListTasksQueryKey,
  getGetTaskSummaryQueryKey,
  getGetTaskQueryKey,
  useListUsers,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import StatusBadge from "@/components/StatusBadge";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const taskId = parseInt(id ?? "0", 10);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: task, isLoading } = useGetTask(taskId, {
    query: { enabled: !!taskId, queryKey: getGetTaskQueryKey(taskId) },
  });
  const { data: users } = useListUsers();
  const updateTask = useUpdateTask();
  const addFeedback = useAddFeedback();

  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<"todo" | "in_progress" | "done">("todo");
  const [completionPercent, setCompletionPercent] = useState<number | "">("");
  const [expectedTime, setExpectedTime] = useState("");
  const [savingProgress, setSavingProgress] = useState(false);

  const employees = (users ?? []).filter((u) => u.role === "employee");
  const [selectedAssignees, setSelectedAssignees] = useState<number[]>([]);
  const [editingAssignees, setEditingAssignees] = useState(false);

  const handleStatusChange = (status: "todo" | "in_progress" | "done") => {
    updateTask.mutate(
      { id: taskId, data: { status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId) });
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTaskSummaryQueryKey() });
          setEditingStatus(false);
        },
      }
    );
  };

  const handleSaveProgress = () => {
    setSavingProgress(true);
    updateTask.mutate(
      {
        id: taskId,
        data: {
          completionPercent: completionPercent === "" ? null : Number(completionPercent),
          expectedCompletionTime: expectedTime || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId) });
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          setSavingProgress(false);
        },
        onError: () => setSavingProgress(false),
      }
    );
  };

  const handleFeedback = () => {
    if (!feedbackText.trim()) return;
    setFeedbackSaving(true);
    addFeedback.mutate(
      { id: taskId, data: { feedback: feedbackText } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId) });
          setFeedbackText("");
          setFeedbackSaving(false);
        },
        onError: () => setFeedbackSaving(false),
      }
    );
  };

  const startEditAssignees = () => {
    setSelectedAssignees(task?.assignees?.map((a) => a.id) ?? []);
    setEditingAssignees(true);
  };

  const handleSaveAssignees = () => {
    updateTask.mutate(
      { id: taskId, data: { assigneeIds: selectedAssignees } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId) });
          setEditingAssignees(false);
        },
      }
    );
  };

  const toggleAssignee = (uid: number) => {
    setSelectedAssignees((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 text-center text-gray-400">Loading task...</div>
      </Layout>
    );
  }

  if (!task) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <p className="text-gray-500">Task not found</p>
          <button onClick={() => setLocation("/dashboard")} className="mt-3 text-blue-600 text-sm">Back to dashboard</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-3xl">
        {/* Back button and title */}
        <div className="flex items-start gap-3 mb-8">
          <button
            onClick={() => setLocation("/dashboard")}
            className="mt-1 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
              <StatusBadge status={task.status as "todo" | "in_progress" | "done"} />
            </div>
            <p className="text-gray-500 text-sm">
              Created {new Date(task.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Description */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
            <p className="text-gray-700 text-sm leading-relaxed">{task.description}</p>
          </div>

          {/* Task Info */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Task Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Deadline</p>
                <p className="text-sm text-gray-900 font-medium">
                  {task.deadline ? new Date(task.deadline).toLocaleDateString() : "No deadline"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Completion</p>
                <p className="text-sm text-gray-900 font-medium">
                  {task.completionPercent != null ? `${task.completionPercent}%` : "Not set"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Expected Time</p>
                <p className="text-sm text-gray-900 font-medium">
                  {task.expectedCompletionTime || "Not set"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <StatusBadge status={task.status as "todo" | "in_progress" | "done"} />
              </div>
            </div>

            {task.completionPercent != null && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{task.completionPercent}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${task.completionPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Assignees */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Assignees</h3>
              {user?.role === "manager" && !editingAssignees && (
                <button
                  onClick={startEditAssignees}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Edit
                </button>
              )}
            </div>

            {editingAssignees ? (
              <div>
                <div className="space-y-2 mb-3">
                  {employees.map((emp) => (
                    <label key={emp.id} className="flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedAssignees.includes(emp.id)}
                        onChange={() => toggleAssignee(emp.id)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{emp.name}</p>
                        <p className="text-xs text-gray-500">{emp.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingAssignees(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg">Cancel</button>
                  <button onClick={handleSaveAssignees} className="text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg">Save</button>
                </div>
              </div>
            ) : task.assignees && task.assignees.length > 0 ? (
              <div className="space-y-2">
                {task.assignees.map((assignee) => (
                  <div key={assignee.id} className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-700 text-xs font-bold">{assignee.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{assignee.name}</p>
                      <p className="text-xs text-gray-500">{assignee.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No assignees</p>
            )}
          </div>

          {/* Employee: Update Status & Progress */}
          {user?.role === "employee" && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Update Progress</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Status</label>
                  <div className="flex gap-2">
                    {(["todo", "in_progress", "done"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        disabled={task.status === s || updateTask.isPending}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                          task.status === s
                            ? "bg-blue-600 text-white"
                            : "border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600"
                        } disabled:opacity-50`}
                      >
                        {s === "todo" ? "To Do" : s === "in_progress" ? "In Progress" : "Done"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Completion %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={completionPercent === "" ? task.completionPercent ?? "" : completionPercent}
                      onChange={(e) => setCompletionPercent(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder={task.completionPercent != null ? String(task.completionPercent) : "0"}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Expected Completion Time</label>
                    <input
                      type="text"
                      value={expectedTime || task.expectedCompletionTime || ""}
                      onChange={(e) => setExpectedTime(e.target.value)}
                      placeholder="e.g. 2 days"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveProgress}
                  disabled={savingProgress}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {savingProgress ? "Saving..." : "Save Progress"}
                </button>
              </div>
            </div>
          )}

          {/* Manager: Update Status too */}
          {user?.role === "manager" && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Update Status</h3>
              <div className="flex gap-2">
                {(["todo", "in_progress", "done"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={task.status === s || updateTask.isPending}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                      task.status === s
                        ? "bg-blue-600 text-white"
                        : "border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600"
                    } disabled:opacity-50`}
                  >
                    {s === "todo" ? "To Do" : s === "in_progress" ? "In Progress" : "Done"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Feedback Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Manager Feedback</h3>
            {task.feedback ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                <p className="text-sm text-amber-900">{task.feedback}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 mb-3">No feedback yet</p>
            )}

            {user?.role === "manager" && (
              <div className="space-y-2">
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Add feedback for the employee..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <button
                  onClick={handleFeedback}
                  disabled={!feedbackText.trim() || feedbackSaving}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {feedbackSaving ? "Saving..." : task.feedback ? "Update Feedback" : "Add Feedback"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
