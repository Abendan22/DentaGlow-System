"use client";

import { apiGet } from "@/lib/api";
import type { Patient } from "@/lib/types";
import { formatDate, formatDateTime, formatTime } from "@/lib/utils";
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

function buildPatientReportHtml(
  patients: Patient[],
  logoUrl: string,
  filterLabel: string
): string {
  const generatedAt = formatDateTime(new Date().toISOString());

  const allDoctors = Array.from(
    new Set(
      patients.flatMap((p) =>
        (p.appointments ?? [])
          .map((a) => a.doctor?.full_name?.trim())
          .filter((name): name is string => Boolean(name))
      )
    )
  ).sort((a, b) => a.localeCompare(b));

  const rows = patients
    .flatMap((p, i) => {
      const visits = p.appointments ?? [];
      const base = `
        <td class="num">${i + 1}</td>
        <td>${escapeHtml(p.full_name)}</td>
        <td>${escapeHtml(p.gender?.name ?? "—")}</td>
        <td>${formatDate(p.birth_date)}</td>
        <td class="num">${p.age ?? "—"}</td>
        <td>${escapeHtml(p.phone || "—")}</td>
        <td>${escapeHtml(p.email || "—")}</td>
        <td>${escapeHtml(p.barangay || "—")}</td>
        <td>${escapeHtml(p.address || "—")}</td>`;

      if (visits.length === 0) {
        return [`<tr>${base}<td>—</td><td>—</td><td>—</td></tr>`];
      }

      return visits.map(
        (a) => `
        <tr>
          ${base}
          <td>${escapeHtml(a.doctor?.full_name ?? "—")}</td>
          <td>${formatDate(a.appointment_date)}</td>
          <td>${formatTime(a.time_slot)}</td>
        </tr>`
      );
    })
    .join("");

  const doctorSummaryRows = allDoctors.length
    ? allDoctors
        .map((name, i) => {
          const count = patients.filter((p) =>
            (p.appointments ?? []).some((a) => a.doctor?.full_name?.trim() === name)
          ).length;
          return `<tr><td class="num">${i + 1}</td><td>${escapeHtml(name)}</td><td class="num">${count}</td></tr>`;
        })
        .join("")
    : `<tr><td colspan="3">No doctors assigned yet.</td></tr>`;

  return `
    <div class="letterhead">
      <img class="seal" src="${logoUrl}" alt="Sagisag ng Munisipyo ng Tapaz" />
      <div class="letterhead-text">
        <p class="gov">Republic of the Philippines</p>
        <p class="province">Province of Capiz</p>
        <p class="muni">Municipality of Tapaz</p>
        <p class="dept">Municipal Health Office</p>
        <p class="unit">Municipal Dental Clinic</p>
      </div>
    </div>

    <div class="title-block">
      <h2>Patient Record List Report</h2>
      <p><strong>Filter:</strong> ${escapeHtml(filterLabel)}</p>
      <p><strong>Total Patients:</strong> ${patients.length}</p>
      <p><strong>Date & Time Generated:</strong> ${generatedAt}</p>
    </div>

    <h2>I. Summary</h2>
    <table class="summary">
      <tbody>
        <tr><td>Total Registered Patients</td><td class="num">${patients.length}</td></tr>
        <tr><td>Total Doctors Involved</td><td class="num">${allDoctors.length}</td></tr>
      </tbody>
    </table>

    <h2>II. Patient Record List</h2>
    <table class="list">
      <thead>
        <tr>
          <th>No.</th>
          <th>Full Name</th>
          <th>Gender</th>
          <th>Birth Date</th>
          <th>Age</th>
          <th>Phone</th>
          <th>Email</th>
          <th>Barangay</th>
          <th>Address</th>
          <th>Doctor</th>
          <th>Date</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>
        ${
          patients.length === 0
            ? `<tr><td colspan="12" class="empty">No patient records found.</td></tr>`
            : rows
        }
      </tbody>
    </table>

    <h2>III. Doctors and Patients Served</h2>
    <table>
      <thead>
        <tr>
          <th>No.</th>
          <th>Doctor</th>
          <th>Patients</th>
        </tr>
      </thead>
      <tbody>${doctorSummaryRows}</tbody>
    </table>

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
  .list th, .list td { padding: 4px 5px; }
  table.summary td:first-child { width: 70%; }
  .num { text-align: right; }
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

type Props = {
  search?: string;
  barangay?: string;
  disabled?: boolean;
};

export function PatientRecordPrint({ search = "", barangay = "", disabled }: Props) {
  const [loading, setLoading] = useState(false);

  const handlePrint = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ with_appointments: "1" });
      if (search) params.set("search", search);
      if (barangay) params.set("barangay", barangay);

      const patients = await apiGet<Patient[]>(`/patients?${params}`);

      const filterParts: string[] = [];
      if (barangay) filterParts.push(`Barangay: ${barangay}`);
      if (search) filterParts.push(`Search: ${search}`);
      const filterLabel = filterParts.length ? filterParts.join(" | ") : "All patient records";

      const html = buildPatientReportHtml(patients, tapazLogoUrl(), filterLabel);
      const win = window.open("", "_blank", "width=1100,height=700");

      if (!win) {
        alert("Please allow pop-ups to print the report.");
        return;
      }

      win.document.open();
      win.document.write(`<!DOCTYPE html>
        <html>
          <head>
            <title>Patient Record List Report</title>
            <style>${printStyles}</style>
          </head>
          <body>${html}</body>
        </html>
      `);
      win.document.close();
      printWhenReady(win);
    } catch {
      alert("Failed to generate patient record report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="btn btn-ghost gap-2 shrink-0"
      disabled={disabled || loading}
    >
      <Printer size={18} />
      {loading ? "Generating..." : "Generate Report"}
    </button>
  );
}
