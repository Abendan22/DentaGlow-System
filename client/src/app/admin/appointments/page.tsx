"use client";

import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { useConfirm } from "@/lib/confirm";
import { useToast } from "@/lib/toast";
import type {
  Appointment,
  DentalDoctor,
  Patient,
  Service,
} from "@/lib/types";
import { formatDate, formatTime, localDateString } from "@/lib/utils";
import { Check, CheckCircle2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type FilterTab = "all" | "pending" | "confirmed" | "completed" | "rejected";

export default function AppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<DentalDoctor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const { showToast } = useToast();
  const confirm = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filter !== "all") params.set("status", filter);
    const q = params.toString() ? `?${params}` : "";
    Promise.all([
      apiGet<Appointment[]>(`/appointments${q}`),
      apiGet<Appointment[]>("/appointments?status=pending"),
    ])
      .then(([data, pending]) => {
        setItems(data);
        setPendingCount(pending.length);
      })
      .finally(() => setLoading(false));
  }, [search, filter]);

  useEffect(() => {
    apiGet<Patient[]>("/patients").then(setPatients);
    apiGet<DentalDoctor[]>("/doctors?active_only=1").then(setDoctors);
    apiGet<Service[]>("/services?active_only=1").then(setServices);
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const loadSlots = async (doctorId: string, date: string) => {
    if (!doctorId || !date) {
      setAvailableSlots([]);
      return;
    }
    try {
      const data = await apiGet<{ slots: string[] }>(
        `/appointments/available-slots?doctor_id=${doctorId}&date=${date}`
      );
      setAvailableSlots(data.slots);
    } catch (err: unknown) {
      setAvailableSlots([]);
      showToast(
        err instanceof Error ? err.message : "Could not load time slots",
        "error"
      );
    }
  };

  const handleApprove = async (a: Appointment) => {
    try {
      const res = await apiPost<{
        message: string;
        sms_sent?: boolean;
        appointment: Appointment;
      }>(`/appointments/${a.id}/approve`, {});
      const appt = res.appointment;
      const wait =
        appt.estimated_wait_minutes != null && appt.estimated_wait_minutes > 0
          ? ` · Est. wait ~${appt.estimated_wait_minutes} min`
          : " · Next in line";
      const smsNote = res.sms_sent ? " · SMS sent" : "";
      showToast(
        `Approved ${a.patient?.full_name} — Queue #${appt.queue_position ?? 1}${wait}${smsNote}`
      );
      load();
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Failed to approve",
        "error"
      );
    }
  };

  const handleReject = async (a: Appointment) => {
    const ok = await confirm({
      title: "Reject Appointment",
      message: `Reject appointment request from ${a.patient?.full_name}? An SMS will be sent to the patient.`,
      confirmLabel: "Reject",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await apiPost<{ message: string; sms_sent?: boolean }>(
        `/appointments/${a.id}/reject`,
        {}
      );
      const smsNote = res.sms_sent ? " · SMS sent" : "";
      showToast(`Rejected ${a.patient?.full_name}${smsNote}`, "error");
      load();
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Failed to reject",
        "error"
      );
    }
  };

  const handleCancel = async (a: Appointment) => {
    const ok = await confirm({
      title: "Cancel Appointment",
      message: `Cancel appointment for ${a.patient?.full_name}? An SMS will be sent to the patient.`,
      confirmLabel: "Cancel Appointment",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await apiDelete<{ message: string; sms_sent?: boolean }>(
        `/appointments/${a.id}`
      );
      const smsNote = res.sms_sent ? " · SMS sent" : "";
      showToast(`Cancelled ${a.patient?.full_name}${smsNote}`);
      load();
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Failed to cancel",
        "error"
      );
    }
  };

  const handleComplete = async (a: Appointment) => {
    const ok = await confirm({
      title: "Mark as Completed",
      message: `Mark appointment for ${a.patient?.full_name} as done? Treatment finished.`,
      confirmLabel: "Done",
    });
    if (!ok) return;
    try {
      await apiPost(`/appointments/${a.id}/complete`, {});
      showToast(`Completed — ${a.patient?.full_name}`);
      load();
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Failed to complete",
        "error"
      );
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      patient_id: "",
      doctor_id: "",
      service_id: "",
      appointment_date: "",
      time_slot: "",
      status: "confirmed",
      notes: "",
    });
    setAvailableSlots([]);
    setModalOpen(true);
  };

  const openEdit = (a: Appointment) => {
    setEditing(a);
    setForm({
      patient_id: String(a.patient_id),
      doctor_id: String(a.doctor_id),
      service_id: String(a.service_id),
      appointment_date: a.appointment_date.split("T")[0] ?? a.appointment_date,
      time_slot: a.time_slot,
      status: a.status,
      notes: a.notes ?? "",
    });
    loadSlots(String(a.doctor_id), a.appointment_date.split("T")[0] ?? a.appointment_date);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await apiPut(`/appointments/${editing.id}`, form);
        showToast("Appointment updated");
      } else {
        await apiPost("/appointments", form);
        showToast("Appointment created");
      }
      setModalOpen(false);
      load();
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Failed to save",
        "error"
      );
    }
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending Requests" },
    { key: "confirmed", label: "Approved" },
    { key: "completed", label: "Completed" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Appointment</h1>
          {filter === "all" && pendingCount > 0 && (
            <p className="text-sm text-amber-600 mt-1 font-medium">
              {pendingCount} pending request{pendingCount > 1 ? "s" : ""} awaiting approval
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search appointments..."
            className="form-input w-64"
          />
          <button className="btn btn-primary" onClick={openCreate}>
            Add Appointment
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === tab.key
                ? "bg-blue-600 text-white shadow-md"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
            {tab.key === "pending" && pendingCount > 0 && filter !== "pending" && (
              <span className="ml-1.5 bg-amber-400 text-amber-900 text-xs px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          No appointments found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg">
          <table className="data-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Service</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Queue / Wait</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a, i) => (
                <tr
                  key={a.id}
                  className={a.status === "pending" ? "bg-amber-50/60" : undefined}
                >
                  <td>{i + 1}</td>
                  <td className="font-medium">{a.patient?.full_name}</td>
                  <td>{a.doctor?.full_name}</td>
                  <td>{a.service?.name}</td>
                  <td>{formatDate(a.appointment_date)}</td>
                  <td>{formatTime(a.time_slot)}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td className="text-sm whitespace-nowrap">
                    {a.status === "confirmed" && a.queue_position != null ? (
                      <span className="text-blue-700 font-medium">
                        #{a.queue_position}
                        {a.estimated_wait_minutes != null && a.estimated_wait_minutes > 0
                          ? ` · ~${a.estimated_wait_minutes} min`
                          : " · next"}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-2 whitespace-nowrap">
                      {a.status === "pending" && (
                        <>
                          <button
                            className="btn btn-success text-xs py-1.5 px-3 gap-1"
                            onClick={() => handleApprove(a)}
                          >
                            <Check size={13} />
                            Approve
                          </button>
                          <button
                            className="btn btn-danger text-xs py-1.5 px-3 gap-1"
                            onClick={() => handleReject(a)}
                          >
                            <X size={13} />
                            Reject
                          </button>
                        </>
                      )}
                      {a.status === "confirmed" && (
                        <button
                          className="btn btn-success text-xs py-1.5 px-3 gap-1"
                          onClick={() => handleComplete(a)}
                        >
                          <CheckCircle2 size={13} />
                          Done
                        </button>
                      )}
                      <button
                        className="btn btn-ghost text-xs py-1.5 px-3"
                        onClick={() => openEdit(a)}
                      >
                        Edit
                      </button>
                      {a.status !== "cancelled" &&
                        a.status !== "rejected" &&
                        a.status !== "completed" && (
                          <button
                            className="btn btn-danger text-xs py-1.5 px-3"
                            onClick={() => handleCancel(a)}
                          >
                            Cancel
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Appointment" : "Add Appointment"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Patient</label>
            <select className="form-input" value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} required>
              <option value="">Select patient...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Doctor</label>
            <select
              className="form-input"
              value={form.doctor_id}
              onChange={(e) => {
                setForm({ ...form, doctor_id: e.target.value, time_slot: "" });
                loadSlots(e.target.value, form.appointment_date);
              }}
              required
            >
              <option value="">Select doctor...</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Service</label>
            <select className="form-input" value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })} required>
              <option value="">Select service...</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-input"
              value={form.appointment_date}
              min={editing ? undefined : localDateString()}
              onChange={(e) => {
                setForm({ ...form, appointment_date: e.target.value, time_slot: "" });
                loadSlots(form.doctor_id, e.target.value);
              }}
              required
            />
          </div>
          <div>
            <label className="form-label">Available Time Slots</label>
            {availableSlots.length === 0 ? (
              <p className="text-sm text-slate-400">Select doctor and date to see available slots</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className={`slot-btn ${form.time_slot === slot ? "selected" : ""}`}
                    onClick={() => setForm({ ...form, time_slot: slot })}
                  >
                    {formatTime(slot)}
                  </button>
                ))}
              </div>
            )}
          </div>
          {editing && (
            <div>
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="confirmed">Approved</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}
          <div>
            <label className="form-label">Notes</label>
            <textarea className="form-input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary w-full justify-center" disabled={!form.time_slot}>
            {editing ? "Update Appointment" : "Book Appointment"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
