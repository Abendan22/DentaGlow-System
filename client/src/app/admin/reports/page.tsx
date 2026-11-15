"use client";

import { ReportPrint } from "@/components/ui/ReportPrint";
import { ApiError, apiGet } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import type { ReportData } from "@/lib/types";
import { formatCurrency, localDateString } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

type ReportType = "monthly" | "quarterly" | "custom";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function ReportsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<ReportType>("monthly");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
  const [from, setFrom] = useState(() => {
    const now = new Date();
    return localDateString(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [to, setTo] = useState(() => localDateString());

  const isTreasurer = user?.role === "treasurer";
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams({ type });
    if (type === "monthly") {
      params.set("year", String(year));
      params.set("month", String(month));
    } else if (type === "quarterly") {
      params.set("year", String(year));
      params.set("quarter", String(quarter));
    } else {
      params.set("from", from);
      params.set("to", to);
    }
    return params.toString();
  }, [type, year, month, quarter, from, to]);

  const load = useCallback(() => {
    setLoading(true);
    apiGet<ReportData>(`/reports?${buildQuery()}`)
      .then(setData)
      .catch((err) => {
        setData(null);
        showToast(
          err instanceof ApiError ? err.message : "Could not generate report",
          "error"
        );
      })
      .finally(() => setLoading(false));
  }, [buildQuery, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const statCards = [
    { label: "Patients Served", value: data?.patients_served ?? 0, color: "#2563eb" },
    { label: "New Patients", value: data?.new_patients ?? 0, color: "#8b5cf6" },
    { label: "Total Appointments", value: data?.total_appointments ?? 0, color: "#f59e0b" },
    { label: "Total Collections", value: formatCurrency(data?.total_collections ?? 0), color: "#10b981" },
  ];

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isTreasurer ? "Collections Report" : "MHO / DOH Reports"}
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Monthly and quarterly dental health reports for Municipal Health Office submission to DOH.
            Generate and print the official report when ready.
          </p>
        </div>
        {data && <ReportPrint data={data} />}
      </div>

      <div className="card mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {(["monthly", "quarterly", "custom"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
                type === t ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {type === "monthly" && (
            <>
              <div>
                <label className="form-label">Month</label>
                <select className="form-input w-40" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Year</label>
                <select className="form-input w-28" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </>
          )}

          {type === "quarterly" && (
            <>
              <div>
                <label className="form-label">Quarter</label>
                <select className="form-input w-40" value={quarter} onChange={(e) => setQuarter(Number(e.target.value))}>
                  <option value={1}>Q1 (Jan – Mar)</option>
                  <option value={2}>Q2 (Apr – Jun)</option>
                  <option value={3}>Q3 (Jul – Sep)</option>
                  <option value={4}>Q4 (Oct – Dec)</option>
                </select>
              </div>
              <div>
                <label className="form-label">Year</label>
                <select className="form-input w-28" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </>
          )}

          {type === "custom" && (
            <>
              <div>
                <label className="form-label">From</label>
                <input type="date" className="form-input w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <label className="form-label">To</label>
                <input type="date" className="form-input w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </>
          )}

          <button className="btn btn-primary" onClick={load} disabled={loading}>
            {loading ? "Generating..." : "Generate Report"}
          </button>
        </div>

        {data && (
          <p className="text-sm text-slate-500 mt-4">
            <span className="font-medium text-slate-700">Period:</span> {data.period.label}
          </p>
        )}
      </div>

      {loading && !data ? (
        <div className="text-center py-12 text-slate-400">Generating report...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {statCards.map(({ label, value, color }) => (
              <div key={label} className="stat-card" style={{ borderTopColor: color }}>
                <div className="stat-value text-xl">{value}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>

          {data?.monthly_breakdown && data.monthly_breakdown.length > 0 && (
            <div className="card mb-6">
              <h2 className="font-bold text-slate-800 mb-4">Quarterly Monthly Breakdown</h2>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Patients Served</th>
                      <th>Appointments</th>
                      <th>Collections</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthly_breakdown.map((row) => (
                      <tr key={row.month}>
                        <td className="font-medium">{row.month}</td>
                        <td>{row.patients}</td>
                        <td>{row.appointments}</td>
                        <td className="font-semibold text-green-600">{formatCurrency(row.collections)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="card">
              <h2 className="font-bold text-slate-800 mb-4">Common Dental Procedures</h2>
              <div className="space-y-2">
                {(data?.common_procedures ?? []).length === 0 ? (
                  <p className="text-slate-400 text-sm py-4">No procedures in this period.</p>
                ) : (
                  data?.common_procedures.map((p, i) => (
                    <div key={p.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-700">
                        <span className="text-slate-400 mr-2">{i + 1}.</span>
                        {p.name}
                      </span>
                      <span className="text-lg font-bold text-blue-600">{p.total}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card">
              <h2 className="font-bold text-slate-800 mb-4">Collections by Billable Item</h2>
              <div className="space-y-2">
                {(data?.common_billable_items ?? []).length === 0 ? (
                  <p className="text-slate-400 text-sm py-4">No collections in this period.</p>
                ) : (
                  data?.common_billable_items.map((p, i) => (
                    <div key={p.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-700">
                        <span className="text-slate-400 mr-2">{i + 1}.</span>
                        {p.name}
                        <span className="text-xs text-slate-400 ml-2">x{p.total}</span>
                      </span>
                      <span className="font-bold text-green-600">{formatCurrency(p.amount)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card">
              <h2 className="font-bold text-slate-800 mb-4">Appointments by Status</h2>
              <div className="space-y-2">
                {Object.entries(data?.appointments_by_status ?? {}).map(([status, count]) => (
                  <div key={status} className="flex justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="capitalize text-slate-700">{status}</span>
                    <span className="font-bold text-blue-600">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="font-bold text-slate-800 mb-4">Patients by Sex</h2>
              <div className="space-y-3">
                <div className="flex justify-between p-4 bg-blue-50 rounded-xl">
                  <span className="text-blue-700 font-medium">Male</span>
                  <span className="text-xl font-bold text-blue-600">{data?.patients_by_gender.male ?? 0}</span>
                </div>
                <div className="flex justify-between p-4 bg-pink-50 rounded-xl">
                  <span className="text-pink-700 font-medium">Female</span>
                  <span className="text-xl font-bold text-pink-600">{data?.patients_by_gender.female ?? 0}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="font-bold text-slate-800 mb-4">Patients by Barangay</h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(data?.patients_by_barangay ?? []).length === 0 ? (
                  <p className="text-slate-400 text-sm">No data.</p>
                ) : (
                  data?.patients_by_barangay.map((b) => (
                    <div key={b.barangay} className="flex justify-between p-2 bg-slate-50 rounded-lg text-sm">
                      <span>{b.barangay}</span>
                      <span className="font-bold">{b.total}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="card mt-6 bg-slate-50 border-dashed">
            <h2 className="font-bold text-slate-800 mb-2">Revenue Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Total Collections</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(data?.total_collections ?? 0)}</p>
              </div>
              <div>
                <p className="text-slate-500">Pending Collections</p>
                <p className="text-xl font-bold text-amber-600">{formatCurrency(data?.pending_collections ?? 0)}</p>
              </div>
              <div>
                <p className="text-slate-500">Estimated Service Revenue</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(data?.estimated_service_revenue ?? 0)}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
