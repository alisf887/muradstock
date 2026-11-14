/** Build the Excel file for a report model. ExcelJS is loaded only when you export. */
export async function buildXlsx(m) {
  const ExcelJS = (await import("exceljs/dist/exceljs.min.js")).default;
  const wb = new ExcelJS.Workbook(), ws = wb.addWorksheet(m.sheet), n = m.head.length, b = m.banner;
  const C = { ink: "FF0F1F3D", navy: "FF1B3A6B", gold: "FFD9B65D", alt: "FFE8F0FA", pk: "FFF6DADA", yl: "FFFFFF00", am: "FFFFF0C8", line: "FFB4C4DC", lite: "FFC9D3E8" };
  const thin = { style: "thin", color: { argb: C.line } }, bd = { top: thin, left: thin, bottom: thin, right: thin };
  const solid = (c) => ({ type: "pattern", pattern: "solid", fgColor: { argb: c } });
  let r = 2, cell;
  ws.getRow(1).height = 8;
  ws.mergeCells(r, 1, r, n); cell = ws.getCell(r, 1); cell.value = b.name; cell.font = { bold: true, size: 22, color: { argb: C.gold } }; cell.fill = solid(C.ink); cell.alignment = { horizontal: "center", vertical: "middle" }; ws.getRow(r).height = 38; r++;
  ws.mergeCells(r, 1, r, n); cell = ws.getCell(r, 1); cell.value = b.sub || " "; cell.font = { italic: true, size: 10, color: { argb: C.lite } }; cell.fill = solid(C.ink); cell.alignment = { horizontal: "center", vertical: "middle" }; ws.getRow(r).height = 20; r++;
  const half = Math.ceil(n / 2);
  ws.mergeCells(r, 1, r, half); cell = ws.getCell(r, 1); cell.value = b.tin || " "; cell.font = { size: 10 }; cell.alignment = { horizontal: "center" };
  ws.mergeCells(r, half + 1, r, n); cell = ws.getCell(r, half + 1); cell.value = b.prepared || " "; cell.font = { italic: true, size: 9, color: { argb: "FF555555" } }; cell.alignment = { horizontal: "right" }; r++;
  ws.mergeCells(r, 1, r, n); cell = ws.getCell(r, 1); cell.value = m.filters || " "; cell.font = { italic: true, size: 9, color: { argb: "FF666666" } }; cell.alignment = { horizontal: "left" }; r++;
  const hr = r;
  m.head.forEach((x, i) => { const hc = ws.getCell(r, i + 1); hc.value = x; hc.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } }; hc.fill = solid(C.navy); hc.border = bd; hc.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; });
  ws.getRow(r).height = 26; r++;
  const put = (i, v, type, fill, bold) => {
    const cc = ws.getCell(r, i + 1), ctr = (m.kind === "reg" && type === "q") || type === "n" || type === "d" || type === "r";
    if (type === "d" && v) { const p = String(v).split("-"); cc.value = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); cc.numFmt = "d-mmm-yy"; }
    else if (type === "m") { cc.value = (v === "" ? null : Number(v)); cc.numFmt = "#,##0.00"; }
    else if (type === "q" || type === "n") { cc.value = (v === "" ? null : Number(v)); cc.numFmt = Number.isInteger(Number(v)) ? "#,##0" : "#,##0.00"; }
    else cc.value = v;
    cc.alignment = { horizontal: ctr ? "center" : (type === "m" || type === "q") ? "right" : "left", wrapText: type === "t" };
    cc.border = bd; cc.font = { size: 10, bold: !!bold, italic: type === "r" };
    if (fill) cc.fill = solid(fill);
  };
  m.rows.forEach((row, ri) => { row.forEach((v, i) => put(i, v, m.types[i], ri % 2 === 0 ? C.alt : null)); r++; });
  if (m.total && !m.empty) { m.total.forEach((v, i) => put(i, v, m.types[i], C.am, true)); r++; }
  if (!m.empty && (m.foot || []).length) {
    r++;
    m.foot.forEach((f) => {
      const fill = C[f.c] || C.am;
      ws.mergeCells(r, 1, r, n - 1); const lc = ws.getCell(r, 1); lc.value = f.label; lc.font = { bold: true, size: 9 }; lc.alignment = { horizontal: "right", vertical: "middle" }; lc.fill = solid(fill); lc.border = bd;
      const vc = ws.getCell(r, n); vc.value = Number(f.value); vc.numFmt = "#,##0.00"; vc.font = { bold: true, size: 10 }; vc.alignment = { horizontal: "right" }; vc.fill = solid(fill); vc.border = bd; r++;
    });
  }
  if (m.note && !m.empty) { r++; ws.mergeCells(r, 1, r, n); cell = ws.getCell(r, 1); cell.value = m.note; cell.font = { italic: true, size: 9, color: { argb: "FF666666" } }; cell.alignment = { horizontal: "left" }; }
  m.widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  ws.views = [{ state: "frozen", ySplit: hr, showGridLines: false }];
  ws.pageSetup = { orientation: n > 6 ? "landscape" : "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  return wb.xlsx.writeBuffer();
}
