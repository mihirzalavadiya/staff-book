/** Indian grouping: 1,23,456 */
export function formatINR(amount: number, opts: { sign?: boolean } = {}): string {
  const negative = amount < 0;
  const abs = Math.round(Math.abs(amount));
  const s = abs.toString();
  let out: string;
  if (s.length <= 3) {
    out = s;
  } else {
    const last3 = s.slice(-3);
    const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    out = `${rest},${last3}`;
  }
  const prefix = negative ? "−" : opts.sign ? "+" : "";
  return `${prefix}₹${out}`;
}
