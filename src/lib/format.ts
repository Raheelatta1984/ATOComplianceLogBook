// Format odometer with 1 decimal place (standard for cars)
export function fmtOdo(val: number | string | null | undefined): string {
  if (val == null || val === "" || val === "—") return "—";
  const num = typeof val === "string" ? parseFloat(val) : Number(val);
  if (isNaN(num) || num === 0) return "—";
  // Format with commas and 1 decimal place (e.g., 45,250.3)
  return num.toLocaleString("en-AU", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// Format distance
export function fmtDist(val: number | string | null | undefined): string {
  if (val == null || val === "") return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "—";
  return num.toFixed(2);
}
