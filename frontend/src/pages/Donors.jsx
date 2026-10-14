import DataTable from "../components/common/DataTable";
import { donorsTable } from "../config/tableConfig";
import { filterRows } from "../utils/format";

export default function Donors({ donors, search, onAdd }) {
  return (
    <DataTable
      config={donorsTable}
      head={donorsTable}
      rows={filterRows(donors, search)}
      onAdd={() => onAdd(donorsTable.type)}
    />
  );
}
