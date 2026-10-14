import { Plus, Search } from "lucide-react";
import Button from "./Button";
import Status from "./Status";
import { fmt } from "../../utils/format";

const STATUS_COLS = ["Status", "Eligibility_Status", "Testing_Status", "Urgency_Level"];

export default function DataTable({ config, rows, onAdd, head, footer = true }) {
  const rowKey = (r, i) => r.Donor_ID || r.Unit_ID || r.Hospital_ID || r.Bank_ID || r.Request_ID || i;
  return (
    <div className="panel table-panel">
      {head && (
        <div className="panel-head">
          <div>
            <h3>{head.title}</h3>
            <p>{head.desc}</p>
          </div>
          <Button icon={Plus} onClick={onAdd}>{head.action}</Button>
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>{config.cols.map((c) => <th key={c[0]}>{c[1]}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={rowKey(r, i)}>
                {config.cols.map((c) => (
                  <td key={c[0]}>
                    {STATUS_COLS.includes(c[0]) ? <Status value={r[c[0]]} /> : fmt(r[c[0]])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="empty">
            <Search size={24} />
            <b>No records found</b>
            <span>Try another search or add a new record.</span>
          </div>
        )}
      </div>
      {footer && (
        <div className="table-foot">
          Showing {rows.length} record{rows.length === 1 ? "" : "s"}{" "}
          <span>Synced with BloodBankDB when API is connected</span>
        </div>
      )}
    </div>
  );
}
