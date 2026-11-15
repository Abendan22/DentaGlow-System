"use client";

import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { useConfirm } from "@/lib/confirm";
import { useToast } from "@/lib/toast";
import type { BillableItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Pencil, PhilippinePeso, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const emptyForm = { name: "", description: "", price: "", is_active: true };

export default function BillableItemsPage() {
  const [items, setItems] = useState<BillableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<BillableItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const confirm = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    const q = search ? `?search=${search}` : "";
    apiGet<BillableItem[]>(`/billable-items${q}`)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        is_active: form.is_active,
      };
      if (editing) {
        await apiPut(`/billable-items/${editing.id}`, payload);
        showToast("Item updated");
      } else {
        await apiPost("/billable-items", payload);
        showToast("Item created");
      }
      setEditing(null);
      setForm(emptyForm);
      load();
    } catch {
      showToast("Failed to save item", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Billable Items</h1>
      <p className="text-slate-500 text-sm mb-6">
        Items patients pay at the Treasurer — anesthesia, consultation fees, etc.
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2">
          <div className="card sticky top-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                {editing ? <Pencil size={18} /> : <Plus size={18} />}
              </div>
              <h2 className="font-bold text-slate-800">
                {editing ? "Edit Item" : "Add Billable Item"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Item Name *</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Anesthesia" required />
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Price (PHP) *</label>
                <input type="number" min="0" step="0.01" className="form-input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 accent-blue-600" />
                <span className="text-sm text-slate-600">Active</span>
              </label>
              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary flex-1 justify-center" disabled={saving}>
                  {saving ? "Saving..." : editing ? "Update" : "Add Item"}
                </button>
                {editing && (
                  <button type="button" className="btn btn-ghost" onClick={() => { setEditing(null); setForm(emptyForm); }}>Cancel</button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="xl:col-span-3 card">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="font-bold text-slate-800">All Items ({items.length})</h2>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="form-input pl-9 w-56" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..." />
            </div>
          </div>
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((item) => (
                <div key={item.id} className={`p-4 rounded-xl border-2 ${editing?.id === item.id ? "border-blue-500 bg-blue-50/50" : "border-slate-100 bg-slate-50"}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-slate-800">{item.name}</h3>
                    <span className={`badge ${item.is_active ? "badge-completed" : "badge-cancelled"}`}>{item.is_active ? "Active" : "Inactive"}</span>
                  </div>
                  {item.description && <p className="text-sm text-slate-500 mb-2">{item.description}</p>}
                  <p className="text-blue-600 font-bold flex items-center gap-1"><PhilippinePeso size={14} />{formatCurrency(item.price)}</p>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200/60">
                    <button className="btn btn-success text-xs py-1.5 px-3 flex-1 justify-center" onClick={() => { setEditing(item); setForm({ name: item.name, description: item.description ?? "", price: String(item.price), is_active: item.is_active }); }}>
                      <Pencil size={13} /> Edit
                    </button>
                    <button className="btn btn-danger text-xs py-1.5 px-3" onClick={async () => {
                      const ok = await confirm({ title: "Delete Item", message: `Delete "${item.name}"?`, confirmLabel: "Delete", danger: true });
                      if (!ok) return;
                      await apiDelete(`/billable-items/${item.id}`);
                      showToast("Item deleted");
                      load();
                    }}><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
