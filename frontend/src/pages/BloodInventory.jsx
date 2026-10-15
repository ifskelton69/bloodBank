import { useState } from "react";
import { Edit2, Plus, Search, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import Button from "../components/common/Button";
import Status from "../components/common/Status";
import Modal from "../components/common/Modal";
import { BLOOD_TYPES } from "../data/initialData";
import { filterRows, fmt } from "../utils/format";

export default function BloodInventory({
  units,
  search,
  onAdd,
  onUpdateUnit,
  onTestingStatusChange,
  onDeleteUnit,
  showNotice,
}) {
  const [editingUnit, setEditingUnit] = useState(null);
  const [deletingUnit, setDeletingUnit] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const filtered = filterRows(units, search);

  const openEdit = (unit) => {
    setFormError("");
    setEditingUnit({
      Unit_ID: unit.Unit_ID,
      Blood_Type: unit.Blood_Type,
      Quantity: unit.Quantity,
      Collection_Date: unit.Collection_Date,
      Expiration_Date: unit.Expiration_Date,
      Testing_Status: unit.Testing_Status || "Pending",
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const qty = parseInt(editingUnit.Quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setFormError("Quantity must be a positive integer (> 0).");
      return;
    }

    if (!editingUnit.Collection_Date || !editingUnit.Expiration_Date) {
      setFormError("Both collection date and expiration date are required.");
      return;
    }

    if (editingUnit.Expiration_Date < editingUnit.Collection_Date) {
      setFormError("Expiration date cannot be earlier than collection date.");
      return;
    }

    setSubmitting(true);
    const res = await onUpdateUnit(editingUnit.Unit_ID, {
      Blood_Type: editingUnit.Blood_Type,
      Quantity: qty,
      Collection_Date: editingUnit.Collection_Date,
      Expiration_Date: editingUnit.Expiration_Date,
      Testing_Status: editingUnit.Testing_Status,
    });
    setSubmitting(false);

    if (res.ok) {
      setEditingUnit(null);
      showNotice(res.message);
    } else {
      setFormError(res.message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUnit) return;
    setSubmitting(true);
    const res = await onDeleteUnit(deletingUnit.Unit_ID);
    setSubmitting(false);

    if (res.ok) {
      setDeletingUnit(null);
      showNotice(res.message);
    } else {
      showNotice(res.message);
    }
  };

  return (
    <div className="panel table-panel">
      <div className="panel-head">
        <div>
          <h3>Blood inventory</h3>
          <p>Track tested units, quantities, expiry dates, and manage stock lifecycle.</p>
        </div>
        <Button icon={Plus} onClick={() => onAdd("Blood unit")}>
          Add blood unit
        </Button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Blood Unit ID</th>
              <th>Blood Type</th>
              <th>Quantity</th>
              <th>Collection Date</th>
              <th>Expiry Date</th>
              <th>Testing Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const formattedId = String(u.Unit_ID).startsWith("BU-")
                ? u.Unit_ID
                : `BU-${String(u.Unit_ID).padStart(4, "0")}`;

              return (
                <tr key={u.Unit_ID}>
                  <td>
                    <b className="table-primary">{formattedId}</b>
                  </td>
                  <td>
                    <span className="blood-chip">{u.Blood_Type}</span>
                  </td>
                  <td>
                    <b>{u.Quantity}</b> unit{u.Quantity === 1 ? "" : "s"}
                  </td>
                  <td>{fmt(u.Collection_Date)}</td>
                  <td>{fmt(u.Expiration_Date)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Status value={u.Testing_Status} />
                      <select
                        className="status-dropdown text-xs py-1"
                        value={u.Testing_Status || "Pending"}
                        onChange={async (e) => {
                          const res = await onTestingStatusChange(u.Unit_ID, e.target.value);
                          showNotice(res.message);
                        }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Passed">Passed</option>
                        <option value="Failed">Failed</option>
                      </select>
                    </div>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="action-btn"
                        title="Edit blood unit"
                        onClick={() => openEdit(u)}
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                      <button
                        className="action-btn action-btn-danger"
                        title="Delete blood unit"
                        onClick={() => setDeletingUnit(u)}
                      >
                        <Trash2 size={13} /> Delete
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
            <b>No blood inventory records found</b>
            <span>Add a new blood unit to replenish the central inventory.</span>
          </div>
        )}
      </div>

      <div className="table-foot">
        Showing {filtered.length} unit{filtered.length === 1 ? "" : "s"}{" "}
        <span>Live connected to MySQL database</span>
      </div>

      {/* Edit Blood Unit Modal */}
      {editingUnit && (
        <Modal
          title={`Edit Blood Unit #${editingUnit.Unit_ID}`}
          onClose={() => setEditingUnit(null)}
        >
          <form onSubmit={handleEditSubmit} className="record-form">
            {formError && (
              <div className="login-error-alert mb-2">
                <AlertTriangle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <div className="form-row">
              <label>
                Blood type
                <select
                  required
                  value={editingUnit.Blood_Type}
                  onChange={(e) =>
                    setEditingUnit((prev) => ({ ...prev, Blood_Type: e.target.value }))
                  }
                >
                  {BLOOD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Quantity (units)
                <input
                  type="number"
                  min="1"
                  required
                  value={editingUnit.Quantity}
                  onChange={(e) =>
                    setEditingUnit((prev) => ({ ...prev, Quantity: e.target.value }))
                  }
                />
              </label>
            </div>

            <div className="form-row">
              <label>
                Collection date
                <input
                  type="date"
                  required
                  value={editingUnit.Collection_Date}
                  onChange={(e) =>
                    setEditingUnit((prev) => ({ ...prev, Collection_Date: e.target.value }))
                  }
                />
              </label>

              <label>
                Expiration date
                <input
                  type="date"
                  required
                  value={editingUnit.Expiration_Date}
                  onChange={(e) =>
                    setEditingUnit((prev) => ({ ...prev, Expiration_Date: e.target.value }))
                  }
                />
              </label>
            </div>

            <label>
              Testing status
              <select
                value={editingUnit.Testing_Status}
                onChange={(e) =>
                  setEditingUnit((prev) => ({ ...prev, Testing_Status: e.target.value }))
                }
              >
                <option value="Pending">Pending</option>
                <option value="Passed">Passed</option>
                <option value="Failed">Failed</option>
              </select>
            </label>

            <div className="modal-actions">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setEditingUnit(null)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" icon={CheckCircle2} disabled={submitting}>
                {submitting ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Blood Unit Confirmation Dialog */}
      {deletingUnit && (
        <Modal
          title="Confirm Blood Unit Deletion"
          onClose={() => setDeletingUnit(null)}
        >
          <div className="confirm-dialog">
            <p className="confirm-dialog-msg">
              Are you sure you want to delete Blood Unit <b>#{deletingUnit.Unit_ID}</b> (
              {deletingUnit.Blood_Type}, {deletingUnit.Quantity} units)?
            </p>
            <p className="confirm-dialog-note">
              This action will permanently delete this blood unit from MySQL inventory.
            </p>
            <div className="confirm-dialog-actions">
              <Button
                variant="secondary"
                onClick={() => setDeletingUnit(null)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                className="action-btn-danger"
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
