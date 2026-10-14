import DataTable from "../components/common/DataTable";
import { requestsTable } from "../config/tableConfig";
import { filterRows } from "../utils/format";

export default function BloodRequests({ requests, search, onAdd }) {
  return (
    <DataTable
      config={requestsTable}
      head={requestsTable}
      rows={filterRows(requests, search)}
      onAdd={() => onAdd(requestsTable.type)}
    />
  );
}
