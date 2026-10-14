import DataTable from "../components/common/DataTable";
import { inventoryTable } from "../config/tableConfig";
import { filterRows } from "../utils/format";

export default function BloodInventory({ units, search, onAdd }) {
  return (
    <DataTable
      config={inventoryTable}
      head={inventoryTable}
      rows={filterRows(units, search)}
      onAdd={() => onAdd(inventoryTable.type)}
    />
  );
}
