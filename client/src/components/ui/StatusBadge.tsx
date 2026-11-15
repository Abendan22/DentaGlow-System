import type { Appointment } from "@/lib/types";

const statusLabels: Record<Appointment["status"], string> = {
  pending: "Pending",
  confirmed: "Approved",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

export function StatusBadge({ status }: { status: Appointment["status"] }) {
  return (
    <span className={`badge badge-${status}`}>
      {statusLabels[status] ?? status}
    </span>
  );
}
