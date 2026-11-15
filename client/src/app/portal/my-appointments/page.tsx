"use client";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { useConfirm } from "@/lib/confirm";
import { useToast } from "@/lib/toast";
import type { Appointment } from "@/lib/types";
import { formatDate, formatTime } from "@/lib/utils";
import { Clock, Users, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function canCancel(status: Appointment["status"]) {
  return status === "pending" || status === "confirmed";
}

function WaitingInfo({ appointment }: { appointment: Appointment }) {
  if (appointment.status !== "confirmed" || appointment.queue_position == null) {
    return null;
  }

  const wait = appointment.estimated_wait_minutes ?? 0;
  const ahead = appointment.people_ahead ?? Math.max(0, appointment.queue_position - 1);

  return (
    <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 sm:p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-2">
        Waiting info (approved)
      </p>
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm text-blue-900 bg-white/80 border border-blue-100 rounded-lg px-3 py-2">
          <Users size={16} className="text-blue-600 shrink-0" />
          <span>
            Queue <strong>#{appointment.queue_position}</strong>
            {ahead > 0
              ? ` · ${ahead} patient${ahead === 1 ? "" : "s"} ahead`
              : " · You are next"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-blue-900 bg-white/80 border border-blue-100 rounded-lg px-3 py-2">
          <Clock size={16} className="text-blue-600 shrink-0" />
          <span>
            {wait > 0
              ? <>Estimated waiting time: <strong>~{wait} min</strong></>
              : <><strong>No wait</strong> — you are next in line</>}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const { showToast } = useToast();
  const confirm = useConfirm();

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    apiGet<Appointment[]>("/appointments/my")
      .then(setAppointments)
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, [load]);

  const handleCancel = async (appointment: Appointment) => {
    const ok = await confirm({
      title: "Cancel Appointment",
      message: `Cancel your ${appointment.service?.name} appointment on ${formatDate(appointment.appointment_date)} at ${formatTime(appointment.time_slot)}?`,
      confirmLabel: "Cancel Appointment",
      danger: true,
    });
    if (!ok) return;

    setCancellingId(appointment.id);
    try {
      const res = await apiPost<{ message: string; sms_sent?: boolean }>(
        `/appointments/my/${appointment.id}/cancel`,
        {}
      );
      showToast(
        res.sms_sent
          ? "Appointment cancelled · Confirmation SMS sent"
          : "Appointment cancelled successfully"
      );
      load();
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Failed to cancel appointment",
        "error"
      );
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">My Appointments</h1>
        <p className="text-slate-500 mt-1">
          View your scheduled appointments. After approval, your queue number and estimated waiting time will appear here.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : appointments.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-4">📅</div>
          <p className="text-slate-500">You have no appointments yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((a) => (
            <div
              key={a.id}
              className="card flex flex-col sm:flex-row sm:items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-800 text-lg">
                  {a.service?.name}
                </div>
                <div className="text-slate-500 text-sm mt-1">
                  {a.doctor?.full_name}
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-600">
                  <span>📅 {formatDate(a.appointment_date)}</span>
                  <span>🕐 {formatTime(a.time_slot)}</span>
                </div>
                <WaitingInfo appointment={a} />
                {a.status === "pending" && (
                  <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 w-fit">
                    Waiting for admin approval. Queue and waiting time will show once approved.
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:items-end gap-3 shrink-0">
                <StatusBadge status={a.status} />
                {canCancel(a.status) && (
                  <button
                    type="button"
                    className="btn btn-danger text-xs py-2 px-4 gap-1.5"
                    onClick={() => handleCancel(a)}
                    disabled={cancellingId === a.id}
                  >
                    <XCircle size={14} />
                    {cancellingId === a.id ? "Cancelling..." : "Cancel Appointment"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
