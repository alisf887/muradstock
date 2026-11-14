import { now0 } from "../lib/dates.js";

/** Transient UI state: never saved. */
export const ui = {
  tab: "home",
  cart: [],
  method: "cash",
  draft: {},            // form values keyed by input id
  confirmKey: null,     // "tap again to confirm" key
  editPid: null, editCid: null, editPur: null,
  repView: "reg",
  profitRange: "7",
  repMode: "cal", repYear: now0.getFullYear(), repQ: 0,
  DL: null              // download adapter, set in reports/export.js
};

export function clearDraft(keys) { keys.forEach((k) => { delete ui.draft[k]; }); }
