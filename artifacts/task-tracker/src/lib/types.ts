export type UserRole = "manager" | "employee";
export type TaskStatus = "todo" | "in_progress" | "done";

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface EmployeeProgress {
  userId: string;
  userName: string;
  completionPercent: number;
  expectedCompletionDate: string | null;
  updatedAt: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  deadline: string | null;
  completionPercent: number;
  feedback: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  assignees: Profile[];
  employeeProgress: EmployeeProgress[];
}

export interface TaskSummary {
  total: number;
  todo: number;
  in_progress: number;
  done: number;
}
