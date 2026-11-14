import { fm2 } from "../lib/format.js";
import { cellText } from "./model.js";

/** Build the PDF for a report model. jsPDF is loaded only when you export. */
export async function buildPdf(m) {
  const { jsPDF } = await import("jspdf");
  const mod = await import("jspdf-autotable");
  const d = mod.default;
  const autoTable = typeof d === "function" ? d : (d && (d.default || d.autoTable)) || mod.autoTable;
  const n = m.head.length, b = m.banner;
  const doc = new jsPDF({ orientation: n > 6 ? "landscape" : "portrait", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const pdfT = (s) => String(s).replace(/★/g, "*").replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");   // built-in fonts: Latin only
  doc.setFillColor(15, 31, 61); doc.rect(0, 0, W, 62, "F");
  doc.setTextColor(217, 182, 93); doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.text(pdfT(b.name), W / 2, 28, { align: "center" });
  doc.setTextColor(201, 211, 232); doc.setFont("helvetica", "italic"); doc.setFontSize(9.5); doc.text(pdfT(b.sub || ""), W / 2, 48, { align: "center" });
  doc.setTextColor(40, 40, 40); doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text(pdfT(b.tin || ""), 40, 80);
  doc.setFont("helvetica", "italic"); doc.setTextColor(90, 90, 90); doc.text(pdfT(b.prepared || ""), W - 40, 80, { align: "right" });
  doc.setFontSize(8); doc.text(pdfT(m.filters || ""), 40, 94);
  const body = m.rows.map((row) => row.map((v, i) => pdfT(cellText(m.types[i], v))));
  if (m.total && !m.empty) body.push(m.total.map((v, i) => ({ content: pdfT(cellText(m.types[i], v)), styles: { fillColor: [255, 240, 200], fontStyle: "bold" } })));
  const FC = { pk: [246, 218, 218], yl: [255, 255, 0], am: [255, 240, 200] };
  if (!m.empty) (m.foot || []).forEach((f) => {
    const fc = FC[f.c] || FC.am;
    body.push([{ content: pdfT(f.label), colSpan: n - 1, styles: { halign: "right", fontStyle: "bold", fillColor: fc } }, { content: fm2(f.value), styles: { halign: "right", fontStyle: "bold", fillColor: fc } }]);
  });
  const cs = {};
  m.types.forEach((ty, i) => { cs[i] = { halign: (ty === "t") ? "left" : (ty === "m" || (ty === "q" && m.kind !== "reg")) ? "right" : "center" }; });
  autoTable(doc, {
    startY: 104, head: [m.head.map(pdfT)], body, theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 4, lineColor: [180, 196, 220], lineWidth: 0.4, textColor: [30, 30, 30] },
    headStyles: { fillColor: [27, 58, 107], textColor: [255, 255, 255], halign: "center", fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: [232, 240, 250] }, columnStyles: cs, margin: { left: 40, right: 40, bottom: 36 },
    didDrawPage: () => { doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(110, 110, 110); doc.text("StockLedger", 40, H - 18); doc.text("Page " + doc.internal.getNumberOfPages(), W - 40, H - 18, { align: "right" }); }
  });
  if (m.note && !m.empty) { const fy = (doc.lastAutoTable && doc.lastAutoTable.finalY) || 300; doc.setFont("helvetica", "italic"); doc.setFontSize(8.5); doc.setTextColor(100, 100, 100); doc.text(pdfT(m.note), 40, fy + 16); }
  return doc.output("arraybuffer");
}
