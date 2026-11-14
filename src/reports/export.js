import { ui } from "../state/ui.js";
import { t } from "../i18n/index.js";
import { toast } from "../lib/dom.js";
import { buildModel, filt } from "./model.js";
import { buildXlsx } from "./xlsx.js";
import { buildPdf } from "./pdf.js";

const MIME = { csv: "text/csv;charset=utf-8", json: "application/json", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", pdf: "application/pdf" };

/** Download adapter: save({filename, data}) triggers a normal browser download. */
export const LOCAL_DL = {
  save(r) {
    return new Promise((res, rej) => {
      try {
        const ext = r.filename.split(".").pop();
        const blob = (r.data instanceof Blob) ? r.data : new Blob([r.data], { type: MIME[ext] || "application/octet-stream" });
        const u = URL.createObjectURL(blob), a = document.createElement("a");
        a.href = u; a.download = r.filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(u), 4000);
        res({ status: "saved" });
      } catch (e) { rej({ code: "unavailable", message: String(e) }); }
    });
  }
};
export function initDownloads() { ui.DL = LOCAL_DL; }

/** v = "reg" | "sum" | "soh", f = "xlsx" | "pdf" */
export async function exportReport(v, f) {
  if (!ui.DL) { toast(t("t_dl_no")); return; }
  const m = buildModel(v, "en"), F = filt();
  const name = m.file + "_" + (F.from || "all") + "_to_" + (F.to || "all") + "." + f;
  toast("…");
  try {
    const buf = f === "xlsx" ? await buildXlsx(m) : await buildPdf(m);
    await ui.DL.save({ filename: name, data: buf });
    toast(t("t_dl"));
  } catch (e) {
    if (e && e.code === "declined") return;
    console.error(e);
    toast(t("exp_fail"));
  }
}
