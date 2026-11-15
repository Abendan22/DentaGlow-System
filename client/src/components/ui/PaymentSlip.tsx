"use client";

import type { PaymentOrder } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Printer } from "lucide-react";

type Props = {
  order: PaymentOrder;
  onPrint?: () => void;
};

function tapazLogoUrl(): string {
  if (typeof window === "undefined") return "/tapazlogo.png";
  return `${window.location.origin}/tapazlogo.png`;
}

function buildSlipHtml(order: PaymentOrder, logoUrl: string): string {
  const items = order.items
    ?.map(
      (item) => `
      <tr>
        <td>${item.item_name}</td>
        <td class="qty">${item.quantity}</td>
        <td class="amount">${formatCurrency(item.subtotal)}</td>
      </tr>`
    )
    .join("");

  const queueBlock = order.queue_number
    ? `
      <div class="queue">
        <p class="queue-label">Queue Number</p>
        <p class="queue-num">#${order.queue_number}</p>
      </div>`
    : "";

  return `
    <div class="header">
      <img class="seal" src="${logoUrl}" alt="Sagisag ng Munisipyo ng Tapaz" />
      <div class="header-text">
        <p class="sub">Republic of the Philippines</p>
        <p class="sub">Province of Capiz</p>
        <h1>Municipality of Tapaz</h1>
        <p class="clinic">Municipal Dental Clinic</p>
        <p class="sub">LGU Dental Health Services</p>
      </div>
    </div>
    ${queueBlock}
    <div class="row"><span>Patient</span><span class="bold">${order.patient?.full_name ?? "—"}</span></div>
    <div class="row"><span>Barangay</span><span>${order.patient?.barangay ?? "—"}</span></div>
    <div class="row"><span>Date</span><span>${formatDate(new Date().toISOString())}</span></div>
    <table>
      <thead>
        <tr><th>Item</th><th>Qty</th><th class="amount">Amount</th></tr>
      </thead>
      <tbody>${items ?? ""}</tbody>
    </table>
    <p class="total">Total: ${formatCurrency(order.total_amount)}</p>
    <p class="ref">Ref: ${order.reference_no}</p>
    <div class="footer">
      <strong>PAY AT THE MUNICIPAL TREASURER</strong>
      <p>Ground Floor — Bring this slip</p>
      <p class="note">After payment, return to the Dental Clinic</p>
    </div>
  `;
}

const printStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; padding: 20px; max-width: 320px; margin: 0 auto; color: #000; }
  .header { position: relative; border-bottom: 2px solid #000; padding: 6px 0 12px; margin-bottom: 12px; min-height: 72px; }
  .header .seal {
    position: absolute;
    left: calc(50% - 145px);
    top: 50%;
    transform: translateY(-50%);
    width: 56px;
    height: 56px;
    object-fit: contain;
    display: block;
  }
  .header-text { text-align: center; line-height: 1.3; padding: 0 68px; }
  .header h1 { font-size: 13px; font-weight: bold; text-transform: uppercase; margin-top: 2px; }
  .header .clinic { font-size: 11px; font-weight: 600; margin-top: 3px; }
  .header .sub { font-size: 10px; color: #333; }
  .queue { text-align: center; margin: 16px 0; padding: 12px; border: 2px dashed #000; }
  .queue-label { font-size: 11px; text-transform: uppercase; color: #555; }
  .queue-num { font-size: 36px; font-weight: bold; }
  .row { display: flex; justify-content: space-between; font-size: 12px; margin: 6px 0; }
  .row span:first-child { color: #555; }
  .row .bold { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
  th, td { padding: 6px 4px; border-bottom: 1px solid #ddd; }
  th { font-size: 10px; text-transform: uppercase; color: #555; text-align: left; }
  .qty { text-align: center; }
  .amount { text-align: right; }
  .total { font-size: 16px; font-weight: bold; text-align: right; margin: 12px 0; }
  .ref { font-family: monospace; font-size: 11px; text-align: center; margin-top: 8px; color: #555; }
  .footer { text-align: center; font-size: 11px; margin-top: 16px; padding-top: 12px; border-top: 2px solid #000; }
  .footer strong { display: block; font-size: 12px; margin-bottom: 4px; }
  .footer .note { color: #555; margin-top: 6px; }
  @media print {
    body { padding: 10px; }
    .header .seal { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

export function PaymentSlip({ order, onPrint }: Props) {
  const handlePrint = () => {
    const slipHtml = buildSlipHtml(order, tapazLogoUrl());
    const win = window.open("", "_blank", "width=420,height=640");

    if (!win) {
      alert("Please allow pop-ups to print the payment slip.");
      return;
    }

    win.document.open();
    win.document.write(`<!DOCTYPE html>
      <html>
        <head>
          <title>Payment Slip - ${order.reference_no}</title>
          <style>${printStyles}</style>
        </head>
        <body>${slipHtml}</body>
      </html>
    `);
    win.document.close();

    const triggerPrint = () => {
      win.focus();
      win.print();
      onPrint?.();
    };

    const img = win.document.querySelector<HTMLImageElement>("img.seal");
    if (img && !img.complete) {
      img.addEventListener("load", () => setTimeout(triggerPrint, 200));
      img.addEventListener("error", () => setTimeout(triggerPrint, 200));
    } else {
      setTimeout(triggerPrint, 300);
    }
  };

  return (
    <div>
      <div className="payment-slip-preview border border-slate-200 rounded-xl p-4 bg-white">
        <div className="border-b-2 border-slate-800 pb-3 mb-3 relative min-h-[72px]">
          <img
            src="/tapazlogo.png"
            alt="Sagisag ng Munisipyo ng Tapaz"
            className="absolute left-[calc(50%-145px)] top-1/2 -translate-y-1/2 w-14 h-14 object-contain"
          />
          <div className="text-center leading-snug px-16">
            <p className="text-[10px] text-slate-500">Republic of the Philippines</p>
            <p className="text-[10px] text-slate-500">Province of Capiz</p>
            <h1 className="font-bold text-sm uppercase">Municipality of Tapaz</h1>
            <p className="text-xs font-medium mt-0.5">Municipal Dental Clinic</p>
            <p className="text-[10px] text-slate-500">LGU Dental Health Services</p>
          </div>
        </div>

        {order.queue_number && (
          <div className="text-center my-4 py-3 border-2 border-dashed border-slate-400 rounded-lg">
            <p className="text-xs uppercase text-slate-500 tracking-wider">Queue Number</p>
            <p className="text-4xl font-bold text-slate-800">#{order.queue_number}</p>
          </div>
        )}

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Patient</span>
            <span className="font-semibold text-right">{order.patient?.full_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Barangay</span>
            <span>{order.patient?.barangay ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Date</span>
            <span>{formatDate(new Date().toISOString())}</span>
          </div>
        </div>

        <table className="w-full text-sm mt-4">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
              <th className="text-left py-2">Item</th>
              <th className="text-center py-2">Qty</th>
              <th className="text-right py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="py-2">{item.item_name}</td>
                <td className="text-center py-2">{item.quantity}</td>
                <td className="text-right py-2">{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-right text-lg font-bold text-blue-700 mt-3">
          Total: {formatCurrency(order.total_amount)}
        </div>

        <p className="font-mono text-xs text-center text-slate-500 mt-3">
          Ref: {order.reference_no}
        </p>

        <div className="text-center mt-4 pt-3 border-t-2 border-slate-800">
          <strong className="text-sm block">PAY AT THE MUNICIPAL TREASURER</strong>
          <p className="text-xs text-slate-600 mt-1">Ground Floor — Bring this slip</p>
          <p className="text-xs text-slate-500 mt-2">After payment, return to the Dental Clinic</p>
        </div>
      </div>

      <button type="button" onClick={handlePrint} className="btn btn-primary w-full justify-center gap-2 mt-4">
        <Printer size={18} /> Print Payment Slip
      </button>
    </div>
  );
}
