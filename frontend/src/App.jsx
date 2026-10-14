import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useBloodBankData from "./hooks/useBloodBankData";
import { pagePath, pathToPage, quickAddType } from "./config/navConfig";

import Sidebar from "./components/navbar/Sidebar";
import Topbar from "./components/navbar/Topbar";
import PageHeading from "./components/navbar/PageHeading";
import Footer from "./components/navbar/Footer";
import Toast from "./components/common/Toast";
import RecordFormModal from "./components/forms/RecordFormModal";

import Dashboard from "./pages/Dashboard";
import Donors from "./pages/Donors";
import BloodInventory from "./pages/BloodInventory";
import BloodBanks from "./pages/BloodBanks";
import Hospitals from "./pages/Hospitals";
import BloodRequests from "./pages/BloodRequests";
import Donations from "./pages/Donations";
import Storage from "./pages/Storage";
import Reports from "./pages/Reports";
import AdminSettings from "./pages/AdminSettings";

function App() {
  const location = useLocation();
  const routerNavigate = useNavigate();

  const page = pathToPage[location.pathname] || "Dashboard";

  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState("");
  const [form, setForm] = useState({});
  const [notice, setNotice] = useState("");

  const data = useBloodBankData();
  const { apiOnline, donors, units, hospitals, requests, banks, totalUnits, pending, saveRecord, refresh } = data;

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3500);
  };

  const navigate = (label) => {
    const targetPath = pagePath[label] || "/";
    routerNavigate(targetPath);
    setSearch("");
    setMobileNav(false);
  };

  const setPage = (label) => {
    const targetPath = pagePath[label] || "/";
    routerNavigate(targetPath);
    setSearch("");
  };

  const openCreate = (type) => {
    setForm({});
    setModal(type);
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave(e) {
    e.preventDefault();
    const { ok, message } = await saveRecord(modal, form);
    if (ok) setModal("");
    showNotice(message);
  }

  const renderPage = () => {
    switch (page) {
      case "Dashboard":
        return (
          <Dashboard
            donors={donors} units={units} hospitals={hospitals} requests={requests}
            totalUnits={totalUnits} pending={pending}
            setPage={setPage} onAdd={openCreate}
          />
        );
      case "Donors":
        return <Donors donors={donors} search={search} onAdd={openCreate} />;
      case "Blood inventory":
        return <BloodInventory units={units} search={search} onAdd={openCreate} />;
      case "Blood banks":
        return <BloodBanks banks={banks} search={search} onAdd={openCreate} />;
      case "Hospitals":
        return <Hospitals hospitals={hospitals} search={search} onAdd={openCreate} />;
      case "Blood requests":
        return <BloodRequests requests={requests} search={search} onAdd={openCreate} />;
      case "Donations":
        return <Donations units={units} search={search} onAdd={openCreate} />;
      case "Storage":
        return <Storage units={units} search={search} onAdd={openCreate} />;
      case "Reports":
        return <Reports setPage={setPage} showNotice={showNotice} />;
      default:
        return <AdminSettings apiOnline={apiOnline} />;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        onNavigate={navigate}
        open={mobileNav}
        onClose={() => setMobileNav(false)}
        pending={pending}
      />

      <main className="main">
        <Topbar
          page={page}
          search={search}
          onSearch={setSearch}
          onMenu={() => setMobileNav(true)}
          onBell={() => showNotice(`${pending} hospital request(s) pending.`)}
        />
        <div className="content">
          <PageHeading
            page={page}
            apiOnline={apiOnline}
            onRefresh={() => {
              refresh();
              showNotice("Dashboard refreshed from MySQL database.");
            }}
            onQuickAdd={() => openCreate(quickAddType[page] || "Blood unit")}
          />
          {renderPage()}
          <Footer />
        </div>
      </main>

      {modal && (
        <RecordFormModal
          type={modal}
          form={form}
          setField={setField}
          onSubmit={handleSave}
          onClose={() => setModal("")}
        />
      )}
      <Toast message={notice} onClose={() => setNotice("")} />
    </div>
  );
}

export default App;