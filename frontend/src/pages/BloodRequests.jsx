import { useState } from "react";
import { Plus, Search } from "lucide-react";
import Button from "../components/common/Button";
import Status from "../components/common/Status";
import { filterRows, fmt } from "../utils/format";

export default function BloodRequests({ requests, search, onAdd, onStatusChange, showNotice }) {
  const [updatingId, setUpdatingId] = useState(null);

  const filtered = filterRows(requests, search);

  const handleDropdownChange = async (requestId, newStatus, currentStatus) => {
    if (newStatus === currentStatus) return;

    setUpdatingId(requestId);
    const result = await onStatusChange(requestId, newStatus);
    setUpdatingId(null);

    if (result.ok) {
      showNotice(result.message);
    } else {
      showNotice(result.message);
    }
  };

  return (
    <div className="panel table-panel">
      <div className="panel-head">
        <div>
          <h3>Hospital requests</h3>
          <p>Prioritise urgent requests, manage approval, and track inventory fulfilment.</p>
        </div>
        <Button icon={Plus} onClick={() => onAdd("Blood request")}>
          New request
        </Button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Hospital</th>
              <th>Request date</th>
              <th>Blood type</th>
              <th>Units requested</th>
              <th>Urgency</th>
              {/* <th>Status</th> */}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const isUpdating = updatingId === r.Request_ID;
              const formattedReqId = String(r.Request_ID).startsWith("REQ-")
                ? r.Request_ID
                : `REQ-${String(r.Request_ID).padStart(3, "0")}`;

              return (
                <tr key={r.Request_ID}>
                  <td>
                    <b className="table-primary">{formattedReqId}</b>
                  </td>
                  <td>
                    <b>{r.Hospital_Name || `Hospital #${r.Hospital_ID}`}</b>
                  </td>
                  <td>{fmt(r.Request_Date)}</td>
                  <td>
                    <span className="blood-chip">{r.Needed_Blood_Type}</span>
                  </td>
                  <td>
                    <b>{r.Qty_Requested}</b> unit{r.Qty_Requested === 1 ? "" : "s"}
                  </td>
                  <td>
                    <Status value={r.Urgency_Level} />
                  </td>
                  {/* <td>
                    <Status value={r.Status} />
                  </td> */}
                  <td>
                    <div className="table-actions">
                      <select
                        className="status-dropdown"
                        value={r.Status || "Pending"}
                        disabled={isUpdating}
                        onChange={(e) =>
                          handleDropdownChange(r.Request_ID, e.target.value, r.Status)
                        }
                      >
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                      {isUpdating && <span className="text-xs text-muted">Updating...</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="empty">
            <Search size={24} />
            <b>No hospital requests found</b>
            <span>Try searching for another term or create a new hospital request.</span>
          </div>
        )}
      </div>

      <div className="table-foot">
        Showing {filtered.length} request{filtered.length === 1 ? "" : "s"}{" "}
        {/* <span>Live connected to MySQL database</span> */}
      </div>
    </div>
  );
}
