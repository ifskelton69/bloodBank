import { Activity, Plus } from "lucide-react";
import Button from "../common/Button";
import { pageTitles } from "../../config/navConfig";

export default function PageHeading({ page, apiOnline, onRefresh, onQuickAdd }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">
          <span className="live-dot" />
          {apiOnline ? "LIVE DATABASE CONNECTION" : "DEMO DATA · CONNECT API TO SYNC"}
        </div>
        <h1>{pageTitles[page] || page}</h1>
        <p>
          {page === "Dashboard"
            ? "A clear view of your blood supply network and today’s priorities."
            : `Keep your ${page.toLowerCase()} accurate, organised and ready to support patients.`}
        </p>
      </div>
      <div className="heading-actions">
        <Button variant="secondary" icon={Activity} onClick={onRefresh}>Refresh</Button>
        <Button icon={Plus} onClick={onQuickAdd}>Quick add</Button>
      </div>
    </div>
  );
}
