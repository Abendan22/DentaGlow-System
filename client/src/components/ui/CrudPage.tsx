"use client";

import { useState } from "react";
import { Modal } from "./Modal";

interface Field {
  name: string;
  label: string;
  type?: "text" | "email" | "number" | "date" | "password" | "textarea" | "select" | "checkbox";
  required?: boolean;
  options?: { value: string | number; label: string }[];
  placeholder?: string;
}

interface CrudPageProps<T extends { id: number }> {
  title: string;
  searchPlaceholder: string;
  addLabel: string;
  fields: Field[];
  items: T[];
  loading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  onSave: (data: Record<string, unknown>, editing: T | null) => Promise<void>;
  onDelete: (item: T) => Promise<void>;
  columns: {
    header: string;
    render: (item: T) => React.ReactNode;
  }[];
  getInitialValues?: (item: T) => Record<string, unknown>;
}

export function CrudPage<T extends { id: number }>({
  title,
  searchPlaceholder,
  addLabel,
  fields,
  items,
  loading,
  search,
  onSearchChange,
  onSave,
  onDelete,
  columns,
  getInitialValues,
}: CrudPageProps<T>) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    const initial: Record<string, unknown> = {};
    fields.forEach((f) => {
      if (f.type === "checkbox") initial[f.name] = true;
      else initial[f.name] = "";
    });
    setForm(initial);
    setModalOpen(true);
  };

  const openEdit = (item: T) => {
    setEditing(item);
    setForm(getInitialValues ? getInitialValues(item) : { ...item });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form, editing);
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="form-input w-64"
          />
          <button className="btn btn-primary" onClick={openCreate}>
            {addLabel}
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
                {columns.map((col) => (
                  <th key={col.header}>{col.header}</th>
                ))}
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 2}
                    className="text-center py-8 text-slate-400"
                  >
                    No records found.
                  </td>
                </tr>
              ) : (
                items.map((item, i) => (
                  <tr key={item.id}>
                    <td>{i + 1}</td>
                    {columns.map((col) => (
                      <td key={col.header}>{col.render(item)}</td>
                    ))}
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-success text-xs py-1.5 px-3"
                          onClick={() => openEdit(item)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger text-xs py-1.5 px-3"
                          onClick={() => onDelete(item)}
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
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${title}` : `Add ${title}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.name}>
              <label className="form-label">
                {field.label}
                {field.required && <span className="text-red-500"> *</span>}
              </label>
              {field.type === "select" ? (
                <select
                  className="form-input"
                  value={String(form[field.name] ?? "")}
                  onChange={(e) =>
                    setForm({ ...form, [field.name]: e.target.value })
                  }
                  required={field.required}
                >
                  <option value="">Select...</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  className="form-input"
                  rows={3}
                  value={String(form[field.name] ?? "")}
                  onChange={(e) =>
                    setForm({ ...form, [field.name]: e.target.value })
                  }
                  required={field.required}
                />
              ) : field.type === "checkbox" ? (
                <input
                  type="checkbox"
                  checked={Boolean(form[field.name])}
                  onChange={(e) =>
                    setForm({ ...form, [field.name]: e.target.checked })
                  }
                  className="w-4 h-4"
                />
              ) : (
                <input
                  type={field.type || "text"}
                  className="form-input"
                  value={String(form[field.name] ?? "")}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [field.name]:
                        field.type === "number"
                          ? Number(e.target.value)
                          : e.target.value,
                    })
                  }
                  placeholder={field.placeholder}
                  required={field.required}
                />
              )}
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
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
