"use client";

import type { ReportData } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Printer } from "lucide-react";

function tapazLogoUrl(): string {
  if (typeof window === "undefined") return "/tapazlogo.png";
  return `${window.location.origin}/tapazlogo.png`;
}

function buildReportHtml(data: ReportData, logoUrl: string): string {
  const typeLabel =
    data.report_type === "quarterly"
      ? "Quarterly"
      : data.report_type === "monthly"
        ? "Monthly"
        : "Period";

  const statusRows = Object.entries(data.appointments_by_status)
    .map(([status, count]) => `<tr><td class="cap">${status}</td><td class="num">${count}</td></tr>`)
    .join("");

  const procedureRows = data.common_procedures
    .map((p, i) => `<tr><td>${i + 1}</td><td>${p.name}</td><td class="num">${p.total}</td></tr>`)
    .join("");

  const billableRows = data.common_billable_items
    .map(
      (p, i) =>
        `<tr><td>${i + 1}</td><td>${p.name}</td><td class="num">${p.total}</td><td class="num">${formatCurrency(p.amount)}</td></tr>`
    )
    .join("");

  const barangayRows = data.patients_by_barangay
    .map((b) => `<tr><td>${b.barangay}</td><td class="num">${b.total}</td></tr>`)
    .join("");

  const monthlyRows = (data.monthly_breakdown ?? [])
    .map(
      (m) =>
        `<tr><td>${m.month}</td><td class="num">${m.patients}</td><td class="num">${m.appointments}</td><td class="num">${formatCurrency(m.collections)}</td></tr>`
    )
    .join("");

  const monthlySection = data.monthly_breakdown?.length
    ? `
      <h2>Monthly Breakdown (Quarter)</h2>
      <table>
        <thead><tr><th>Month</th><th>Patients Served</th><th>Appointments</th><th>Collections</th></tr></thead>
        <tbody>${monthlyRows}</tbody>
      </table>`
    : "";

  return `
    <div class="letterhead">
      <img class="seal" src="${logoUrl}" alt="Sagisag ng Munisipyo ng Tapaz" />
      <div class="letterhead-text">
        <p class="gov">Republic of the Philippines</p>
        <p class="province">Province of ${data.facility.province}</p>
        <p class="muni">Municipality of ${data.facility.municipality}</p>
        <p class="dept">Municipal Health Office</p>
        <p class="unit">${data.facility.name}</p>
        <p class="sub">Report submitted to: ${data.facility.reporting_to}</p>
      </div>
    </div>

    <div class="title-block">
      <h2>${typeLabel} Dental Health Services Report</h2>
      <p><strong>Reporting Period:</strong> ${data.period.label}</p>
      <p><strong>Date Generated:</strong> ${formatDate(data.generated_at)}</p>
    </div>

    <h2>I. Summary of Services</h2>
    <table class="summary">
      <tbody>
        <tr><td>Total Registered Patients</td><td class="num">${data.total_registered_patients}</td></tr>
        <tr><td>New Patients (Period)</td><td class="num">${data.new_patients}</td></tr>
        <tr><td>Patients Served (Period)</td><td class="num">${data.patients_served}</td></tr>
        <tr><td>Total Appointments</td><td class="num">${data.total_appointments}</td></tr>
        <tr><td>Completed Appointments</td><td class="num">${data.completed_appointments}</td></tr>
        <tr><td>Total Collections (Treasurer)</td><td class="num">${formatCurrency(data.total_collections)}</td></tr>
        <tr><td>Pending Collections</td><td class="num">${formatCurrency(data.pending_collections)}</td></tr>
        <tr><td>Estimated Service Revenue</td><td class="num">${formatCurrency(data.estimated_service_revenue)}</td></tr>
      </tbody>
    </table>

    <h2>II. Patients by Sex</h2>
    <table>
      <thead><tr><th>Sex</th><th>Count</th></tr></thead>
      <tbody>
        <tr><td>Male</td><td class="num">${data.patients_by_gender.male}</td></tr>
        <tr><td>Female</td><td class="num">${data.patients_by_gender.female}</td></tr>
      </tbody>
    </table>

    <h2>III. Common Dental Procedures</h2>
    <table>
      <thead><tr><th>#</th><th>Procedure / Service</th><th>Count</th></tr></thead>
      <tbody>${procedureRows || '<tr><td colspan="3">No data</td></tr>'}</tbody>
    </table>

    <h2>IV. Collections by Billable Item</h2>
    <table>
      <thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>
      <tbody>${billableRows || '<tr><td colspan="4">No data</td></tr>'}</tbody>
    </table>

    <h2>V. Appointments by Status</h2>
    <table>
      <thead><tr><th>Status</th><th>Count</th></tr></thead>
      <tbody>${statusRows || '<tr><td colspan="2">No data</td></tr>'}</tbody>
    </table>

    <h2>VI. Patients by Barangay (Top 10)</h2>
    <table>
      <thead><tr><th>Barangay</th><th>Patients Served</th></tr></thead>
      <tbody>${barangayRows || '<tr><td colspan="2">No data</td></tr>'}</tbody>
    </table>

    ${monthlySection}

    <div class="signatures">
      <div class="sig">
        <div class="line"></div>
        <p>Prepared by</p>
        <p class="role">Dental Clinic Staff / MHO</p>
      </div>
      <div class="sig">
        <div class="line"></div>
        <p>Noted by</p>
        <p class="role">Municipal Health Officer</p>
      </div>
      <div class="sig">
        <div class="line"></div>
        <p>Approved by</p>
        <p class="role">Municipal Mayor / Authorized Representative</p>
      </div>
    </div>
  `;
}

const printStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Times New Roman", Times, serif; padding: 40px; color: #000; font-size: 12px; line-height: 1.5; }
  .letterhead { position: relative; border-bottom: 2px solid #000; padding: 8px 0 14px; margin-bottom: 20px; min-height: 96px; }
  .letterhead .seal {
    position: absolute;
    left: calc(50% - 200px);
    top: 50%;
    transform: translateY(-50%);
    width: 88px;
    height: 88px;
    object-fit: contain;
    display: block;
  }
  .letterhead-text { text-align: center; line-height: 1.35; padding: 0 100px; }
  .letterhead .gov { font-size: 12px; }
  .letterhead .province { font-size: 12px; margin-top: 2px; }
  .letterhead .muni { font-size: 13px; font-weight: bold; margin-top: 2px; text-transform: uppercase; }
  .letterhead .dept { font-size: 13px; font-weight: bold; margin-top: 4px; }
  .letterhead .unit { font-size: 12px; font-weight: bold; margin-top: 2px; }
  .letterhead .sub { font-size: 10px; margin-top: 6px; color: #333; }
  .title-block { text-align: center; margin-bottom: 24px; }
  .title-block h2 { font-size: 15px; text-decoration: underline; margin-bottom: 8px; }
  h2 { font-size: 13px; margin: 20px 0 8px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; }
  th { background: #f0f0f0; font-size: 11px; }
  .num { text-align: right; }
  .cap { text-transform: capitalize; }
  table.summary td:first-child { width: 70%; }
  .signatures { display: flex; justify-content: space-between; margin-top: 48px; gap: 20px; }
  .sig { flex: 1; text-align: center; }
  .sig .line { border-top: 1px solid #000; margin-bottom: 6px; margin-top: 40px; }
  .sig p { font-size: 11px; }
  .sig .role { font-size: 10px; color: #333; }
  @media print {
    body { padding: 20px; }
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

type Props = {
  data: ReportData;
};

export function ReportPrint({ data }: Props) {
  const handlePrint = () => {
    const html = buildReportHtml(data, tapazLogoUrl());
    const win = window.open("", "_blank", "width=900,height=700");

    if (!win) {
      alert("Please allow pop-ups to print the report.");
      return;
    }

    win.document.open();
    win.document.write(`<!DOCTYPE html>
      <html>
        <head>
          <title>MHO Report - ${data.period.label}</title>
          <style>${printStyles}</style>
        </head>
        <body>${html}</body>
      </html>
    `);
    win.document.close();
    printWhenReady(win);
  };

  return (
    <button type="button" onClick={handlePrint} className="btn btn-primary gap-2">
      <Printer size={18} /> Print MHO / DOH Report
    </button>
  );
}

export { buildReportHtml };
