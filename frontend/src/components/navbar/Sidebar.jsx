import { ChevronDown, CircleHelp, Droplet, HeartPulse, LogOut, X } from "lucide-react";
import { nav } from "../../config/navConfig";

export default function Sidebar({ page, onNavigate, open, onClose, pending }) {
  return (
    <>
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Droplet size={23} fill="currentColor" />
          </div>
          <div>
            <b>VitalDrop</b>
            <span>BLOOD BANK NETWORK</span>
          </div>
          <button className="mobile-close icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="network-card">
          <div className="network-icon">
            <HeartPulse size={18} />
          </div>
          <div>
            <b>Central Network</b>
            <span>Pune, Maharashtra</span>
          </div>
          <ChevronDown size={15} />
        </div>

        {nav.map((group) => (
          <div className="nav-group" key={group.label}>
            <div className="nav-label">{group.label}</div>
            {group.items.map(([label, Icon]) => (
              <button
                key={label}
                className={`nav-item ${page === label ? "active" : ""}`}
                onClick={() => onNavigate(label)}
              >
                <Icon size={18} />
                <span>{label}</span>
                {label === "Blood requests" && pending > 0 && <em>{pending}</em>}
              </button>
            ))}
          </div>
        ))}

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">
              <CircleHelp size={17} />
            </div>
            <div>
              <b>Need a hand?</b>
              <span>Check project help</span>
            </div>
            <ChevronDown size={14} />
          </div>
          <div className="profile">
            <div className="avatar">AD</div>
            <div className="profile-text">
              <b>Admin User</b>
              <span>Network administrator</span>
            </div>
            <button className="icon-btn" title="Account">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      {open && <div className="mobile-scrim" onClick={onClose} />}
    </>
  );
}
