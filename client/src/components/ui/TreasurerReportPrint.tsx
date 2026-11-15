"use client";

import { apiGet } from "@/lib/api";
import type { TreasurerReportData } from "@/lib/types";
import { formatCurrency, formatDate, formatDateTime, localDateString } from "@/lib/utils";
import { Printer } from "lucide-react";
import { useState } from "react";

function tapazLogoUrl(): string {
  if (typeof window === "undefined") return "/tapazlogo.png";
  return `${window.location.origin}/tapazlogo.png`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildTreasurerReportHtml(data: TreasurerReportData, logoUrl: string): string {
  const rows = data.payments
    .map(
      (p, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td>${escapeHtml(p.or_number || "—")}</td>
        <td>${p.paid_at ? formatDateTime(p.paid_at) : "—"}</td>
        <td>${p.queue_number ? `#${p.queue_number}` : "—"}</td>
        <td>${escapeHtml(p.reference_no || "—")}</td>
        <td>${escapeHtml(p.patient_name || "—")}</td>
        <td>${escapeHtml(p.barangay || "—")}</td>
        <td>${escapeHtml(
          p.items.map((item) => `${item.name} x${item.quantity}`).join(", ") || "—"
        )}</td>
        <td class="num">${formatCurrency(p.amount_paid)}</td>
        <td>${escapeHtml(p.received_by || "—")}</td>
      </tr>`
    )
    .join("");

  const methodRows = data.by_method.length
    ? data.by_method
        .map(
          (m) =>
            `<tr><td class="cap">${escapeHtml(m.method)}</td><td class="num">${m.count}</td><td class="num">${formatCurrency(m.amount)}</td></tr>`
        )
        .join("")
    : `<tr><td colspan="3">No collections in this period.</td></tr>`;

  return `
    <div class="letterhead">
      <img class="seal" src="${logoUrl}" alt="Sagisag ng Munisipyo ng Tapaz" />
      <div class="letterhead-text">
        <p class="gov">Republic of the Philippines</p>
        <p class="province">Province of ${escapeHtml(data.facility.province)}</p>
        <p class="muni">Municipality of ${escapeHtml(data.facility.municipality)}</p>
        <p class="dept">${escapeHtml(data.facility.office)}</p>
        <p class="unit">${escapeHtml(data.facility.name)}</p>
      </div>
    </div>

    <div class="title-block">
      <h2>Treasurer Collections Report</h2>
      <p><strong>Period:</strong> ${escapeHtml(data.period.label)}</p>
      <p><strong>Date & Time Generated:</strong> ${formatDateTime(data.generated_at)}</p>
    </div>

    <h2>I. Summary</h2>
    <table class="summary">
      <tbody>
        <tr><td>Total Payments Recorded</td><td class="num">${data.summary.total_payments}</td></tr>
        <tr><td>Total Collections</td><td class="num">${formatCurrency(data.summary.total_collections)}</td></tr>
        <tr><td>Pending Bills (Period)</td><td class="num">${data.summary.pending_count}</td></tr>
        <tr><td>Pending Amount (Period)</td><td class="num">${formatCurrency(data.summary.pending_amount)}</td></tr>
      </tbody>
    </table>

    <h2>II. Collections by Payment Method</h2>
    <table>
      <thead>
        <tr><th>Method</th><th>Count</th><th>Amount</th></tr>
      </thead>
      <tbody>${methodRows}</tbody>
    </table>

    <h2>III. Payment Collection List</h2>
    <table class="list">
      <thead>
        <tr>
          <th>No.</th>
          <th>OR Number</th>
          <th>Date & Time Paid</th>
          <th>Queue #</th>
          <th>Reference</th>
          <th>Patient</th>
          <th>Barangay</th>
          <th>Items</th>
          <th>Amount</th>
          <th>Received By</th>
        </tr>
      </thead>
      <tbody>
        ${
          data.payments.length === 0
            ? `<tr><td colspan="10" class="empty">No payments recorded in this period.</td></tr>`
            : rows
        }
      </tbody>
    </table>

    <div class="signatures">
      <div class="sig">
        <div class="line"></div>
        <p>Prepared by</p>
        <p class="role">Municipal Treasurer / Cashier</p>
      </div>
      <div class="sig">
        <div class="line"></div>
        <p>Noted by</p>
        <p class="role">Municipal Mayor / Authorized Representative</p>
      </div>
    </div>
  `;
}

const printStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Times New Roman", Times, serif; padding: 28px; color: #000; font-size: 11px; line-height: 1.4; }
  .letterhead { position: relative; border-bottom: 2px solid #000; padding: 8px 0 14px; margin-bottom: 16px; min-height: 90px; }
  .letterhead .seal {
    position: absolute;
    left: calc(50% - 190px);
    top: 50%;
    transform: translateY(-50%);
    width: 80px;
    height: 80px;
    object-fit: contain;
    display: block;
  }
  .letterhead-text { text-align: center; line-height: 1.35; padding: 0 90px; }
  .letterhead .gov { font-size: 12px; }
  .letterhead .province { font-size: 12px; margin-top: 2px; }
  .letterhead .muni { font-size: 13px; font-weight: bold; margin-top: 2px; text-transform: uppercase; }
  .letterhead .dept { font-size: 13px; font-weight: bold; margin-top: 4px; }
  .letterhead .unit { font-size: 12px; font-weight: bold; margin-top: 2px; }
  .title-block { text-align: center; margin-bottom: 18px; }
  .title-block h2 { font-size: 15px; text-decoration: underline; margin-bottom: 8px; }
  h2 { font-size: 12px; margin: 16px 0 8px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #f0f0f0; font-size: 10px; }
  .list { font-size: 10px; }
  table.summary td:first-child { width: 70%; }
  .num { text-align: right; }
  .cap { text-transform: capitalize; }
  .empty { text-align: center; padding: 16px; }
  .signatures { display: flex; justify-content: space-between; margin-top: 36px; gap: 40px; }
  .sig { flex: 1; text-align: center; }
  .sig .line { border-top: 1px solid #000; margin-bottom: 6px; margin-top: 40px; }
  .sig p { font-size: 11px; }
  .sig .role { font-size: 10px; color: #333; }
  @media print {
    @page { size: landscape; margin: 12mm; }
    body { padding: 8px; }
    .signatures { page-break-inside: avoid; }
    .letterhead .seal { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

function printWhenReady(win: Window) {
  const triggerPrint = () => {
    win.focus();
    win.print();
  };

  const img = win.document.querySelector<HTMLImageElement>("img.seal");
  if (img && !img.complete) {
    img.addEventListener("load", () => setTimeout(triggerPrint, 200));
    img.addEventListener("error", () => setTimeout(triggerPrint, 200));
    return;
  }

  setTimeout(triggerPrint, 400);
}

type ReportType = "today" | "monthly" | "custom";

type Props = {
  disabled?: boolean;
};

export function TreasurerReportPrint({ disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ReportType>("monthly");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [from, setFrom] = useState(() => {
    const now = new Date();
    return localDateString(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [to, setTo] = useState(() => localDateString());

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type });
      if (type === "monthly") {
        params.set("year", String(year));
        params.set("month", String(month));
      } else if (type === "custom") {
        params.set("from", from);
        params.set("to", to);
      }

      const data = await apiGet<TreasurerReportData>(`/treasurer/report?${params}`);
      const html = buildTreasurerReportHtml(data, tapazLogoUrl());
      const win = window.open("", "_blank", "width=1100,height=700");

      if (!win) {
        alert("Please allow pop-ups to print the report.");
        return;
      }

      win.document.open();
      win.document.write(`<!DOCTYPE html>
        <html>
          <head>
            <title>Treasurer Collections Report - ${data.period.label}</title>
            <style>${printStyles}</style>
          </head>
          <body>${html}</body>
        </html>
      `);
      win.document.close();
      printWhenReady(win);
      setOpen(false);
    } catch {
      alert("Failed to generate treasurer collections report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn btn-primary gap-2 shrink-0"
        disabled={disabled || loading}
      >
        <Printer size={18} />
        {loading ? "Generating..." : "Generate Report"}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-20 w-80 p-4 bg-white border border-slate-200 rounded-xl shadow-lg space-y-3">
          <p className="text-sm font-semibold text-slate-800">Treasurer Collections Report</p>

          <div className="flex flex-wrap gap-1">
            {(["today", "monthly", "custom"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${
                  type === t ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {type === "monthly" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="form-label">Month</label>
                <select
                  className="form-input"
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                >
                  {months.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Year</label>
                <select
                  className="form-input"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {type === "custom" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="form-label">From</label>
                <input type="date" className="form-input" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <label className="form-label">To</label>
                <input type="date" className="form-input" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
          )}

          {type === "today" && (
            <p className="text-xs text-slate-500">
              Report for today ({formatDate(new Date().toISOString())})
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              className="btn btn-primary flex-1 justify-center text-sm"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? "Generating..." : "Print Report"}
            </button>
            <button
              type="button"
              className="btn btn-ghost text-sm"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
