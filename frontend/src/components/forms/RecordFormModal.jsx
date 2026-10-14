import { CheckCircle2 } from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { BLOOD_TYPES } from "../../data/initialData";

const titles = {
  Donor: "Register a donor",
  "Blood unit": "Add blood unit",
  Hospital: "Add hospital",
  "Blood bank": "Add blood bank",
  "Blood request": "Create hospital request",
};

function BloodTypeSelect({ label, value, onChange }) {
  return (
    <label>
      {label}
      <select required value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select type</option>
        {BLOOD_TYPES.map((t) => <option key={t}>{t}</option>)}
      </select>
    </label>
  );
}

export default function RecordFormModal({ type, form, setField, onSubmit, onClose }) {
  const text = (key, label, props = {}) => (
    <label>
      {label}
      <input value={form[key] || ""} onChange={(e) => setField(key, e.target.value)} {...props} />
    </label>
  );

  return (
    <Modal title={titles[type] || `Add ${type}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="record-form">
        {type === "Donor" && (
          <>
            {text("Name", "Full name", { required: true, placeholder: "e.g. Priya Sharma" })}
            {text("Address", "Address", { required: true, placeholder: "Street, city" })}
            <div className="form-row">
              <BloodTypeSelect label="Blood type" value={form.Blood_Type} onChange={(v) => setField("Blood_Type", v)} />
              <label>
                Gender
                <select required value={form.Gender || ""} onChange={(e) => setField("Gender", e.target.value)}>
                  <option value="">Select</option>
                  {["Female", "Male", "Other"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
            </div>
            <div className="form-row">
              {text("Contact_No", "Contact number", { required: true, placeholder: "Phone number" })}
              {text("DOB", "Date of birth", { type: "date", required: true })}
            </div>
            <label>
              Eligibility status
              <select
                value={form.Eligibility_Status || "Eligible"}
                onChange={(e) => setField("Eligibility_Status", e.target.value)}
              >
                <option>Eligible</option>
                <option>Pending</option>
                <option>Ineligible</option>
              </select>
            </label>
          </>
        )}

        {type === "Blood unit" && (
          <>
            <div className="form-row">
              {text("Unit_ID", "Unit ID", { placeholder: "Auto-generated if blank" })}
              <BloodTypeSelect label="Blood type" value={form.Blood_Type} onChange={(v) => setField("Blood_Type", v)} />
            </div>
            <div className="form-row">
              {text("Quantity", "Quantity (units)", { type: "number", min: "1", required: true })}
              <label>
                Bank ID
                <input type="number" value={form.Bank_ID || 1} onChange={(e) => setField("Bank_ID", e.target.value)} />
              </label>
            </div>
            <div className="form-row">
              {text("Collection_Date", "Collection date", { type: "date", required: true })}
              {text("Expiration_Date", "Expiration date", { type: "date", required: true })}
            </div>
            <label>
              Testing status
              <select
                value={form.Testing_Status || "Pending"}
                onChange={(e) => setField("Testing_Status", e.target.value)}
              >
                <option>Pending</option>
                <option>Passed</option>
                <option>Failed</option>
              </select>
            </label>
          </>
        )}

        {type === "Hospital" && (
          <>
            {text("Name", "Hospital name", { required: true, placeholder: "Hospital name" })}
            {text("Address", "Address", { required: true, placeholder: "Street, city" })}
            {text("Contact_No", "Contact number", { placeholder: "Phone number" })}
          </>
        )}

        {type === "Blood bank" && (
          <>
            {text("Name", "Blood bank name", { required: true, placeholder: "Blood bank name" })}
            {text("Address", "Address", { required: true, placeholder: "Street, city" })}
            <div className="form-row">
              {text("Contact_No", "Contact number")}
              {text("Staff_Count", "Staff count", { type: "number", min: "0" })}
            </div>
          </>
        )}

        {type === "Blood request" && (
          <>
            <div className="form-row">
              <BloodTypeSelect
                label="Blood type needed"
                value={form.Needed_Blood_Type}
                onChange={(v) => setField("Needed_Blood_Type", v)}
              />
              {text("Qty_Requested", "Quantity", { type: "number", min: "1", required: true })}
            </div>
            <div className="form-row">
              <label>
                Hospital ID
                <input type="number" value={form.Hospital_ID || 1} onChange={(e) => setField("Hospital_ID", e.target.value)} />
              </label>
              <label>
                Urgency
                <select
                  value={form.Urgency_Level || "Medium"}
                  onChange={(e) => setField("Urgency_Level", e.target.value)}
                >
                  <option>Critical</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </label>
            </div>
          </>
        )}

        <div className="modal-actions">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" icon={CheckCircle2}>Save record</Button>
        </div>
      </form>
    </Modal>
  );
}