"use client";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { ApiError, apiGet } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { DashboardData } from "@/lib/types";
import { formatCurrency, formatDate, formatTime, localDateString } from "@/lib/utils";
import {
  Activity,
  Banknote,
  Building2,
  Calendar,
  PhilippinePeso,
  Stethoscope,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function DashboardPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [filterDate, setFilterDate] = useState("");
  const [appliedDate, setAppliedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    (date?: string) => {
      setLoading(true);
      const selected = date ?? filterDate;
      const q = selected ? `?date=${selected}` : "";
      apiGet<DashboardData>(`/dashboard${q}`)
        .then((res) => {
          setData(res);
          setAppliedDate(selected || null);
        })
        .catch((err) => {
          showToast(
            err instanceof ApiError ? err.message : "Failed to load dashboard",
            "error"
          );
        })
        .finally(() => setLoading(false));
    },
    [filterDate, showToast]
  );

  useEffect(() => {
    load("");
    // Initial overall load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    load(filterDate);
  };

  const handleClear = () => {
    setFilterDate("");
    load("");
  };

  const collectionsLabel = appliedDate
    ? `Collections (${formatDate(appliedDate)})`
    : "Collections Today";

  const appointmentsLabel = appliedDate
    ? `Appointments (${formatDate(appliedDate)})`
    : "Total Appointments";

  const stats = [
    {
      label: "Total Number of Clinics",
      value: data?.stats.total_clinics ?? 0,
      icon: Building2,
      color: "#2563eb",
    },
    {
      label: "Total Active Services",
      value: data?.stats.total_services ?? 0,
      icon: Activity,
      color: "#10b981",
    },
    {
      label: appointmentsLabel,
      value: data?.stats.total_appointments ?? 0,
      icon: Calendar,
      color: "#8b5cf6",
    },
    {
      label: "Total Number of Doctors",
      value: data?.stats.total_doctors ?? 0,
      icon: Stethoscope,
      color: "#f59e0b",
    },
    {
      label: "Total Number of Patients",
      value: data?.stats.total_patients ?? 0,
      icon: Users,
      color: "#ef4444",
    },
    {
      label: "Pending Payments",
      value: data?.stats.pending_payments ?? 0,
      icon: Banknote,
      color: "#f59e0b",
      sub: formatCurrency(data?.stats.pending_amount ?? 0),
    },
    {
      label: collectionsLabel,
      value: formatCurrency(data?.stats.collections_today ?? 0),
      icon: PhilippinePeso,
      color: "#10b981",
      sub: "Treasurer window",
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-sm text-slate-500 uppercase tracking-wider font-medium">
            Overview
          </p>
          <h1 className="text-2xl font-bold text-slate-800">Performance</h1>
          <p className="text-sm text-slate-500 mt-1">
            {appliedDate
              ? `Showing data for ${formatDate(appliedDate)}`
              : "Showing overall clinic data (appointments & collections today)"}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            className="form-input w-auto"
            value={filterDate}
            max={localDateString()}
            onChange={(e) => setFilterDate(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Loading..." : "Submit"}
          </button>
          {appliedDate && (
            <button type="button" className="btn btn-ghost" onClick={handleClear} disabled={loading}>
              Clear
            </button>
          )}
        </form>
      </div>

      {loading && !data ? (
        <div className="text-center py-12 text-slate-400">Loading dashboard...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-8">
            {stats.map(({ label, value, icon: Icon, color, sub }) => (
              <div key={label} className="stat-card" style={{ borderTopColor: color }}>
                <Icon size={22} className="text-slate-400 mb-3" />
                <div className="stat-value">{value}</div>
                <div className="stat-label">{label}</div>
                {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card">
              <h2 className="font-bold text-slate-800 mb-4">
                {appliedDate ? "Appointments for Selected Date" : "Recent Appointments"}
              </h2>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.recent_appointments ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-400">
                          No appointments found.
                        </td>
                      </tr>
                    ) : (
                      (data?.recent_appointments ?? []).map((a) => (
                        <tr key={a.id}>
                          <td>{a.patient?.full_name}</td>
                          <td>{a.doctor?.full_name}</td>
                          <td>{formatDate(a.appointment_date)}</td>
                          <td>{formatTime(a.time_slot)}</td>
                          <td>
                            <StatusBadge status={a.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h2 className="font-bold text-slate-800 mb-4">
                Visited Patient by Age
                {appliedDate ? ` (${formatDate(appliedDate)})` : ""}
              </h2>
              <div className="space-y-4">
                {Object.entries(data?.age_groups ?? {}).map(([group, counts]) => (
                  <div key={group} className="p-4 bg-slate-50 rounded-xl">
                    <div className="font-semibold text-slate-700 mb-2">{group} age</div>
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-600">♂ Male: {counts.male}</span>
                      <span className="text-pink-500">♀ Female: {counts.female}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
