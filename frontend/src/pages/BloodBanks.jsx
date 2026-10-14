import DataTable from "../components/common/DataTable";
import { banksTable } from "../config/tableConfig";
import { filterRows } from "../utils/format";

export default function BloodBanks({ banks, search, onAdd }) {
  return (
    <DataTable
      config={banksTable}
      head={banksTable}
      rows={filterRows(banks, search)}
      onAdd={() => onAdd(banksTable.type)}
    />
  );
}
