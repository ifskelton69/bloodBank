import axios from "./axios";

// -----------------------------------------
// AUTHENTICATION
// -----------------------------------------
export const loginAdmin = (credentials) => {
  return axios.post("/auth/login", credentials);
};

export const getCurrentAdmin = () => {
  return axios.get("/auth/me");
};

export const logoutAdmin = () => {
  return axios.post("/auth/logout");
};

// -----------------------------------------
// DONORS
// -----------------------------------------
export const getDonors = () => {
  return axios.get("/donors");
};

export const addDonor = (data) => {
  return axios.post("/newdonor", data);
};

// -----------------------------------------
// BLOOD UNITS / INVENTORY
// -----------------------------------------
export const getBloodUnits = () => {
  return axios.get("/blood-units");
};

export const addBloodUnit = (data) => {
  return axios.post("/newunit", data);
};
export const addUnit = addBloodUnit;

export const updateBloodUnit = (unitId, data) => {
  return axios.put(`/blood-units/${unitId}`, data);
};

export const updateUnitTestingStatus = (unitId, testingStatus) => {
  return axios.patch(`/blood-units/${unitId}/status`, {
    Testing_Status: testingStatus,
  });
};

export const deleteBloodUnit = (unitId) => {
  return axios.delete(`/blood-units/${unitId}`);
};

// -----------------------------------------
// HOSPITALS
// -----------------------------------------
export const getHospitals = () => {
  return axios.get("/hospitals");
};

export const addHospital = (data) => {
  return axios.post("/newhospital", data);
};

export const deleteHospital = (hospitalId) => {
  return axios.delete(`/hospitals/${hospitalId}`);
};

// -----------------------------------------
// BLOOD BANKS
// -----------------------------------------
export const getBloodBanks = () => {
  return axios.get("/blood-banks");
};
export const getBanks = getBloodBanks;

export const addBloodBank = (data) => {
  return axios.post("/newbank", data);
};
export const addBank = addBloodBank;

// -----------------------------------------
// BLOOD REQUESTS
// -----------------------------------------
export const getRequests = () => {
  return axios.get("/requests");
};

export const addRequest = (data) => {
  return axios.post("/newrequest", data);
};

export const updateRequestStatus = (requestId, status) => {
  return axios.put(`/requests/${requestId}/status`, { status });
};

// -----------------------------------------
// DONATIONS & DONOR HISTORY
// -----------------------------------------
export const getDonations = () => {
  return axios.get("/donations");
};

export const recordDonation = (data) => {
  return axios.post("/donations", data);
};

export const getDonorHistory = (donorId) => {
  return axios.get(`/donors/${donorId}/history`);
};

// -----------------------------------------
// REPORTS
// -----------------------------------------
export const getBloodStockReport = () => {
  return axios.get("/reports/blood-stock");
};

export const getDonorEligibilityReport = () => {
  return axios.get("/reports/donor-eligibility");
};

export default {
  loginAdmin,
  getCurrentAdmin,
  logoutAdmin,
  getDonors,
  addDonor,
  getDonations,
  recordDonation,
  getDonorHistory,
  getBloodUnits,
  addBloodUnit,
  addUnit,
  updateBloodUnit,
  updateUnitTestingStatus,
  deleteBloodUnit,
  getHospitals,
  addHospital,
  deleteHospital,
  getBloodBanks,
  getBanks,
  addBloodBank,
  addBank,
  getRequests,
  addRequest,
  updateRequestStatus,
  getBloodStockReport,
  getDonorEligibilityReport,
};