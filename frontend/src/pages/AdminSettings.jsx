import { Activity, CalendarDays, ShieldCheck } from "lucide-react";
import Status from "../components/common/Status";

export default function AdminSettings({ apiOnline }) {
  return (
    <div className="panel settings-panel">
      <div className="panel-head">
        <div>
          <h3>Project configuration</h3>
          <p>Connection status and application information</p>
        </div>
      </div>

      <div className="setting-row">
        <div className="setting-symbol"><Activity /></div>
        <div>
          <b>Flask API</b>
          <span>Base URL: {import.meta.env.VITE_API_URL || "http://localhost:5000/api"}</span>
        </div>
        <Status value={apiOnline ? "Connected" : "Demo mode"} />
      </div>

      <div className="setting-row">
        <div className="setting-symbol"><ShieldCheck /></div>
        <div>
          <b>Database</b>
          <span>MySQL · BloodBankDB</span>
        </div>
        <Status value={apiOnline ? "Reachable" : "Not verified"} />
      </div>

      <div className="setting-row">
        <div className="setting-symbol"><CalendarDays /></div>
        <div>
          <b>Project features</b>
          <span>Donors, inventory, hospitals, requests, cursors and triggers</span>
        </div>
        <Status className="gap" value="Configured in UI" />
      </div>

      {/* <div className="settings-note">
        <AlertTriangle size={18} />
        <p>
          Demo records are shown if the Flask API is unavailable. Connect the endpoints and restart the
          frontend to read and write live data.
        </p>
      </div> */}
    </div>
  );
}
