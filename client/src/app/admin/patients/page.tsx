"use client";

import { ImageUpload } from "@/components/ui/ImageUpload";
import { Modal } from "@/components/ui/Modal";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { PatientRecordPrint } from "@/components/ui/PatientRecordPrint";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiDelete, apiFormData, apiGet, ApiError } from "@/lib/api";
import { useConfirm } from "@/lib/confirm";
import { useToast } from "@/lib/toast";
import type { Gender, Patient } from "@/lib/types";
import { TAPAZ_BARANGAYS } from "@/lib/tapaz-barangays";
import { formatDate, formatTime, getInitials } from "@/lib/utils";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

const emptyForm = {
  first_name: "",
  last_name: "",
  gender_id: "",
  birth_date: "",
  phone: "",
  email: "",
  barangay: "",
  address: "",
  password: "",
  password_confirmation: "",
};

function PatientPhoto({
  patient,
  size = 36,
}: {
  patient: Patient;
  size?: number;
}) {
  if (patient.photo_url) {
    return (
      <div
        className="rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0"
        style={{ width: size, height: size }}
      >
        <Image
          src={patient.photo_url}
          alt={patient.full_name}
          width={size}
          height={size}
          className="object-cover w-full h-full"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      className="avatar shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.3 }}
    >
      {getInitials(patient.full_name)}
    </div>
  );
}

export default function PatientsPage() {
  const [items, setItems] = useState<Patient[]>([]);
  const [genders, setGenders] = useState<Gender[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [barangayFilter, setBarangayFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [viewing, setViewing] = useState<Patient | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createPortalAccount, setCreatePortalAccount] = useState(false);
  const { showToast } = useToast();
  const confirm = useConfirm();

  const openView = async (p: Patient) => {
    setViewing(p);
    setViewLoading(true);
    try {
      const detail = await apiGet<Patient>(`/patients/${p.id}`);
      setViewing(detail);
    } catch {
      showToast("Failed to load patient details", "error");
    } finally {
      setViewLoading(false);
    }
  };

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (barangayFilter) params.set("barangay", barangayFilter);
    const q = params.toString() ? `?${params}` : "";
    apiGet<Patient[]>(`/patients${q}`)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [search, barangayFilter]);

  useEffect(() => {
    apiGet<Gender[]>("/genders").then(setGenders);
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setCreatePortalAccount(false);
    setPhotoFile(null);
    setRemovePhoto(false);
    setModalOpen(true);
  };

  const openEdit = (p: Patient) => {
    setEditing(p);
    setCreatePortalAccount(false);
    setForm({
      first_name: p.first_name,
      last_name: p.last_name,
      gender_id: String(p.gender_id),
      birth_date: p.birth_date?.split("T")[0] ?? p.birth_date,
      phone: p.phone ?? "",
      email: p.email ?? "",
      barangay: p.barangay ?? "",
      address: p.address ?? "",
      password: "",
      password_confirmation: "",
    });
    setPhotoFile(null);
    setRemovePhoto(false);
    setModalOpen(true);
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append("first_name", form.first_name);
    fd.append("last_name", form.last_name);
    fd.append("gender_id", form.gender_id);
    fd.append("birth_date", form.birth_date);
    if (form.phone) fd.append("phone", form.phone);
    if (form.email) fd.append("email", form.email);
    fd.append("barangay", form.barangay);
    if (form.address) fd.append("address", form.address);
    if (!editing && createPortalAccount) {
      fd.append("password", form.password);
      fd.append("password_confirmation", form.password_confirmation);
    }
    if (photoFile) fd.append("photo", photoFile);
    if (removePhoto) fd.append("remove_photo", "1");
    return fd;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing && createPortalAccount) {
      if (!form.email) {
        showToast("Email is required to create a portal account", "error");
        return;
      }
      if (form.password !== form.password_confirmation) {
        showToast("Passwords do not match", "error");
        return;
      }
      if (form.password.length < 8) {
        showToast("Password must be at least 8 characters", "error");
        return;
      }
    }
    setSaving(true);
    try {
      const fd = buildFormData();
      if (editing) {
        await apiFormData(`/patients/${editing.id}`, fd, "PUT");
        showToast("Patient updated");
      } else {
        await apiFormData("/patients", fd);
        showToast("Patient created");
      }
      setModalOpen(false);
      load();
    } catch {
      showToast("Failed to save patient", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Patient) => {
    const ok = await confirm({
      title: "Delete Patient",
      message: `Delete patient "${item.full_name}"?`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await apiDelete(`/patients/${item.id}`);
      showToast("Patient deleted");
      load();
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Failed to delete patient",
        "error"
      );
    }
  };

 return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div className="flex-1 space-y-3">
          <h1 className="text-2xl font-bold text-slate-800">Patient Record</h1>
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full sm:max-w-xs">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient records..."
                className="form-input w-full"
              />
            </div>
            <div className="w-full sm:max-w-[200px]">
              <select
                className="form-input w-full"
                value={barangayFilter}
                onChange={(e) => setBarangayFilter(e.target.value)}
              >
                <option value="">All Barangays</option>
                {TAPAZ_BARANGAYS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0 mt-2 sm:mt-0">
          <PatientRecordPrint search={search} barangay={barangayFilter} disabled={loading} />
          <button className="btn btn-primary" onClick={openCreate}>
            Add Patient
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg">
          <table className="data-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Photo</th>
                <th>Full Name</th>
                <th>Barangay</th>
                <th>Address</th>
                <th>Gender</th>
                <th>Birth Date</th>
                <th>Age</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400">
                    No records found.
                  </td>
                </tr>
              ) : (
                items.map((p, i) => (
                  <tr key={p.id}>
                    <td>{i + 1}</td>
                    <td>
                      <PatientPhoto patient={p} />
                    </td>
                    <td className="font-medium">{p.full_name}</td>
                    <td>
                      <span className="badge badge-confirmed">{p.barangay ?? "—"}</span>
                    </td>
                    <td className="max-w-[160px] truncate text-slate-600" title={p.address ?? ""}>
                      {p.address || "—"}
                    </td>
                    <td>{p.gender?.name}</td>
                    <td>{formatDate(p.birth_date)}</td>
                    <td>{p.age}</td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn btn-info text-xs py-1.5 px-3"
                          onClick={() => openView(p)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="btn btn-success text-xs py-1.5 px-3"
                          onClick={() => openEdit(p)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger text-xs py-1.5 px-3"
                          onClick={() => handleDelete(p)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title="Patient Details"
      >
        {viewing && (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-3 pb-4 border-b border-slate-100">
              <PatientPhoto patient={viewing} size={96} />
              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-800">
                  {viewing.full_name}
                </h3>
                {viewing.user_id ? (
                  <span className="inline-block mt-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
                    Portal account active
                  </span>
                ) : (
                  <span className="inline-block mt-1 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-0.5">
                    No portal account
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-0 text-sm">
              {[
                { label: "First Name", value: viewing.first_name },
                { label: "Last Name", value: viewing.last_name },
                { label: "Gender", value: viewing.gender?.name ?? "—" },
                { label: "Birth Date", value: formatDate(viewing.birth_date) },
                { label: "Age", value: viewing.age != null ? `${viewing.age} years` : "—" },
                { label: "Phone", value: viewing.phone || "—" },
                { label: "Email", value: viewing.email || "—" },
                { label: "Barangay", value: viewing.barangay || "—" },
                { label: "Address", value: viewing.address || "—" },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex justify-between gap-4 py-2.5 border-b border-slate-100"
                >
                  <span className="text-slate-500 shrink-0">{row.label}</span>
                  <span className="font-medium text-slate-800 text-right">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-1">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">
                Appointment History / Doctors
              </h4>
              {viewLoading ? (
                <p className="text-sm text-slate-400 text-center py-4">Loading history...</p>
              ) : !viewing.appointments?.length ? (
                <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-lg">
                  No appointments yet.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {viewing.appointments.map((a) => (
                    <div
                      key={a.id}
                      className="p-3 rounded-lg border border-slate-100 bg-slate-50/80"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {a.doctor?.full_name ?? "Unknown doctor"}
                          </p>
                        </div>
                        <StatusBadge status={a.status} />
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                        <span>{formatDate(a.appointment_date)}</span>
                        <span>{formatTime(a.time_slot)}</span>
                        {a.service?.name && <span>{a.service.name}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                className="btn btn-success flex-1 justify-center"
                onClick={() => {
                  const patient = viewing;
                  setViewing(null);
                  openEdit(patient);
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setViewing(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Patient" : "Add Patient"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <ImageUpload
            value={photoFile}
            previewUrl={editing?.photo_url ?? null}
            name={`${form.first_name} ${form.last_name}`.trim()}
            onChange={(file) => {
              setPhotoFile(file);
              if (file) setRemovePhoto(false);
            }}
            onRemoveExisting={() => setRemovePhoto(true)}
            existingRemoved={removePhoto}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">First Name *</label>
              <input
                className="form-input"
                value={form.first_name}
                onChange={(e) =>
                  setForm({ ...form, first_name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="form-label">Last Name *</label>
              <input
                className="form-input"
                value={form.last_name}
                onChange={(e) =>
                  setForm({ ...form, last_name: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label">Gender *</label>
            <select
              className="form-input"
              value={form.gender_id}
              onChange={(e) =>
                setForm({ ...form, gender_id: e.target.value })
              }
              required
            >
              <option value="">Select...</option>
              {genders.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Birth Date *</label>
            <input
              type="date"
              className="form-input"
              value={form.birth_date}
              onChange={(e) =>
                setForm({ ...form, birth_date: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="form-label">Phone</label>
            <input
              className="form-input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div>
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required={!editing && createPortalAccount}
            />
          </div>

          {!editing && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createPortalAccount}
                  onChange={(e) => {
                    setCreatePortalAccount(e.target.checked);
                    if (!e.target.checked) {
                      setForm((f) => ({ ...f, password: "", password_confirmation: "" }));
                    }
                  }}
                  className="rounded border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700">
                  Create portal account (password for online booking)
                </span>
              </label>

              {createPortalAccount && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Password *</label>
                    <PasswordInput
                      value={form.password}
                      onChange={(v) => setForm({ ...form, password: v })}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Re-enter Password *</label>
                    <PasswordInput
                      value={form.password_confirmation}
                      onChange={(v) => setForm({ ...form, password_confirmation: v })}
                      required
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {editing?.user_id && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              This patient has a portal account and can log in to book appointments online.
            </p>
          )}

          <div>
            <label className="form-label">Barangay (Tapaz, Capiz) *</label>
            <select
              className="form-input"
              value={form.barangay}
              onChange={(e) =>
                setForm({ ...form, barangay: e.target.value })
              }
              required
            >
              <option value="">Select barangay...</option>
              {TAPAZ_BARANGAYS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Street / Purok / Sitio</label>
            <textarea
              className="form-input"
              rows={2}
              value={form.address}
              onChange={(e) =>
                setForm({ ...form, address: e.target.value })
              }
              placeholder="e.g. Purok 3, Sitio Malipayon"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={saving}
            >
              {saving ? "Saving..." : editing ? "Update" : "Save"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
