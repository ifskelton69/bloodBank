import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Droplet,
  History,
  Plus,
  Search,
} from "lucide-react";
import Button from "../components/common/Button";
import Status from "../components/common/Status";
import Modal from "../components/common/Modal";
import { filterRows, fmt } from "../utils/format";

export default function Donors({
  donors = [],
  banks = [],
  search = "",
  onAdd,
  onRecordDonation,
  getDonorHistory,
  showNotice,
}) {
  const [selectedDonorForDonation, setSelectedDonorForDonation] = useState(null);
  const [historyDonor, setHistoryDonor] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Donation form state
  const [donationForm, setDonationForm] = useState({
    Quantity: 450,
    Collection_Date: new Date().toISOString().slice(0, 10),
    Donation_Type: "Whole Blood",
    Bank_ID: 1,
  });
  const [donationSubmitting, setDonationSubmitting] = useState(false);
  const [donationError, setDonationError] = useState("");

  const filtered = filterRows(donors, search);

  const openRecordDonationModal = (donor = null) => {
    setDonationError("");
    const targetDonor = donor || donors[0];
    setSelectedDonorForDonation(targetDonor);
    setDonationForm({
      Donor_ID: targetDonor ? targetDonor.Donor_ID : "",
      Quantity: 450,
      Collection_Date: new Date().toISOString().slice(0, 10),
      Donation_Type: "Whole Blood",
      Bank_ID: banks[0]?.Bank_ID || 1,
    });
  };

  const handleDonationSubmit = async (e) => {
    e.preventDefault();
    setDonationError("");

    if (!selectedDonorForDonation) {
      setDonationError("Please select a donor.");
      return;
    }

    const donorStatus = String(selectedDonorForDonation.Eligibility_Status || "").toLowerCase();
    if (donorStatus === "ineligible" || donorStatus === "not eligible") {
      setDonationError(
        `Cannot record donation: ${selectedDonorForDonation.Name} is currently marked as ${selectedDonorForDonation.Eligibility_Status}.`
      );
      return;
    }

    const qty = parseInt(donationForm.Quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setDonationError("Donation quantity must be a positive number (> 0 ml).");
      return;
    }

    setDonationSubmitting(true);
    const payload = {
      Donor_ID: selectedDonorForDonation.Donor_ID,
      Quantity: qty,
      Collection_Date: donationForm.Collection_Date,
      Donation_Type: donationForm.Donation_Type,
      Bank_ID: Number(donationForm.Bank_ID || 1),
    };

    const res = await onRecordDonation(payload);
    setDonationSubmitting(false);

    if (res.ok) {
      setSelectedDonorForDonation(null);
      showNotice(res.message);
    } else {
      setDonationError(res.message);
    }
  };

  const openHistoryModal = async (donor) => {
    setHistoryDonor(donor);
    setHistoryList([]);
    setHistoryLoading(true);

    try {
      if (getDonorHistory) {
        const response = await getDonorHistory(donor.Donor_ID);
        if (response.data?.history) {
          setHistoryList(response.data.history);
        }
      }
    } catch (err) {
      console.error("Failed to load donor history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="panel table-panel">
      <div className="panel-head">
        <div>
          <h3>Registered donors</h3>
          <p>Manage donor profiles, track lifetime donations, and record blood units.</p>
        </div>
        <div className="heading-actions" style={{ display: "flex", gap: "8px" }}>
          <Button icon={Plus} onClick={() => onAdd("Donor")}>
            Add donor
          </Button>
          <Button
            variant="secondary"
            icon={Droplet}
            onClick={() => openRecordDonationModal()}
            disabled={donors.length === 0}
          >
            Record donation
          </Button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Donor ID</th>
              <th>Full name</th>
              <th>Blood type</th>
              <th>Contact</th>
              <th>Eligibility</th>
              <th>Total donations</th>
              <th>Total donated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => {
              const formattedId = String(d.Donor_ID).startsWith("D-")
                ? d.Donor_ID
                : `D-${String(d.Donor_ID).padStart(4, "0")}`;

              const isIneligible =
                String(d.Eligibility_Status).toLowerCase() === "ineligible" ||
                String(d.Eligibility_Status).toLowerCase() === "not eligible";

              return (
                <tr key={d.Donor_ID}>
                  <td>
                    <b className="table-primary">{formattedId}</b>
                  </td>
                  <td>
                    <b>{d.Name}</b>
                    {d.Address && (
                      <span className="text-xs text-muted block">{d.Address}</span>
                    )}
                  </td>
                  <td>
                    <span className="blood-chip">{d.Blood_Type}</span>
                  </td>
                  <td>{d.Contact_No || "Not Provided"}</td>
                  <td>
                    <Status value={d.Eligibility_Status} />
                  </td>
                  <td>
                    <b>{d.Total_Donations || 0}</b> donation
                    {d.Total_Donations === 1 ? "" : "s"}
                  </td>
                  <td>
                    <b>{d.Total_Quantity_Donated || 0}</b> ml
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="action-btn"
                        title={
                          isIneligible
                            ? "Donor is marked as ineligible"
                            : "Record a new blood donation"
                        }
                        onClick={() => openRecordDonationModal(d)}
                        style={{
                          color: isIneligible ? "var(--text-muted)" : "var(--primary)",
                        }}
                      >
                        <Droplet size={13} /> Donate
                      </button>
                      <button
                        className="action-btn"
                        title="View donation history"
                        onClick={() => openHistoryModal(d)}
                      >
                        <History size={13} /> History
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="empty">
            <Search size={24} />
            <b>No donor records found</b>
            <span>Try searching by name, blood type, or contact number.</span>
          </div>
        )}
      </div>

      <div className="table-foot">
        Showing {filtered.length} donor{filtered.length === 1 ? "" : "s"}{" "}
        <span>Live connected to MySQL database</span>
      </div>

      {/* Record Blood Donation Modal */}
      {selectedDonorForDonation && (
        <Modal
          title={`Record Blood Donation`}
          onClose={() => setSelectedDonorForDonation(null)}
        >
          <form onSubmit={handleDonationSubmit} className="record-form">
            {donationError && (
              <div className="login-error-alert mb-2">
                <AlertTriangle size={16} />
                <span>{donationError}</span>
              </div>
            )}

            {/* Donor selection & details */}
            <label>
              Select donor
              <select
                required
                value={selectedDonorForDonation.Donor_ID}
                onChange={(e) => {
                  const found = donors.find(
                    (d) => String(d.Donor_ID) === String(e.target.value)
                  );
                  if (found) setSelectedDonorForDonation(found);
                }}
              >
                {donors.map((d) => (
                  <option key={d.Donor_ID} value={d.Donor_ID}>
                    {d.Name} ({d.Blood_Type}) - {d.Eligibility_Status}
                  </option>
                ))}
              </select>
            </label>

            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
                padding: "8px 12px",
                backgroundColor: "var(--bg-subtle)",
                borderRadius: "var(--radius-sm)",
                marginBottom: "12px",
              }}
            >
              <div>
                <span className="text-xs text-muted block">Blood group:</span>
                <span className="blood-chip">{selectedDonorForDonation.Blood_Type}</span>
              </div>
              <div>
                <span className="text-xs text-muted block">Status:</span>
                <Status value={selectedDonorForDonation.Eligibility_Status} />
              </div>
              <div>
                <span className="text-xs text-muted block">Past donations:</span>
                <b>{selectedDonorForDonation.Total_Donations || 0} times</b> (
                {selectedDonorForDonation.Total_Quantity_Donated || 0} ml)
              </div>
            </div>

            <div className="form-row">
              <label>
                Quantity (ml)
                <input
                  type="number"
                  min="50"
                  max="1000"
                  required
                  value={donationForm.Quantity}
                  onChange={(e) =>
                    setDonationForm((prev) => ({ ...prev, Quantity: e.target.value }))
                  }
                />
              </label>

              <label>
                Donation type
                <select
                  value={donationForm.Donation_Type}
                  onChange={(e) =>
                    setDonationForm((prev) => ({
                      ...prev,
                      Donation_Type: e.target.value,
                    }))
                  }
                >
                  <option value="Whole Blood">Whole Blood</option>
                  <option value="Plasma">Plasma</option>
                  <option value="Platelets">Platelets</option>
                </select>
              </label>
            </div>

            <div className="form-row">
              <label>
                Donation date
                <input
                  type="date"
                  required
                  value={donationForm.Collection_Date}
                  onChange={(e) =>
                    setDonationForm((prev) => ({
                      ...prev,
                      Collection_Date: e.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Blood bank
                <select
                  value={donationForm.Bank_ID}
                  onChange={(e) =>
                    setDonationForm((prev) => ({
                      ...prev,
                      Bank_ID: Number(e.target.value),
                    }))
                  }
                >
                  {banks.map((b) => (
                    <option key={b.Bank_ID} value={b.Bank_ID}>
                      {b.Name}
                    </option>
                  ))}
                  {banks.length === 0 && <option value={1}>Central Blood Bank</option>}
                </select>
              </label>
            </div>

            <p
              className="text-xs text-muted"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                margin: "4px 0 12px",
              }}
            >
              <Clock size={14} />
              Donation will be recorded with <b>Pending</b> testing status. It will remain
              unavailable in usable stock until testing is Passed.
            </p>

            <div className="modal-actions">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setSelectedDonorForDonation(null)}
                disabled={donationSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" icon={CheckCircle2} disabled={donationSubmitting}>
                {donationSubmitting ? "Recording..." : "Record donation"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Donation History Modal */}
      {historyDonor && (
        <Modal
          title={`Donation History - ${historyDonor.Name}`}
          onClose={() => setHistoryDonor(null)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "10px",
                padding: "12px",
                backgroundColor: "var(--bg-subtle)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <div>
                <span className="text-xs text-muted block">Blood Group</span>
                <span className="blood-chip">{historyDonor.Blood_Type}</span>
              </div>
              <div>
                <span className="text-xs text-muted block">Eligibility</span>
                <Status value={historyDonor.Eligibility_Status} />
              </div>
              <div>
                <span className="text-xs text-muted block">Total Donations</span>
                <b style={{ fontSize: "16px" }}>{historyDonor.Total_Donations || 0}</b>
              </div>
              <div>
                <span className="text-xs text-muted block">Total Quantity</span>
                <b style={{ fontSize: "16px" }}>
                  {historyDonor.Total_Quantity_Donated || 0} ml
                </b>
              </div>
            </div>

            {historyLoading ? (
              <div style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
                Loading donation history...
              </div>
            ) : historyList.length === 0 ? (
              <div className="empty" style={{ padding: "24px 0" }}>
                <Clock size={24} />
                <b>No donations recorded yet</b>
                <span>Click "Donate" on this donor to record their first donation.</span>
              </div>
            ) : (
              <div className="table-wrap" style={{ maxHeight: "300px", overflowY: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Unit ID</th>
                      <th>Date</th>
                      <th>Quantity</th>
                      <th>Type</th>
                      <th>Testing Status</th>
                      <th>Inventory Usability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyList.map((h, idx) => {
                      const isPassed = h.Testing_Status === "Passed";
                      const isFailed = h.Testing_Status === "Failed";
                      return (
                        <tr key={h.Unit_ID || idx}>
                          <td>
                            <b className="table-primary">
                              BU-{String(h.Unit_ID).padStart(4, "0")}
                            </b>
                          </td>
                          <td>{fmt(h.Collection_Date)}</td>
                          <td>
                            <b>{h.Quantity}</b> ml
                          </td>
                          <td>{h.Donation_Type || "Whole Blood"}</td>
                          <td>
                            <Status value={h.Testing_Status} />
                          </td>
                          <td>
                            {isPassed ? (
                              <span
                                style={{
                                  fontSize: "11.5px",
                                  fontWeight: 600,
                                  color: "#16A34A",
                                }}
                              >
                                ✓ In usable inventory
                              </span>
                            ) : isFailed ? (
                              <span
                                style={{
                                  fontSize: "11.5px",
                                  fontWeight: 600,
                                  color: "#DC2626",
                                }}
                              >
                                ✗ Excluded / Failed
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: "11.5px",
                                  fontWeight: 600,
                                  color: "#64748B",
                                }}
                              >
                                ◷ Pending verification
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: "8px" }}>
              <Button variant="secondary" onClick={() => setHistoryDonor(null)}>
                Close
              </Button>
              <Button
                icon={Droplet}
                onClick={() => {
                  const donorToDonate = historyDonor;
                  setHistoryDonor(null);
                  openRecordDonationModal(donorToDonate);
                }}
              >
                Record new donation
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
