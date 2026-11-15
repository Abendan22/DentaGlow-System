"use client";

import { Modal } from "@/components/ui/Modal";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { PaymentSlip } from "@/components/ui/PaymentSlip";
import { apiFormData, apiGet, apiPost, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { BillableItem, Patient, PaymentOrder } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CheckCircle2, Clock, Plus, Printer, Receipt, RefreshCw, Search, Trash2, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface LineItem {
  billable_item_id: number;
  quantity: number;
}

type StatusFilter = "all" | "pending" | "paid" | "cancelled";

export default function BillingPage() {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [billableItems, setBillableItems] = useState<BillableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [printOrder, setPrintOrder] = useState<PaymentOrder | null>(null);
  const [viewOrder, setViewOrder] = useState<PaymentOrder | null>(null);
  const [patientId, setPatientId] = useState("");
  const [queueNumber, setQueueNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([{ billable_item_id: 0, quantity: 1 }]);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ pending: 0, paid: 0 });
  const { showToast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    if (search) params.set("search", search);
    const q = params.toString() ? `?${params}` : "";

    Promise.all([
      apiGet<PaymentOrder[]>(`/payment-orders${q}`),
      apiGet<PaymentOrder[]>("/payment-orders"),
    ])
      .then(([filtered, all]) => {
        setOrders(filtered);
        setStats({
          pending: all.filter((o) => o.status === "pending").length,
          paid: all.filter((o) => o.status === "paid").length,
        });
      })
      .finally(() => setLoading(false));
  }, [filter, search]);

  useEffect(() => {
    apiGet<Patient[]>("/patients").then(setPatients);
    apiGet<BillableItem[]>("/billable-items?active_only=1").then(setBillableItems);
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  const pendingCount = stats.pending;
  const paidCount = stats.paid;

  const addLine = () => setLines([...lines, { billable_item_id: 0, quantity: 1 }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof LineItem, value: number) => {
    const next = [...lines];
    next[i] = { ...next[i], [field]: value };
    setLines(next);
  };

  const previewTotal = lines.reduce((sum, line) => {
    const item = billableItems.find((b) => b.id === line.billable_item_id);
    return sum + (item ? Number(item.price) * line.quantity : 0);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = lines.filter((l) => l.billable_item_id > 0);
    if (!patientId || validLines.length === 0) {
      showToast("Select patient and at least one item", "error");
      return;
    }
    setSaving(true);
    try {
      const order = await apiPost<PaymentOrder>("/payment-orders", {
        patient_id: Number(patientId),
        queue_number: queueNumber ? Number(queueNumber) : undefined,
        notes,
        items: validLines,
      });
      showToast("Slip created — print and give to patient");
      setModalOpen(false);
      setPatientId("");
      setQueueNumber("");
      setNotes("");
      setLines([{ billable_item_id: 0, quantity: 1 }]);
      setPrintOrder(order);
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to create bill", "error");
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (order: PaymentOrder) => {
    if (order.status === "paid") {
      return (
        <span className="badge badge-completed inline-flex items-center gap-1">
          <CheckCircle2 size={14} /> Paid
        </span>
      );
    }
    if (order.status === "cancelled") {
      return (
        <span className="badge badge-cancelled inline-flex items-center gap-1">
          <XCircle size={14} /> Cancelled
        </span>
      );
    }
    return (
      <span className="badge badge-pending inline-flex items-center gap-1">
        <Clock size={14} /> Awaiting Payment
      </span>
    );
  };

  const rowClass = (status: PaymentOrder["status"]) => {
    if (status === "paid") return "bg-green-50/60";
    if (status === "pending") return "bg-amber-50/40";
    return "";
  };

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Billing</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            After the queue draw, create a payment slip here. Status updates to <strong>Paid</strong> automatically
            when the Treasurer records payment downstairs.
          </p>
        </div>
        <button className="btn btn-primary gap-2 shrink-0" onClick={() => setModalOpen(true)}>
          <Plus size={18} /> Create Payment Slip
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm">
          <Clock size={16} className="text-amber-600" />
          <span className="text-amber-800"><strong>{pendingCount}</strong> awaiting payment</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm">
          <CheckCircle2 size={16} className="text-green-600" />
          <span className="text-green-800"><strong>{paidCount}</strong> paid</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex flex-wrap gap-2">
          {(["all", "pending", "paid", "cancelled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
                filter === s ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s === "all" ? "All" : s === "pending" ? "Awaiting Payment" : s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="form-input pl-9 w-56"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient or ref..."
            />
          </div>
          <button className="btn btn-ghost p-2" onClick={load} title="Refresh">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading && orders.length === 0 ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg">
          <table className="data-table">
            <thead>
              <tr>
                <th>Queue #</th>
                <th>Ref No.</th>
                <th>Patient</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment Status</th>
                <th>OR Number</th>
                <th>Paid Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-slate-400">No billing records found.</td></tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className={rowClass(o.status)}>
                    <td className="font-bold text-lg">{o.queue_number ? `#${o.queue_number}` : "—"}</td>
                    <td className="font-mono text-sm font-medium">{o.reference_no}</td>
                    <td className="font-medium">{o.patient?.full_name}</td>
                    <td className="text-sm text-slate-600 max-w-xs">
                      {o.items?.map((i) => `${i.item_name} x${i.quantity}`).join(", ")}
                    </td>
                    <td className="font-semibold text-blue-600">{formatCurrency(o.total_amount)}</td>
                    <td>{statusBadge(o)}</td>
                    <td className="font-mono text-sm">
                      {o.payment?.or_number ?? "—"}
                    </td>
                    <td className="text-sm text-slate-600">
                      {o.payment?.paid_at ? formatDate(o.payment.paid_at) : "—"}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        {o.status === "pending" && (
                          <button
                            className="btn btn-ghost text-xs py-1.5 px-2 gap-1"
                            onClick={() => setPrintOrder(o)}
                          >
                            <Printer size={14} /> Print
                          </button>
                        )}
                        {o.status === "paid" && (
                          <button
                            type="button"
                            className="btn btn-info text-xs py-1.5 px-2 gap-1"
                            onClick={() => setViewOrder(o)}
                          >
                            <CheckCircle2 size={14} /> View
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Payment Slip">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            Enter the queue number from the draw. After saving, print the slip and give it to the patient to pay at the Treasurer downstairs.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="form-label">Queue Number *</label>
              <input
                type="number"
                min="1"
                max="9999"
                className="form-input text-lg font-bold"
                value={queueNumber}
                onChange={(e) => setQueueNumber(e.target.value)}
                placeholder="e.g. 15"
                required
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="form-label">Patient *</label>
              <select className="form-input" value={patientId} onChange={(e) => setPatientId(e.target.value)} required>
                <option value="">Select patient...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name} — {p.barangay}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Billable Items *</label>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select className="form-input flex-1" value={line.billable_item_id} onChange={(e) => updateLine(i, "billable_item_id", Number(e.target.value))}>
                    <option value={0}>Select item...</option>
                    {billableItems.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} — {formatCurrency(b.price)}</option>
                    ))}
                  </select>
                  <input type="number" min="1" className="form-input w-20" value={line.quantity} onChange={(e) => updateLine(i, "quantity", Number(e.target.value))} />
                  {lines.length > 1 && (
                    <button type="button" onClick={() => removeLine(i)} className="text-red-500 p-2"><Trash2 size={16} /></button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addLine} className="text-sm text-blue-600 mt-2 hover:underline">+ Add item</button>
          </div>

          <div className="p-4 bg-blue-50 rounded-xl flex items-center justify-between">
            <span className="text-slate-600 flex items-center gap-2"><Receipt size={18} /> Total Amount</span>
            <span className="text-xl font-bold text-blue-600">{formatCurrency(previewTotal)}</span>
          </div>

          <div>
            <label className="form-label">Notes</label>
            <textarea className="form-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." />
          </div>

          <button type="submit" className="btn btn-primary w-full justify-center" disabled={saving}>
            {saving ? "Creating..." : "Create & Print Slip"}
          </button>
        </form>
      </Modal>

      <Modal open={!!printOrder} onClose={() => setPrintOrder(null)} title="Payment Slip — Give to Patient">
        {printOrder && <PaymentSlip order={printOrder} />}
      </Modal>

      <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title="Payment Confirmed">
        {viewOrder && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center">
              <CheckCircle2 size={40} className="text-green-600 mx-auto mb-2" />
              <p className="font-bold text-green-800 text-lg">Paid</p>
              <p className="text-sm text-green-700 mt-1">Patient has paid at the Treasurer</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Patient</span>
                <span className="font-medium">{viewOrder.patient?.full_name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Reference</span>
                <span className="font-mono">{viewOrder.reference_no}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">OR Number</span>
                <span className="font-mono font-bold">{viewOrder.payment?.or_number}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Amount Paid</span>
                <span className="font-bold text-green-600">{formatCurrency(viewOrder.payment?.amount_paid ?? viewOrder.total_amount)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Paid Date</span>
                <span>{viewOrder.payment?.paid_at ? formatDate(viewOrder.payment.paid_at) : "—"}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
