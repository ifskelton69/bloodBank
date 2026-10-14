import axios from "./axios";

// GET: Fetch all donors
export const getDonors = () => {
  return axios.get("/donors");
};

// POST: Register a new donor
export const addDonor = (data) => {
  return axios.post("/newdonor", data);
};

// GET: Fetch blood inventory
export const getBloodUnits = () => {
  return axios.get("/blood-units");
};

// POST: Add new blood unit
export const addBloodUnit = (data) => {
  return axios.post("/newunit", data);
};
export const addUnit = addBloodUnit;

// GET: Fetch all hospitals
export const getHospitals = () => {
  return axios.get("/hospitals");
};

// POST: Add new hospital
export const addHospital = (data) => {
  return axios.post("/newhospital", data);
};

// GET: Fetch all blood banks
export const getBloodBanks = () => {
  return axios.get("/blood-banks");
};
export const getBanks = getBloodBanks;

// POST: Add new blood bank
export const addBloodBank = (data) => {
  return axios.post("/newbank", data);
};
export const addBank = addBloodBank;

// GET: Fetch all blood requests
export const getRequests = () => {
  return axios.get("/requests");
};

// POST: Create a new blood request
export const addRequest = (data) => {
  return axios.post("/newrequest", data);
};

// GET: Blood stock report (grouped by blood type, verified passed and unexpired)
export const getBloodStockReport = () => {
  return axios.get("/reports/blood-stock");
};

// GET: Donor eligibility report
export const getDonorEligibilityReport = () => {
  return axios.get("/reports/donor-eligibility");
};

export default {
  getDonors,
  addDonor,
  getBloodUnits,
  addBloodUnit,
  addUnit,
  getHospitals,
  addHospital,
  getBloodBanks,
  getBanks,
  addBloodBank,
  addBank,
  getRequests,
  addRequest,
  getBloodStockReport,
  getDonorEligibilityReport,
};