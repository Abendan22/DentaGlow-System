"use client";

import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { useConfirm } from "@/lib/confirm";
import { useToast } from "@/lib/toast";
import type { Service } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Clock, Pencil, PhilippinePeso, Plus, Search, Trash2, Wrench } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const emptyForm = {
  name: "",
  description: "",
  price: "",
  duration_minutes: "30",
  is_active: true,
};

export default function ServicesPage() {
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const confirm = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    const q = search ? `?search=${search}` : "";
    apiGet<Service[]>(`/services${q}`)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const resetForm = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const startEdit = (s: Service) => {
    setEditing(s);
    setForm({
      name: s.name,
      description: s.description ?? "",
      price: String(s.price),
      duration_minutes: String(s.duration_minutes),
      is_active: s.is_active,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        duration_minutes: Number(form.duration_minutes),
        is_active: form.is_active,
      };
      if (editing) {
        await apiPut(`/services/${editing.id}`, payload);
        showToast("Service updated");
      } else {
        await apiPost("/services", payload);
        showToast("Service created");
      }
      resetForm();
      load();
    } catch {
      showToast("Failed to save service", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Service) => {
    const ok = await confirm({
      title: "Delete Service",
      message: `Delete "${item.name}"?`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    await apiDelete(`/services/${item.id}`);
    showToast("Service deleted");
    if (editing?.id === item.id) resetForm();
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Services</h1>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left — Add / Edit form */}
        <div className="xl:col-span-2">
          <div className="card sticky top-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                {editing ? <Pencil size={18} /> : <Plus size={18} />}
              </div>
              <div>
                <h2 className="font-bold text-slate-800">
                  {editing ? "Edit Service" : "Add Service"}
                </h2>
                <p className="text-xs text-slate-500">
                  {editing ? "Update service details" : "Fill in to add a new service"}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Service Name</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Dental Cleaning"
                  required
                />
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of the service..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Price (PHP)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-input"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Duration (min)</label>
                  <input
                    type="number"
                    min="15"
                    max="240"
                    className="form-input"
                    value={form.duration_minutes}
                    onChange={(e) =>
                      setForm({ ...form, duration_minutes: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm({ ...form, is_active: e.target.checked })
                  }
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-slate-600">Active service</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="btn btn-primary flex-1 justify-center"
                  disabled={saving}
                >
                  {saving ? "Saving..." : editing ? "Update Service" : "Add Service"}
                </button>
                {editing && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={resetForm}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right — Services list */}
        <div className="xl:col-span-3">
          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Wrench size={20} className="text-blue-600" />
                <h2 className="font-bold text-slate-800">
                  All Services
                  <span className="ml-2 text-sm font-normal text-slate-400">
                    ({items.length})
                  </span>
                </h2>
              </div>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search services..."
                  className="form-input pl-9 w-full sm:w-64"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-16 text-slate-400">Loading...</div>
            ) : items.length === 0 ? (
              <div className="text-center py-16">
                <Wrench size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-400">No services found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((s) => (
                  <div
                    key={s.id}
                    className={`p-5 rounded-xl border-2 transition-all ${
                      editing?.id === s.id
                        ? "border-blue-500 bg-blue-50/50 shadow-md"
                        : "border-slate-100 bg-slate-50 hover:border-slate-200 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-800 truncate">
                            {s.name}
                          </h3>
                          <span
                            className={`badge shrink-0 ${
                              s.is_active ? "badge-completed" : "badge-cancelled"
                            }`}
                          >
                            {s.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        {s.description && (
                          <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                            {s.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1 text-blue-600 font-semibold">
                            <PhilippinePeso size={14} />
                            {formatCurrency(s.price)}
                          </span>
                          <span className="flex items-center gap-1 text-slate-500">
                            <Clock size={14} />
                            {s.duration_minutes} min
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-200/60">
                      <button
                        className="btn btn-success text-xs py-1.5 px-3 flex-1 justify-center"
                        onClick={() => startEdit(s)}
                      >
                        <Pencil size={13} />
                        Edit
                      </button>
                      <button
                        className="btn btn-danger text-xs py-1.5 px-3"
                        onClick={() => handleDelete(s)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
