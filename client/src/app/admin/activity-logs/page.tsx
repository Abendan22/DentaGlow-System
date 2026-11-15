"use client";

import { apiGet } from "@/lib/api";
import type { ActivityLog, PaginatedResponse } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

/** Activity action colors — edit HERE when sir asks about log badge colors */
const ACTION_STYLES: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-red-100 text-red-800",
  cancel: "bg-orange-100 text-orange-800",
  approve: "bg-teal-100 text-teal-800",
  complete: "bg-emerald-100 text-emerald-800",
  reject: "bg-pink-100 text-pink-800",
  login: "bg-indigo-100 text-indigo-800",
  register: "bg-violet-100 text-violet-800",
  payment: "bg-amber-100 text-amber-800",
  forgot_password: "bg-orange-100 text-orange-800",
  reset_password: "bg-lime-100 text-lime-800",
};

function actionBadgeClass(action: string): string {
  const key = action.trim().toLowerCase();
  return ACTION_STYLES[key] ?? "bg-slate-100 text-slate-700";
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const q = search ? `?search=${search}` : "";
    apiGet<PaginatedResponse<ActivityLog>>(`/activity-logs${q}`)
      .then((res) => setLogs(res.data))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Activity Logs</h1>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search activity logs..."
          className="form-input w-64"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg">
          <table className="data-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>User</th>
                <th>Action</th>
                <th>Module</th>
                <th>Description</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No activity logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => (
                  <tr key={log.id}>
                    <td>{i + 1}</td>
                    <td>{log.user?.name ?? "System"}</td>
                    <td>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${actionBadgeClass(log.action)}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td>{log.module}</td>
                    <td className="max-w-xs truncate">{log.description}</td>
                    <td className="whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
