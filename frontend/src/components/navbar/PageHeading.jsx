import { Activity, Plus, RefreshCw } from "lucide-react";
import Button from "../common/Button";
import { pageTitles } from "../../config/navConfig";

export default function PageHeading({ page, loading, onRefresh, onQuickAdd }) {
  return (
    <div className="page-heading">
      <div>
        {/* <div className="eyebrow">
          <span className={apiOnline ? "live-dot" : "live-dot bg-amber-500"} />
          {apiOnline ? "LIVE DATABASE CONNECTION" : "API CONNECTION OFFLINE"}
        </div> */}
        <h1>{pageTitles[page] || page}</h1>
        <p>
          {page === "Dashboard"
            ? "A clear view of your blood supply network and today’s priorities."
            : `Keep your ${page.toLowerCase()} accurate, organised and ready to support patients.`}
        </p>
      </div>
      <div className="heading-actions">
        <Button
          variant="secondary"
          icon={loading ? RefreshCw : Activity}
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? "Syncing..." : "Refresh"}
        </Button>
        <Button icon={Plus} onClick={onQuickAdd}>
          Quick add
        </Button>
      </div>
    </div>
  );
}
