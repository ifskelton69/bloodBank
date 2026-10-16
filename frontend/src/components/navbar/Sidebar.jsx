import { ChevronDown, Droplet, HeartPulse, LogOut, X } from "lucide-react";
import { nav } from "../../config/navConfig";
import { useAuth } from "../../context/useAuth";

export default function Sidebar({ page, onNavigate, open, onClose, pending }) {
  const { admin, logout } = useAuth();

  const adminName = admin?.name || "Administrator";
  const adminEmail = admin?.email || "admin@vitaldrop.org";
  const initials = adminName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "AD";

  const handleLogout = async () => {
     logout();
    
  };

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
          <button className="mobile-close icon-btn" onClick={onClose} aria-label="Close sidebar">
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
          {/* <div className="help-card">
            <div className="help-icon">
              <CircleHelp size={17} />
            </div>
            <div>
              <b>VitalDrop Core</b>
              <span>MySQL Live Connected</span>
            </div>
          </div> */}
          <div className="profile">
            <div className="avatar">{initials}</div>
            <div className="profile-text" title={adminEmail}>
              <b>{adminName}</b>
              <span>{adminEmail}</span>
            </div>
            <button
              className="icon-btn"
              title="Log out"
              onClick={handleLogout}
              aria-label="Log out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      {open && <div className="mobile-scrim" onClick={onClose} />}
    </>
  );
}
