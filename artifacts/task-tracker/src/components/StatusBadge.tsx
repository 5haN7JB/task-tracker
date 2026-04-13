interface StatusBadgeProps {
  status: "todo" | "in_progress" | "done";
}

const statusConfig = {
  todo: { label: "To Do", className: "bg-[hsl(213,20%,93%)] text-[hsl(213,31%,35%)]" },
  in_progress: { label: "In Progress", className: "bg-[hsl(207,89%,92%)] text-[hsl(207,89%,35%)]" },
  done: { label: "Done", className: "bg-[hsl(142,50%,90%)] text-[hsl(142,60%,28%)]" },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.todo;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${config.className}`}>
      {config.label}
    </span>
  );
}
