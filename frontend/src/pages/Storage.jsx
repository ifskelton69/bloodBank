import DataTable from "../components/common/DataTable";
import { unitsTable } from "../config/tableConfig";
import { filterRows } from "../utils/format";

export default function Storage({ units, search, onAdd }) {
  return (
    <DataTable
      config={unitsTable}
      head={{
        title: "Blood unit storage",
        desc: "Units tracked across your storage locations.",
        action: "Add stored unit",
      }}
      rows={filterRows(units, search)}
      footer={false}
      onAdd={() => onAdd("Blood unit")}
    />
  );
}
