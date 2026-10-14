export function fmt(value) {
  if (value == null || value === "") return "—";
  // Flask jsonify sends dates like "Tue, 13 Oct 2026 00:00:00 GMT"
  if (typeof value === "string" && /^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4}/.test(value)) {
    const d = new Date(value);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
  }
  return String(value);
}

export function filterRows(rows, search) {
  if (!search.trim()) return rows;
  const q = search.toLowerCase();
  return rows.filter((row) =>
    Object.values(row).some((v) => String(v).toLowerCase().includes(q)),
  );
}

export function sumByType(units, type) {
  return units
    .filter((u) => u.Blood_Type === type)
    .reduce((s, u) => s + Number(u.Quantity || 0), 0);
}