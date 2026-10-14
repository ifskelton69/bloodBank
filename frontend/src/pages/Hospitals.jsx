import DataTable from "../components/common/DataTable";
import { hospitalsTable } from "../config/tableConfig";
import { filterRows } from "../utils/format";

export default function Hospitals({ hospitals, search, onAdd }) {
  return (
    <DataTable
      config={hospitalsTable}
      head={hospitalsTable}
      rows={filterRows(hospitals, search)}
      onAdd={() => onAdd(hospitalsTable.type)}
    />
  );
}
