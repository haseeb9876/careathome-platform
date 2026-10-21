import "server-only";
import { chromium } from "playwright";
import serverlessChromium from "@sparticuz/chromium";
import type { Report, RecordEntry } from "@/modules/care/types";
export function escapeHtml(value: unknown) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
function recordHtml(r: RecordEntry) {
  return `<section><p class="label">${escapeHtml(r.visit_at)} · ${escapeHtml(r.author_name)}</p><h3>Provider observations</h3><p>${escapeHtml(r.observations)}</p><h3>Patient-reported experience</h3><p>${escapeHtml(r.patient_report || "Not recorded")}</p><h3>Session notes</h3><p>${escapeHtml(r.notes || "Not recorded")}</p>${r.mobility_minutes !== null ? `<p>Mobility activity: ${escapeHtml(r.mobility_minutes)} minutes</p>` : ""}${r.amendments?.map((a) => `<aside><h3>Amendment · ${escapeHtml(a.author_name)} · ${escapeHtml(a.created_at)}</h3><p>${escapeHtml(a.content)}</p><p>Reason: ${escapeHtml(a.reason)}</p></aside>`).join("") ?? ""}</section>`;
}
export function reportHtml(r: Report) {
  return `<h1>${escapeHtml(r.title)}</h1><p>${escapeHtml(r.period_start)} — ${escapeHtml(r.period_end)}</p><aside>${escapeHtml(r.summary)}</aside><p>Reviewed source records · Confidential care information</p>${r.source_records.map(recordHtml).join("")}<p class="label">Generated locally · ${escapeHtml(r.adapter)} · All source timestamps are UTC.</p>`;
}
let active = 0;
export async function createPdf(body: string) {
  if (active >= 2) throw new Error("PDF_BUSY");
  active++;
  let browser;
  try {
    browser = await chromium.launch(
      process.env.VERCEL
        ? {
            executablePath: await serverlessChromium.executablePath(),
            args: serverlessChromium.args,
            headless: true,
          }
        : {
            channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
            headless: true,
          },
    );
    const page = await browser.newPage({ javaScriptEnabled: false });
    await page.route("**/*", (route) => route.abort());
    await page.setContent(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>body{font:13px/1.7 Arial,sans-serif;color:#23483d}h1{font-size:29px}h2{font-size:20px}h3{font-size:12px;color:#6d8767}p{white-space:pre-wrap;overflow-wrap:anywhere}section{border-top:1px solid #dce5d6;margin-top:24px;padding-top:18px;break-inside:avoid}aside{background:#f1f5ec;padding:18px;white-space:pre-wrap;margin:15px 0}.label{font-size:10px;color:#6d8064}header{font-weight:bold;letter-spacing:1px;border-bottom:2px solid #517653;padding-bottom:16px}</style></head><body><header>Sukoonara Care · Personal care, connected.</header>${body}</body></html>`,
      { waitUntil: "load" },
    );
    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "18mm", right: "18mm" },
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate:
        '<div style="font-size:9px;color:#777;width:100%;text-align:center">Sukoonara Care · Confidential · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });
  } finally {
    await browser?.close();
    active--;
  }
}
