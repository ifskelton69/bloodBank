import { useState } from "react";
import { AlertCircle, AlertTriangle, Hospital as HospitalIcon, Plus, Search, Trash2 } from "lucide-react";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import { filterRows, fmt } from "../utils/format";

export default function Hospitals({ hospitals, search, onAdd, onDeleteHospital, showNotice }) {
  const [deletingHospital, setDeletingHospital] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const filtered = filterRows(hospitals, search);

  const openDeleteDialog = (hospital) => {
    setDeleteError("");
    setDeletingHospital(hospital);
  };

  const handleConfirmDelete = async () => {
    if (!deletingHospital) return;
    setSubmitting(true);
    setDeleteError("");

    const res = await onDeleteHospital(deletingHospital.Hospital_ID);
    setSubmitting(false);

    if (res.ok) {
      setDeletingHospital(null);
      showNotice(res.message);
    } else {
      setDeleteError(res.message);
      showNotice(res.message);
    }
  };

  return (
    <div className="panel table-panel">
      <div className="panel-head">
        <div>
          <h3>Hospital management</h3>
          <p>Registered partner hospitals, clinical contacts, and network access.</p>
        </div>
        <Button icon={Plus} onClick={() => onAdd("Hospital")}>
          Add hospital
        </Button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Hospital ID</th>
              <th>Hospital name</th>
              <th>Address</th>
              <th>Contact number</th>
              <th>Associated requests</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((h) => {
              const formattedId = `HOSP-${String(h.Hospital_ID).padStart(3, "0")}`;
              const reqCount = Number(h.Request_Count || 0);

              return (
                <tr key={h.Hospital_ID}>
                  <td>
                    <b className="table-primary">{formattedId}</b>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <HospitalIcon size={16} className="text-muted" />
                      <b>{h.Name}</b>
                    </div>
                  </td>
                  <td>{fmt(h.Address)}</td>
                  <td>{fmt(h.Contact_No)}</td>
                  <td>
                    <span className="blood-chip">
                      {reqCount} request{reqCount === 1 ? "" : "s"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="action-btn action-btn-danger"
                      title="Delete hospital"
                      onClick={() => openDeleteDialog(h)}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="empty">
            <Search size={24} />
            <b>No hospitals found</b>
            <span>Register a new partner hospital to start receiving blood supply requests.</span>
          </div>
        )}
      </div>

      <div className="table-foot">
        Showing {filtered.length} hospital{filtered.length === 1 ? "" : "s"}{" "}
        <span>Live connected to MySQL database</span>
      </div>

      {/* Mandatory Hospital Deletion Confirmation Modal */}
      {deletingHospital && (
        <Modal
          title="Confirm Hospital Deletion"
          onClose={() => !submitting && setDeletingHospital(null)}
        >
          <div className="confirm-dialog">
            {deleteError && (
              <div className="login-error-alert" role="alert">
                <AlertCircle size={16} />
                <span>{deleteError}</span>
              </div>
            )}

            <p className="confirm-dialog-msg">
              Are you sure you want to delete <b>{deletingHospital.Name}</b>?
            </p>

            <div className="confirm-dialog-note">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <span>
                  Hospitals with existing blood requests cannot be deleted to safeguard
                  clinical audit and request history records.
                </span>
              </div>
            </div>

            <div className="confirm-dialog-actions">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setDeletingHospital(null)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                className="action-btn-danger"
                type="button"
                onClick={handleConfirmDelete}
                disabled={submitting}
              >
                {submitting ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
