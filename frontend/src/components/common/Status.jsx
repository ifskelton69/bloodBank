export default function Status({ value }) {
  const v = String(value || "Unknown").toLowerCase();
  let cls = "gray";
  if (v.includes("ineligible") || v.includes("critical") || v.includes("expired") || v.includes("failed") || v.includes("rejected")) cls = "red";
  else if (v.includes("eligible") || v.includes("passed") || v.includes("approved") || v.includes("fulfilled")) cls = "green";
  else if (v.includes("pending") || v.includes("processing")) cls = "amber";
  return (
    <span className={`status ${cls}`}>
      <i />
      {value || "Unknown"}
    </span>
  );
}
