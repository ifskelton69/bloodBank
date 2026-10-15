import { useEffect, useState } from "react";
import { Bell, Menu, Search } from "lucide-react";
import { getRequests } from "../../services/api"; // Adjust path if needed

export default function Topbar({
  page,
  search,
  onSearch,
  onMenu,
  onBell,
}) {
  const [hasPendingRequests, setHasPendingRequests] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchRequests = async () => {
      try {
        const res = await getRequests();
        const data = res.data;

        const requests = Array.isArray(data)
          ? data
          : data?.requests ?? data?.data ?? [];

        const hasPending = requests.some(
          (request) =>
            String(request.Status ?? request.status ?? "").toLowerCase() ===
            "pending"
        );

        if (active) {
          setHasPendingRequests(hasPending);
        }
      } catch (error) {
        console.error("Failed to fetch blood requests:", error);
      }
    };

    fetchRequests();

    return () => {
      active = false;
    };
  }, []);

  return (
    <header className="topbar">
      <button
        className="menu-btn icon-btn"
        onClick={onMenu}
        aria-label="Open navigation menu"
      >
        <Menu size={21} />
      </button>

      <div>
        Workspace <span>/</span> <b>{page}</b>
      </div>

      <div className="top-actions">
        <label className="searchbox">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search anything..."
          />
        </label>

        <button
          className="icon-btn notification"
          title={
            hasPendingRequests
              ? "Pending blood requests"
              : "No pending requests"
          }
          aria-label="Notifications"
          onClick={onBell}
        >
          <Bell size={19} />
          {hasPendingRequests && <i />}
        </button>
      </div>
    </header>
  );
}
