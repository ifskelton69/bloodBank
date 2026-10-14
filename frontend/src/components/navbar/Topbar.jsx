import { Bell, Menu, Search } from "lucide-react";

export default function Topbar({ page, search, onSearch, onMenu, onBell }) {
  return (
    <header className="topbar">
      <button className="menu-btn icon-btn" onClick={onMenu}>
        <Menu size={21} />
      </button>
      <div className="breadcrumb">
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
          <kbd>⌘ K</kbd>
        </label>
        <button className="icon-btn notification" title="Notifications" onClick={onBell}>
          <Bell size={19} />
          <i />
        </button>
        <div className="top-avatar">AD</div>
      </div>
    </header>
  );
}
