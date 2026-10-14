import DataTable from "../components/common/DataTable";
import { unitsTable } from "../config/tableConfig";
import { filterRows } from "../utils/format";

export default function Donations({ units, search, onAdd }) {
  const rows = filterRows(units.filter((u) => u.Collection_Date), search);
  return (
    <DataTable
      config={unitsTable}
      head={{
        title: "Donation activity",
        desc: "Collection history for registered blood units.",
        action: "Record donation",
      }}
      rows={rows}
      footer={false}
      onAdd={() => onAdd("Blood unit")}
    />
  );
}
