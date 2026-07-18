// Format odometer with 2 decimal places and comma separators
export function fmtOdo(val: number | string | null | undefined): string {
  if (val == null || val === "") return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "—";
  return num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Format distance
export function fmtDist(val: number | string | null | undefined): string {
  if (val == null || val === "") return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "—";
  return num.toFixed(2);
}
