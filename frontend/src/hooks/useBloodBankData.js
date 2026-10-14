import { useCallback, useEffect, useState } from "react";
import {
  addBloodBank,
  addBloodUnit,
  addDonor,
  addHospital,
  addRequest,
  getBloodBanks,
  getBloodUnits,
  getDonors,
  getHospitals,
  getRequests,
} from "../services/api";
import {
  initialBanks,
  initialDonors,
  initialHospitals,
  initialRequests,
  initialUnits,
} from "../data/initialData";

const apiSavers = {
  Donor: addDonor,
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
        Name: form.Name,
        Blood_Type: form.Blood_Type,
        Contact_No: form.Contact_No,
        Address: form.Address || "Pune, Maharashtra",
        DOB: form.DOB || "2000-01-01",
        Gender: form.Gender || "Other",
        Eligibility_Status: form.Eligibility_Status || "Eligible",
      };
    case "Blood unit":
      return {
        Blood_Type: form.Blood_Type,
        Quantity: Number(form.Quantity || 450),
        Collection_Date: form.Collection_Date || today,
        Expiration_Date: form.Expiration_Date || today,
        Testing_Status: form.Testing_Status || "Passed",
        Bank_ID: Number(form.Bank_ID || 1),
      };
    case "Hospital":
      return {
        Name: form.Name,
        Address: form.Address || "Pune, Maharashtra",
        Contact_No: form.Contact_No || "",
      };
    case "Blood bank":
      return {
        Name: form.Name,
        Address: form.Address || "Pune, Maharashtra",
        Contact_No: form.Contact_No || "",
        Staff_Count: Number(form.Staff_Count || 0),
      };
    case "Blood request":
      return {
        Needed_Blood_Type: form.Needed_Blood_Type,
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
  const [donors, setDonors] = useState(initialDonors);
  const [units, setUnits] = useState(initialUnits);
  const [hospitals, setHospitals] = useState(initialHospitals);
  const [requests, setRequests] = useState(initialRequests);
  const [banks, setBanks] = useState(initialBanks);
  const [loading, setLoading] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        getDonors(),
        getBloodUnits(),
        getHospitals(),
        getRequests(),
        getBloodBanks(),
      ]);

      const setters = [setDonors, setUnits, setHospitals, setRequests, setBanks];
      let anyOk = false;

      results.forEach((res, i) => {
        if (res.status === "fulfilled" && Array.isArray(res.value?.data)) {
          setters[i](res.value.data);
          anyOk = true;
        }
      });

      setApiOnline(anyOk);
    } catch {
      setApiOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function init() {
      try {
        const results = await Promise.allSettled([
          getDonors(),
          getBloodUnits(),
          getHospitals(),
          getRequests(),
          getBloodBanks(),
        ]);

        if (ignore) return;
        const setters = [setDonors, setUnits, setHospitals, setRequests, setBanks];
        let anyOk = false;

        results.forEach((res, i) => {
          if (res.status === "fulfilled" && Array.isArray(res.value?.data)) {
            setters[i](res.value.data);
            anyOk = true;
          }
        });

        setApiOnline(anyOk);
      } catch {
        if (!ignore) setApiOnline(false);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    init();

    return () => {
      ignore = true;
    };
  }, []);

  const totalUnits = units.reduce((s, u) => s + Number(u.Quantity || 0), 0);
  const pending = requests.filter(
    (r) => String(r.Status).toLowerCase() === "pending"
  ).length;

  const setters = {
    Donor: setDonors,
    "Blood unit": setUnits,
    Hospital: setHospitals,
    "Blood request": setRequests,
    "Blood bank": setBanks,
  };

  async function saveRecord(type, form) {
    const record = buildRecord(type, form);
    const saver = apiSavers[type];

    try {
      if (apiOnline && saver) {
        const response = await saver(record);
        await loadAll();
        const msg = response?.data?.message || `${type} saved successfully to database.`;
        return { ok: true, message: msg };
      }

      // Offline fallback
      setters[type]?.((list) => [
        { ...record, [`${type.replace(" ", "_")}_ID`]: Date.now() },
        ...list,
      ]);
      return {
        ok: true,
        message: `${type} saved locally. Connect API to sync with MySQL.`,
      };
    } catch (err) {
      const data = err.response?.data;
      const detail = data?.fields ? `: ${data.fields.join(", ")}` : "";
      return {
        ok: false,
        message: data?.error
          ? `${data.error}${detail}`
          : "Could not save to API. Please check your network or server.",
      };
    }
  }

  return {
    apiOnline,
    loading,
    donors,
    units,
    hospitals,
    requests,
    banks,
    totalUnits,
    pending,
    saveRecord,
    refresh: loadAll,
  };
}