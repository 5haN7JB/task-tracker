import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateTask, useListUsers } from "@/lib/queries";
import Layout from "@/components/Layout";

export default function NewTaskPage() {
  const [, setLocation] = useLocation();
  const { data: users } = useListUsers();
  const createTask = useCreateTask();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");

  const employees = (users ?? []).filter((u) => u.role === "employee");

  const toggleAssignee = (id: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Task title is required";
    if (!deadline) newErrors.deadline = "Deadline is required";
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    createTask.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        deadline: deadline || null,
        assigneeIds: selectedAssignees,
      },
      {
        onSuccess: () => {
          setLocation("/dashboard");
        },
        onError: (err: unknown) => {
          const e = err as { message?: string };
          setServerError(e?.message || "Failed to create task. Please try again.");
        },
      }
    );
  };

  return (
    <Layout>
      <div className="p-8 max-w-2xl">
        {/* Back + Title */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => setLocation("/dashboard")}
            className="p-2 text-[hsl(213,20%,55%)] hover:text-[hsl(213,31%,18%)] rounded-lg hover:bg-[hsl(210,40%,93%)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-xl font-bold text-[hsl(213,31%,18%)]">Create New Task</h2>
            <p className="text-[hsl(213,20%,55%)] text-sm">Fill in the details below. Title and deadline are required.</p>
          </div>
        </div>

        <div className="bg-white border border-[hsl(214,32%,88%)] rounded-xl shadow-sm p-6">
          {serverError && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-[hsl(213,31%,18%)] mb-1.5">
                Task Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors((p) => ({ ...p, title: "" }));
                }}
                placeholder="e.g. Prepare Q2 portfolio report"
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(207,89%,45%)] focus:border-transparent transition-all ${errors.title ? "border-red-300 bg-red-50" : "border-[hsl(214,32%,88%)]"}`}
              />
              {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[hsl(213,31%,18%)] mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what needs to be done..."
                rows={4}
                className="w-full px-4 py-2.5 border border-[hsl(214,32%,88%)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(207,89%,45%)] focus:border-transparent transition-all resize-none"
              />
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-sm font-medium text-[hsl(213,31%,18%)] mb-1.5">
                Deadline <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => {
                  setDeadline(e.target.value);
                  if (errors.deadline) setErrors((p) => ({ ...p, deadline: "" }));
                }}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(207,89%,45%)] focus:border-transparent transition-all ${errors.deadline ? "border-red-300 bg-red-50" : "border-[hsl(214,32%,88%)]"}`}
              />
              {errors.deadline && <p className="mt-1 text-xs text-red-600">{errors.deadline}</p>}
            </div>

            {/* Assignees */}
            <div>
              <label className="block text-sm font-medium text-[hsl(213,31%,18%)] mb-2">
                Assign to Employees
                <span className="ml-2 text-xs font-normal text-[hsl(213,20%,55%)]">Select one or more</span>
              </label>
              {employees.length === 0 ? (
                <p className="text-sm text-[hsl(213,20%,60%)]">No employees found</p>
              ) : (
                <div className="space-y-2">
                  {employees.map((emp) => {
                    const selected = selectedAssignees.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                          selected
                            ? "border-[hsl(207,89%,65%)] bg-[hsl(207,89%,97%)]"
                            : "border-[hsl(214,32%,88%)] hover:bg-[hsl(210,40%,98%)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleAssignee(emp.id)}
                          className="w-4 h-4 text-[hsl(207,89%,45%)] rounded"
                        />
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[hsl(207,89%,92%)] flex items-center justify-center flex-shrink-0">
                            <span className="text-[hsl(207,89%,35%)] text-[10px] font-bold">{emp.name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[hsl(213,31%,18%)]">{emp.name}</p>
                            <p className="text-xs text-[hsl(213,20%,55%)]">{emp.email}</p>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
              {selectedAssignees.length > 0 && (
                <p className="mt-2 text-xs text-[hsl(207,89%,42%)] font-medium">
                  {selectedAssignees.length} employee{selectedAssignees.length > 1 ? "s" : ""} selected
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setLocation("/dashboard")}
                className="flex-1 py-2.5 px-4 border border-[hsl(214,32%,85%)] text-[hsl(213,31%,30%)] rounded-lg text-sm font-medium hover:bg-[hsl(210,40%,96%)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createTask.isPending}
                className="flex-1 py-2.5 px-4 bg-[hsl(207,89%,45%)] hover:bg-[hsl(207,89%,40%)] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
