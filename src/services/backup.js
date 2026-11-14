import { S, log, save } from "../state/store.js";
import { ui } from "../state/ui.js";
import { migrate } from "../state/migrate.js";
import { t } from "../i18n/index.js";
import { toast } from "../lib/dom.js";
import { today } from "../lib/dates.js";

export const backupJson = () => JSON.stringify(S);

export function backupFile() {
  if (!ui.DL) { toast(t("t_dl_no")); return; }
  ui.DL.save({ filename: "stockledger-backup-" + today() + ".json", data: backupJson() })
    .then(() => toast(t("t_dl")), (e) => { if (e && e.code !== "declined") toast(t("t_dl_no")); });
}

/** Read a backup file into S. Calls onDone() after a successful restore. */
export function restoreFile(file, onDone) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const o = JSON.parse(r.result);
      if (!o || !Array.isArray(o.products) || !Array.isArray(o.sales)) throw new Error("bad");
      ["products","customers","sales","purchases","payments","orders","log","returns","moves"].forEach((k) => { S[k] = Array.isArray(o[k]) ? o[k] : []; });
      S.seq = o.seq || S.seq; S.rno = o.rno || 1; S.pono = o.pono || 1;
      S.vat = (typeof o.vat === "number") ? o.vat : 0.15;
      S.biz = (o.biz && typeof o.biz === "object") ? o.biz : { name: "", tin: "", period: "" };
      S.mig = !!(o.mig && Array.isArray(o.moves));
      migrate();
      log("Backup restored"); save(); toast(t("restore_ok"));
      if (onDone) onDone();
    } catch (err) { toast(t("restore_bad")); }
  };
  r.readAsText(file);
}
