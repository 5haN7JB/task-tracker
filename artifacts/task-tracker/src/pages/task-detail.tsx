import { useState } from "react";
import { useLocation, useParams } from "wouter";
import {
  useGetTask,
  useUpdateTask,
  useAddFeedback,
  useUpdateMyProgress,
  useListUsers,
} from "@/lib/queries";
import { useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import StatusBadge from "@/components/StatusBadge";

export default function TaskDetailPage() {
  const { id: taskId } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: task, isLoading } = useGetTask(taskId ?? "");
  const { data: users } = useListUsers();
  const updateTask = useUpdateTask();
  const addFeedback = useAddFeedback();
  const updateMyProgress = useUpdateMyProgress();

  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSaving, setFeedbackSaving] = useState(false);

  // My progress (employee)
  const myProgress = task?.employeeProgress?.find((p) => p.userId === user?.id);
  const [myPercent, setMyPercent] = useState<number | "">(
    myProgress?.completionPercent ?? ""
  );
  const [myExpectedDate, setMyExpectedDate] = useState<string>(
    myProgress?.expectedCompletionDate ?? ""
  );
  const [savingProgress, setSavingProgress] = useState(false);

  const employees = (users ?? []).filter((u) => u.role === "employee");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [editingAssignees, setEditingAssignees] = useState(false);

  const handleStatusChange = (status: "todo" | "in_progress" | "done") => {
    if (!taskId) return;
    updateTask.mutate({ taskId, status });
  };

  const handleSaveMyProgress = () => {
    if (myPercent === "" || !taskId) return;
    setSavingProgress(true);
    updateMyProgress.mutate(
      {
        taskId,
        completionPercent: Number(myPercent),
        expectedCompletionDate: myExpectedDate || null,
      },
      {
        onSettled: () => setSavingProgress(false),
      }
    );
  };

  const handleFeedback = () => {
    if (!feedbackText.trim() || !taskId) return;
    setFeedbackSaving(true);
    addFeedback.mutate(
      { taskId, feedback: feedbackText },
      {
        onSuccess: () => setFeedbackText(""),
        onSettled: () => setFeedbackSaving(false),
      }
    );
  };

  const startEditAssignees = () => {
    setSelectedAssignees(task?.assignees?.map((a) => a.id) ?? []);
    setEditingAssignees(true);
  };

  const handleSaveAssignees = () => {
    if (!taskId) return;
    updateTask.mutate(
      { taskId, assigneeIds: selectedAssignees },
      { onSuccess: () => setEditingAssignees(false) }
    );
  };

  const toggleAssignee = (uid: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 text-center text-[hsl(213,20%,55%)] text-sm">Loading task...</div>
      </Layout>
    );
  }

  if (!task) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <p className="text-[hsl(213,20%,55%)] text-sm">Task not found</p>
          <button
            onClick={() => setLocation("/dashboard")}
            className="mt-3 text-[hsl(207,89%,45%)] text-sm"
          >
            Back to dashboard
          </button>
        </div>
      </Layout>
    );
  }

  // Average progress across all employees
  const avgProgress =
    task.employeeProgress && task.employeeProgress.length > 0
      ? Math.round(
          task.employeeProgress.reduce((s, p) => s + p.completionPercent, 0) /
            task.employeeProgress.length
        )
      : task.completionPercent ?? null;

  return (
    <Layout>
      <div className="p-8 max-w-3xl">
        {/* Back + Title */}
        <div className="flex items-start gap-3 mb-8">
          <button
            onClick={() => setLocation("/dashboard")}
            className="mt-1 p-2 text-[hsl(213,20%,55%)] hover:text-[hsl(213,31%,18%)] rounded-lg hover:bg-[hsl(210,40%,93%)] transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h2 className="text-xl font-bold text-[hsl(213,31%,18%)]">{task.title}</h2>
              <StatusBadge status={task.status} />
            </div>
            <p className="text-[hsl(213,20%,55%)] text-sm">
              Created {new Date(task.createdAt).toLocaleDateString()}
              {task.deadline && ` · Due ${new Date(task.deadline).toLocaleDateString()}`}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Description */}
          <div className="bg-white border border-[hsl(214,32%,88%)] rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-[hsl(213,20%,50%)] uppercase tracking-wide mb-2">Description</h3>
            <p className="text-[hsl(213,31%,22%)] text-sm leading-relaxed">{task.description}</p>
          </div>

          {/* Overall Progress */}
          {avgProgress != null && (
            <div className="bg-white border border-[hsl(207,89%,88%)] rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-[hsl(207,60%,40%)] uppercase tracking-wide">Overall Progress</h3>
                <span className="text-sm font-bold text-[hsl(207,89%,42%)]">{avgProgress}%</span>
              </div>
              <div className="h-2.5 bg-[hsl(207,89%,93%)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[hsl(207,89%,50%)] rounded-full transition-all duration-700"
                  style={{ width: `${avgProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Task Details */}
          <div className="bg-white border border-[hsl(214,32%,88%)] rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-[hsl(213,20%,50%)] uppercase tracking-wide mb-4">Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-[hsl(213,20%,60%)] mb-0.5 uppercase tracking-wide">Deadline</p>
                <p className="text-sm font-medium text-[hsl(213,31%,18%)]">
                  {task.deadline ? new Date(task.deadline).toLocaleDateString() : "Not set"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[hsl(213,20%,60%)] mb-0.5 uppercase tracking-wide">Status</p>
                <StatusBadge status={task.status} />
              </div>
            </div>
          </div>

          {/* Assignees */}
          <div className="bg-white border border-[hsl(214,32%,88%)] rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-[hsl(213,20%,50%)] uppercase tracking-wide">Assignees</h3>
              {user?.role === "manager" && !editingAssignees && (
                <button
                  onClick={startEditAssignees}
                  className="text-xs text-[hsl(207,89%,45%)] hover:text-[hsl(207,89%,38%)] font-medium"
                >
                  Edit
                </button>
              )}
            </div>

            {editingAssignees ? (
              <div>
                <div className="space-y-2 mb-3">
                  {employees.map((emp) => (
                    <label
                      key={emp.id}
                      className={`flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer transition-all ${
                        selectedAssignees.includes(emp.id)
                          ? "border-[hsl(207,89%,65%)] bg-[hsl(207,89%,97%)]"
                          : "border-[hsl(214,32%,88%)] hover:bg-[hsl(210,40%,98%)]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAssignees.includes(emp.id)}
                        onChange={() => toggleAssignee(emp.id)}
                        className="w-4 h-4 text-[hsl(207,89%,45%)]"
                      />
                      <div>
                        <p className="text-sm font-medium text-[hsl(213,31%,18%)]">{emp.name}</p>
                        <p className="text-xs text-[hsl(213,20%,55%)]">{emp.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingAssignees(false)}
                    className="text-sm text-[hsl(213,20%,50%)] hover:text-[hsl(213,31%,18%)] px-3 py-1.5 border border-[hsl(214,32%,85%)] rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAssignees}
                    className="text-sm text-white bg-[hsl(207,89%,45%)] hover:bg-[hsl(207,89%,40%)] px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : task.assignees && task.assignees.length > 0 ? (
              <div className="space-y-2">
                {task.assignees.map((assignee) => (
                  <div key={assignee.id} className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-[hsl(207,89%,92%)] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-[hsl(207,89%,35%)] text-[10px] font-bold">{assignee.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[hsl(213,31%,18%)]">{assignee.name}</p>
                      <p className="text-xs text-[hsl(213,20%,55%)]">{assignee.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[hsl(213,20%,60%)]">No assignees</p>
            )}
          </div>

          {/* Per-Employee Progress */}
          {task.employeeProgress && task.employeeProgress.length > 0 && (
            <div className="bg-white border border-[hsl(214,32%,88%)] rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-[hsl(213,20%,50%)] uppercase tracking-wide mb-4">Employee Progress</h3>
              <div className="space-y-4">
                {task.employeeProgress.map((ep) => (
                  <div key={ep.userId}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[hsl(207,89%,92%)] flex items-center justify-center flex-shrink-0">
                          <span className="text-[hsl(207,89%,35%)] text-[9px] font-bold">{ep.userName.charAt(0)}</span>
                        </div>
                        <span className="text-sm font-medium text-[hsl(213,31%,18%)]">{ep.userName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {ep.expectedCompletionDate && (
                          <span className="text-[10px] text-[hsl(213,20%,55%)]">
                            by {new Date(ep.expectedCompletionDate).toLocaleDateString()}
                          </span>
                        )}
                        <span className="text-sm font-bold text-[hsl(207,89%,42%)]">{ep.completionPercent}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-[hsl(207,89%,93%)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[hsl(207,89%,50%)] rounded-full transition-all duration-500"
                        style={{ width: `${ep.completionPercent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Employee: Update My Progress */}
          {user?.role === "employee" && (
            <div className="bg-white border border-[hsl(214,32%,88%)] rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-[hsl(213,20%,50%)] uppercase tracking-wide mb-4">Update My Progress</h3>
              <div className="space-y-4">
                {/* Status */}
                <div>
                  <p className="text-xs text-[hsl(213,20%,55%)] mb-2">Task Status</p>
                  <div className="flex gap-2 flex-wrap">
                    {(["todo", "in_progress", "done"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        disabled={task.status === s || updateTask.isPending}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                          task.status === s
                            ? "bg-[hsl(207,89%,45%)] text-white"
                            : "border border-[hsl(214,32%,85%)] text-[hsl(213,31%,30%)] hover:border-[hsl(207,89%,55%)] hover:text-[hsl(207,89%,42%)]"
                        } disabled:opacity-50`}
                      >
                        {s === "todo" ? "To Do" : s === "in_progress" ? "In Progress" : "Done"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[hsl(213,20%,55%)] mb-1.5 block">My Completion % (0–100)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={myPercent}
                      onChange={(e) =>
                        setMyPercent(
                          e.target.value === ""
                            ? ""
                            : Math.min(100, Math.max(0, Number(e.target.value)))
                        )
                      }
                      placeholder={String(myProgress?.completionPercent ?? 0)}
                      className="w-full px-3 py-2 border border-[hsl(214,32%,88%)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(207,89%,45%)] transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[hsl(213,20%,55%)] mb-1.5 block">Expected Completion Date</label>
                    <input
                      type="date"
                      value={myExpectedDate}
                      onChange={(e) => setMyExpectedDate(e.target.value)}
                      className="w-full px-3 py-2 border border-[hsl(214,32%,88%)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(207,89%,45%)] transition-all"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveMyProgress}
                  disabled={myPercent === "" || savingProgress}
                  className="bg-[hsl(207,89%,45%)] hover:bg-[hsl(207,89%,40%)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
                >
                  {savingProgress ? "Saving..." : "Save My Progress"}
                </button>
              </div>
            </div>
          )}

          {/* Manager: Update Status */}
          {user?.role === "manager" && (
            <div className="bg-white border border-[hsl(214,32%,88%)] rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-[hsl(213,20%,50%)] uppercase tracking-wide mb-3">Update Status</h3>
              <div className="flex gap-2">
                {(["todo", "in_progress", "done"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={task.status === s || updateTask.isPending}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                      task.status === s
                        ? "bg-[hsl(207,89%,45%)] text-white"
                        : "border border-[hsl(214,32%,85%)] text-[hsl(213,31%,30%)] hover:border-[hsl(207,89%,55%)] hover:text-[hsl(207,89%,42%)]"
                    } disabled:opacity-50`}
                  >
                    {s === "todo" ? "To Do" : s === "in_progress" ? "In Progress" : "Done"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Feedback */}
          <div className="bg-white border border-[hsl(214,32%,88%)] rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-[hsl(213,20%,50%)] uppercase tracking-wide mb-3">Manager Feedback</h3>
            {task.feedback ? (
              <div className="p-3 bg-[hsl(38,90%,96%)] border border-[hsl(38,80%,82%)] rounded-lg mb-3">
                <p className="text-sm text-[hsl(38,50%,30%)]">{task.feedback}</p>
              </div>
            ) : (
              <p className="text-sm text-[hsl(213,20%,60%)] mb-3">No feedback yet</p>
            )}

            {user?.role === "manager" && (
              <div className="space-y-2">
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Add feedback for the team..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-[hsl(214,32%,88%)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(207,89%,45%)] resize-none"
                />
                <button
                  onClick={handleFeedback}
                  disabled={!feedbackText.trim() || feedbackSaving}
                  className="bg-[hsl(38,80%,52%)] hover:bg-[hsl(38,80%,46%)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
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
