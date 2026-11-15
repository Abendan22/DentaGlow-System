"use client";

import { Modal } from "@/components/ui/Modal";
import { TreasurerReportPrint } from "@/components/ui/TreasurerReportPrint";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { PaymentOrder, TreasurerStats } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Banknote, Check, CheckCircle2, Eye, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function TreasurerPage() {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [stats, setStats] = useState<TreasurerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"pending" | "paid">("pending");
  const [payModal, setPayModal] = useState<PaymentOrder | null>(null);
  const [viewOrder, setViewOrder] = useState<PaymentOrder | null>(null);
  const [payNotes, setPayNotes] = useState("");
  const [paying, setPaying] = useState(false);
  const { showToast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ status: filter });
    if (search) params.set("search", search);
    Promise.all([
      apiGet<PaymentOrder[]>(`/treasurer?${params}`),
      apiGet<TreasurerStats>("/treasurer/stats"),
    ])
      .then(([data, s]) => {
        setOrders(data);
        setStats(s);
      })
      .finally(() => setLoading(false));
  }, [search, filter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModal) return;
    setPaying(true);
    try {
      const res = await apiPost<{ payment: { or_number: string } }>(
        `/treasurer/${payModal.id}/pay`,
        {
          payment_method: "cash",
          notes: payNotes,
        }
      );
      showToast(`Payment recorded — OR# ${res.payment.or_number}`);
      setPayModal(null);
      setPayNotes("");
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Payment failed", "error");
    } finally {
      setPaying(false);
    }
  };

  const statCards = [
    { label: "Pending Payments", value: stats?.pending_count ?? 0, sub: formatCurrency(stats?.pending_amount ?? 0), color: "#f59e0b" },
    { label: "Collections Today", value: formatCurrency(stats?.collections_today ?? 0), sub: `${stats?.paid_today_count ?? 0} paid`, color: "#10b981" },
    { label: "Collections This Month", value: formatCurrency(stats?.collections_month ?? 0), sub: "Municipal Dental Clinic", color: "#2563eb" },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Treasurer</h1>
          <p className="text-slate-500 text-sm mt-1">
            Search by queue #, reference no., or patient name — from the slip brought from the clinic upstairs
          </p>
        </div>
        <TreasurerReportPrint disabled={loading} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {statCards.map(({ label, value, sub, color }) => (
          <div key={label} className="stat-card" style={{ borderTopColor: color }}>
            <Banknote size={22} className="text-slate-400 mb-3" />
            <div className="stat-value text-xl">{value}</div>
            <div className="stat-label">{label}</div>
            <div className="text-xs text-slate-400 mt-1">{sub}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex gap-2">
            {(["pending", "paid"] as const).map((s) => (
              <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${filter === s ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                {s === "pending" ? "Awaiting Payment" : "Paid"}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="form-input pl-9 w-64" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Queue #, ref no., or patient..." />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            {filter === "pending" ? "No pending payments." : "No paid records."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Queue #</th>
                  <th>Ref No.</th>
                  <th>Patient</th>
                  <th>Barangay</th>
                  <th>Items</th>
                  <th>Total</th>
                  {filter === "paid" && <th>OR Number</th>}
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className={filter === "pending" ? "bg-amber-50/40" : undefined}>
                    <td className="font-bold text-lg">{o.queue_number ? `#${o.queue_number}` : "—"}</td>
                    <td className="font-mono text-sm font-medium">{o.reference_no}</td>
                    <td className="font-medium">{o.patient?.full_name}</td>
                    <td>{o.patient?.barangay ?? "—"}</td>
                    <td className="text-sm max-w-xs">
                      {o.items?.map((i) => `${i.item_name} x${i.quantity}`).join(", ")}
                    </td>
                    <td className="font-bold text-blue-600">{formatCurrency(o.total_amount)}</td>
                    {filter === "paid" && <td className="font-mono">{o.payment?.or_number}</td>}
                    <td>
                      {filter === "pending" ? (
                        <button
                          className="btn btn-primary text-xs py-1.5 px-3 gap-1"
                          onClick={() => {
                            setPayModal(o);
                            setPayNotes("");
                          }}
                        >
                          <Check size={14} /> Record Payment
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-info text-xs py-1.5 px-3 gap-1"
                          onClick={() => setViewOrder(o)}
                        >
                          <Eye size={14} /> View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="Record Payment">
        {payModal && (
          <form onSubmit={handlePay} className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-sm">
              {payModal.queue_number && (
                <div className="flex justify-between items-center pb-2 mb-2 border-b">
                  <span className="text-slate-500">Queue #</span>
                  <span className="font-bold text-2xl">#{payModal.queue_number}</span>
                </div>
              )}
              <div className="flex justify-between"><span className="text-slate-500">Patient</span><span className="font-medium">{payModal.patient?.full_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Reference</span><span className="font-mono">{payModal.reference_no}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Amount Due</span><span className="font-bold text-blue-600 text-lg">{formatCurrency(payModal.total_amount)}</span></div>
              <div className="border-t pt-2 mt-2">
                {payModal.items?.map((i) => (
                  <div key={i.id} className="flex justify-between text-slate-600">
                    <span>{i.item_name} x{i.quantity}</span>
                    <span>{formatCurrency(i.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
              OR number will be generated automatically when you confirm payment.
            </div>
            <div>
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={2} value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary w-full justify-center gap-2" disabled={paying}>
              <Check size={18} />
              {paying ? "Recording..." : "Confirm Payment"}
            </button>
          </form>
        )}
      </Modal>

      <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title="Payment Details">
        {viewOrder && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center">
              <CheckCircle2 size={40} className="text-green-600 mx-auto mb-2" />
              <p className="font-bold text-green-800 text-lg">Paid</p>
              <p className="text-sm text-green-700 mt-1">Payment already recorded</p>
            </div>

            <div className="space-y-0 text-sm">
              {[
                {
                  label: "Queue #",
                  value: viewOrder.queue_number ? `#${viewOrder.queue_number}` : "—",
                },
                { label: "Patient", value: viewOrder.patient?.full_name ?? "—" },
                { label: "Barangay", value: viewOrder.patient?.barangay ?? "—" },
                { label: "Reference", value: viewOrder.reference_no },
                { label: "OR Number", value: viewOrder.payment?.or_number ?? "—" },
                {
                  label: "Amount Paid",
                  value: formatCurrency(
                    viewOrder.payment?.amount_paid ?? viewOrder.total_amount
                  ),
                },
                {
                  label: "Date & Time Paid",
                  value: viewOrder.payment?.paid_at
                    ? formatDateTime(viewOrder.payment.paid_at)
                    : "—",
                },
                {
                  label: "Received By",
                  value: viewOrder.payment?.receiver?.name ?? "—",
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex justify-between gap-4 py-2.5 border-b border-slate-100"
                >
                  <span className="text-slate-500 shrink-0">{row.label}</span>
                  <span className="font-medium text-slate-800 text-right">{row.value}</span>
                </div>
              ))}
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Items</p>
              <div className="space-y-1 text-sm bg-slate-50 rounded-lg p-3">
                {viewOrder.items?.map((i) => (
                  <div key={i.id} className="flex justify-between text-slate-600">
                    <span>
                      {i.item_name} x{i.quantity}
                    </span>
                    <span>{formatCurrency(i.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="btn btn-ghost w-full justify-center"
              onClick={() => setViewOrder(null)}
            >
              Close
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
