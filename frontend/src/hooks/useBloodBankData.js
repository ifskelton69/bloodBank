import { useCallback, useEffect, useState } from "react";
import {
  addBloodBank,
  addBloodUnit,
  addDonor,
  addHospital,
  addRequest,
  deleteBloodUnit,
  deleteHospital,
  getBloodBanks,
  getBloodUnits,
  getDonors,
  getDonorHistory,
  getDonations,
  getHospitals,
  getRequests,
  recordDonation,
  updateBloodUnit,
  updateRequestStatus,
  updateUnitTestingStatus,
} from "../services/api";

const apiSavers = {
  Donor: addDonor,
  Donation: recordDonation,
  "Blood unit": addBloodUnit,
  Hospital: addHospital,
  "Blood bank": addBloodBank,
  "Blood request": addRequest,
};

function buildRecord(type, form) {
  const today = new Date().toISOString().slice(0, 10);
  switch (type) {
    case "Donor":
      return {
        Name: form.Name?.trim(),
        Blood_Type: form.Blood_Type?.trim()?.toUpperCase(),
        Contact_No: form.Contact_No?.trim(),
        Address: form.Address?.trim() || "Not Provided",
        DOB: form.DOB || "2000-01-01",
        Gender: form.Gender || "Other",
        Eligibility_Status: form.Eligibility_Status || "Eligible",
      };
    case "Donation":
      return {
        Donor_ID: Number(form.Donor_ID),
        Quantity: Number(form.Quantity || 450),
        Collection_Date: form.Collection_Date || today,
        Donation_Type: form.Donation_Type || "Whole Blood",
        Bank_ID: Number(form.Bank_ID || 1),
      };
    case "Blood unit":
      return {
        Blood_Type: form.Blood_Type?.trim()?.toUpperCase(),
        Quantity: Number(form.Quantity || 450),
        Collection_Date: form.Collection_Date || today,
        Expiration_Date: form.Expiration_Date || today,
        Testing_Status: form.Testing_Status || "Pending",
        Bank_ID: Number(form.Bank_ID || 1),
      };
    case "Hospital":
      return {
        Name: form.Name?.trim(),
        Address: form.Address?.trim() || "Pune, Maharashtra",
        Contact_No: form.Contact_No?.trim() || "",
      };
    case "Blood bank":
      return {
        Name: form.Name?.trim(),
        Address: form.Address?.trim() || "Pune, Maharashtra",
        Contact_No: form.Contact_No?.trim() || "",
        Staff_Count: Number(form.Staff_Count || 0),
      };
    case "Blood request":
      return {
        Needed_Blood_Type: form.Needed_Blood_Type?.trim()?.toUpperCase(),
        Qty_Requested: Number(form.Qty_Requested || 1),
        Urgency_Level: form.Urgency_Level || "Normal",
        Hospital_ID: Number(form.Hospital_ID || 1),
      };
    default:
      return { ...form };
  }
}

export default function useBloodBankData() {
  const [apiOnline, setApiOnline] = useState(false);
  const [apiError, setApiError] = useState("");
  const [donors, setDonors] = useState([]);
  const [units, setUnits] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [requests, setRequests] = useState([]);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setApiError("");
    try {
      const results = await Promise.all([
        getDonors(),
        getBloodUnits(),
        getHospitals(),
        getRequests(),
        getBloodBanks(),
      ]);

      setDonors(Array.isArray(results[0]?.data) ? results[0].data : []);
      setUnits(Array.isArray(results[1]?.data) ? results[1].data : []);
      setHospitals(Array.isArray(results[2]?.data) ? results[2].data : []);
      setRequests(Array.isArray(results[3]?.data) ? results[3].data : []);
      setBanks(Array.isArray(results[4]?.data) ? results[4].data : []);

      setApiOnline(true);
    } catch (err) {
      console.error("Failed to load data from MySQL:", err);
      setApiOnline(false);
      setApiError(
        err.response?.data?.error ||
        "Could not connect to the VitalDrop backend. Please verify that the Flask server is running on http://localhost:5000."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function initData() {
      try {
        const results = await Promise.all([
          getDonors(),
          getBloodUnits(),
          getHospitals(),
          getRequests(),
          getBloodBanks(),
        ]);

        if (!ignore) {
          setDonors(Array.isArray(results[0]?.data) ? results[0].data : []);
          setUnits(Array.isArray(results[1]?.data) ? results[1].data : []);
          setHospitals(Array.isArray(results[2]?.data) ? results[2].data : []);
          setRequests(Array.isArray(results[3]?.data) ? results[3].data : []);
          setBanks(Array.isArray(results[4]?.data) ? results[4].data : []);
          setApiOnline(true);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Failed to load data from MySQL:", err);
          setApiOnline(false);
          setApiError(
            err.response?.data?.error ||
            "Could not connect to the VitalDrop backend. Please verify that the Flask server is running on http://localhost:5000."
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    initData();

    return () => {
      ignore = true;
    };
  }, []);

  // Calculate usable inventory: only non-expired, Passed testing status with positive quantity
  const totalUnits = units
    .filter(
      (u) =>
        String(u.Testing_Status).toLowerCase() === "passed" &&
        (!u.Expiration_Date || new Date(u.Expiration_Date) >= new Date().setHours(0, 0, 0, 0)) &&
        Number(u.Quantity || 0) > 0
    )
    .reduce((s, u) => s + Number(u.Quantity || 0), 0);
  const pending = requests.filter(
    (r) => String(r.Status).toLowerCase() === "pending"
  ).length;

  // Record a blood donation
  const recordDonorDonation = async (donationData) => {
    try {
      const res = await recordDonation(donationData);
      await loadAll();
      return {
        ok: true,
        message: res.data?.message || "Donation recorded successfully.",
        data: res.data,
      };
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to record donation.";
      return { ok: false, message: msg };
    }
  };

  // Change request status (Pending, Approved, Rejected)
  const changeRequestStatus = async (requestId, status) => {
    try {
      const res = await updateRequestStatus(requestId, status);
      // Refresh requests and units (approval deducts stock)
      await loadAll();
      return {
        ok: true,
        message: res.data?.message || `Request #${requestId} status set to ${status}.`,
      };
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to update request status.";
      return { ok: false, message: msg };
    }
  };

  // Edit blood unit
  const saveUnit = async (unitId, unitData) => {
    try {
      const res = await updateBloodUnit(unitId, unitData);
      await loadAll();
      return {
        ok: true,
        message: res.data?.message || `Blood unit #${unitId} updated successfully.`,
      };
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to update blood unit.";
      return { ok: false, message: msg };
    }
  };

  // Change blood unit testing status
  const changeTestingStatus = async (unitId, status) => {
    try {
      const res = await updateUnitTestingStatus(unitId, status);
      await loadAll();
      return {
        ok: true,
        message: res.data?.message || `Testing status updated to ${status}.`,
      };
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to update testing status.";
      return { ok: false, message: msg };
    }
  };

  // Delete blood unit
  const removeBloodUnit = async (unitId) => {
    try {
      const res = await deleteBloodUnit(unitId);
      await loadAll();
      return {
        ok: true,
        message: res.data?.message || `Blood unit #${unitId} deleted successfully.`,
      };
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to delete blood unit.";
      return { ok: false, message: msg };
    }
  };

  // Delete hospital
  const removeHospital = async (hospitalId) => {
    try {
      const res = await deleteHospital(hospitalId);
      await loadAll();
      return {
        ok: true,
        message: res.data?.message || `Hospital #${hospitalId} deleted successfully.`,
      };
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to delete hospital.";
      return { ok: false, message: msg };
    }
  };

  // Save new record
  const saveRecord = async (type, form) => {
    const record = buildRecord(type, form);
    const saver = apiSavers[type];

    if (!saver) {
      return { ok: false, message: `Unknown record type: ${type}` };
    }

    try {
      const response = await saver(record);
      await loadAll();
      const msg = response?.data?.message || `${type} created successfully in database.`;
      return { ok: true, message: msg };
    } catch (err) {
      const data = err.response?.data;
      const detail = data?.fields ? `: ${data.fields.join(", ")}` : "";
      return {
        ok: false,
        message: data?.error
          ? `${data.error}${detail}`
          : "Could not save record to database. Please check connection.",
      };
    }
  };

  return {
    apiOnline,
    apiError,
    loading,
    donors,
    units,
    hospitals,
    requests,
    banks,
    totalUnits,
    pending,
    saveRecord,
    recordDonorDonation,
    getDonorHistory,
    getDonations,
    changeRequestStatus,
    saveUnit,
    changeTestingStatus,
    removeBloodUnit,
    removeHospital,
    refresh: loadAll,
  };
}