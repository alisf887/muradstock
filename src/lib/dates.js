export const now0 = new Date();
export const p2 = (n) => String(n).padStart(2, "0");
export const dkey = (d) => d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
export const today = () => dkey(new Date());
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const monthYear = () => new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

/** [from, to] for calendar ("cal") or Ethiopian fiscal ("fy", starts 8 July) periods. q = 0 means full year. */
export function rangeFor(mode, y, q) {
  if (mode === "cal") {
    if (!q) return [y + "-01-01", y + "-12-31"];
    const m = (q - 1) * 3 + 1, em = m + 2, last = new Date(y, em, 0).getDate();
    return [y + "-" + p2(m) + "-01", y + "-" + p2(em) + "-" + p2(last)];
  }
  const st = [[y, 7, 8], [y, 10, 8], [y + 1, 1, 8], [y + 1, 4, 8], [y + 1, 7, 8]];
  const a = q ? st[q - 1] : st[0], b = q ? st[q] : st[4];
  const s = a[0] + "-" + p2(a[1]) + "-" + p2(a[2]);
  return [s, dkey(new Date(b[0], b[1] - 1, b[2] - 1))];
}
