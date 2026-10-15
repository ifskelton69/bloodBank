import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Droplet } from "lucide-react";
import { useAuth } from "./context/useAuth";
import useBloodBankData from "./hooks/useBloodBankData";
import { pagePath, pathToPage, quickAddType } from "./config/navConfig";

import Sidebar from "./components/navbar/Sidebar";
import Topbar from "./components/navbar/Topbar";
import PageHeading from "./components/navbar/PageHeading";
import Footer from "./components/navbar/Footer";
import Toast from "./components/common/Toast";
import Button from "./components/common/Button";
import RecordFormModal from "./components/forms/RecordFormModal";

import Dashboard from "./pages/Dashboard";
import Donors from "./pages/Donors";
import BloodInventory from "./pages/BloodInventory";
import BloodBanks from "./pages/BloodBanks";
import Hospitals from "./pages/Hospitals";
import BloodRequests from "./pages/BloodRequests";
import Reports from "./pages/Reports";
import AdminSettings from "./pages/AdminSettings";
import Login from "./pages/Login";

function App() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const location = useLocation();
  const routerNavigate = useNavigate();

  const page = pathToPage[location.pathname] || "Dashboard";

  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState("");
  const [form, setForm] = useState({});
  const [notice, setNotice] = useState("");

  const data = useBloodBankData();
  const {
    apiOnline,
    apiError,
    loading: dataLoading,
    donors,
    units,
    hospitals,
    requests,
    banks,
    totalUnits,
    pending,
    saveRecord,
    changeRequestStatus,
    saveUnit,
    changeTestingStatus,
    removeBloodUnit,
    removeHospital,
    refresh,
  } = data;

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 4000);
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

    // Frontend validation for blood units
    if (modal === "Blood unit") {
      const qty = parseInt(form.Quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        showNotice("Quantity must be a positive integer.");
        return;
      }
      if (form.Collection_Date && form.Expiration_Date && form.Expiration_Date < form.Collection_Date) {
        showNotice("Expiration date cannot be earlier than collection date.");
        return;
      }
    }

    const { ok, message } = await saveRecord(modal, form);
    if (ok) setModal("");
    showNotice(message);
  }

  // Authentication gating
  if (authLoading) {
    return (
      <div className="login-container">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <div className="login-logo animate-pulse">
            <Droplet size={28} fill="currentColor" />
          </div>
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
            Verifying administrator credentials...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderPage = () => {
    switch (page) {
      case "Dashboard":
        return (
          <Dashboard
            donors={donors}
            units={units}
            hospitals={hospitals}
            requests={requests}
            totalUnits={totalUnits}
            pending={pending}
            setPage={setPage}
            onAdd={openCreate}
          />
        );
      case "Donors":
        return <Donors donors={donors} search={search} onAdd={openCreate} />;
      case "Blood inventory":
        return (
          <BloodInventory
            units={units}
            search={search}
            onAdd={openCreate}
            onUpdateUnit={saveUnit}
            onTestingStatusChange={changeTestingStatus}
            onDeleteUnit={removeBloodUnit}
            showNotice={showNotice}
          />
        );
      case "Blood banks":
        return <BloodBanks banks={banks} search={search} onAdd={openCreate} />;
      case "Hospitals":
        return (
          <Hospitals
            hospitals={hospitals}
            search={search}
            onAdd={openCreate}
            onDeleteHospital={removeHospital}
            showNotice={showNotice}
          />
        );
      case "Blood requests":
        return (
          <BloodRequests
            requests={requests}
            search={search}
            onAdd={openCreate}
            onStatusChange={changeRequestStatus}
            showNotice={showNotice}
          />
        );
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
            loading={dataLoading}
            onRefresh={() => {
              refresh();
              showNotice("Data refreshed from MySQL database.");
            }}
            onQuickAdd={() => openCreate(quickAddType[page] || "Blood unit")}
          />

          {!apiOnline && apiError && (
            <div className="error-banner" role="alert">
              <div className="error-banner-content">
                <AlertCircle size={18} />
                <span>{apiError}</span>
              </div>
              <Button variant="secondary" onClick={refresh}>
                Retry Connection
              </Button>
            </div>
          )}

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