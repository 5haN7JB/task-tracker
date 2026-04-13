interface StatusBadgeProps {
  status: "todo" | "in_progress" | "done";
}

const statusConfig = {
  todo: { label: "To Do", className: "bg-gray-100 text-gray-700" },
  in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-700" },
  done: { label: "Done", className: "bg-green-100 text-green-700" },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.todo;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
