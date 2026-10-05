import { statusLabels, type Status } from "@/lib/validation";
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`badge badge-${status}`}>{statusLabels[status]}</span>
  );
}
