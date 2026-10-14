export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
// Order used by the dashboard donut chart + legend
export const STOCK_TYPES = ["O+", "A+", "B+", "AB-", "O-", "A-", "B-", "AB+"];

export const initialDonors = [
  { Donor_ID: 1001, Name: "Aarav Kulkarni", Blood_Type: "O+", Contact_No: "98765 43210", Eligibility_Status: "Eligible", Gender: "Male" },
  { Donor_ID: 1002, Name: "Ananya Shah", Blood_Type: "A+", Contact_No: "98220 11552", Eligibility_Status: "Eligible", Gender: "Female" },
  { Donor_ID: 1003, Name: "Ishaan Patil", Blood_Type: "B+", Contact_No: "97654 32109", Eligibility_Status: "Pending", Gender: "Male" },
  { Donor_ID: 1004, Name: "Sara Deshmukh", Blood_Type: "AB-", Contact_No: "98900 77881", Eligibility_Status: "Eligible", Gender: "Female" },
  { Donor_ID: 1005, Name: "Rohan Joshi", Blood_Type: "O-", Contact_No: "99221 11445", Eligibility_Status: "Ineligible", Gender: "Male" },
];

export const initialUnits = [
  { Unit_ID: "BU-2401", Blood_Type: "O+", Quantity: 12, Collection_Date: "2026-10-02", Expiration_Date: "2026-11-13", Testing_Status: "Passed", Bank_ID: 1 },
  { Unit_ID: "BU-2402", Blood_Type: "A+", Quantity: 8, Collection_Date: "2026-10-03", Expiration_Date: "2026-11-14", Testing_Status: "Passed", Bank_ID: 1 },
  { Unit_ID: "BU-2403", Blood_Type: "B+", Quantity: 6, Collection_Date: "2026-10-04", Expiration_Date: "2026-11-15", Testing_Status: "Pending", Bank_ID: 2 },
  { Unit_ID: "BU-2404", Blood_Type: "AB-", Quantity: 3, Collection_Date: "2026-10-01", Expiration_Date: "2026-11-12", Testing_Status: "Passed", Bank_ID: 2 },
  { Unit_ID: "BU-2405", Blood_Type: "O-", Quantity: 4, Collection_Date: "2026-09-28", Expiration_Date: "2026-11-09", Testing_Status: "Passed", Bank_ID: 1 },
];

export const initialHospitals = [
  { Hospital_ID: 1, Name: "CityCare Hospital", Address: "Shivajinagar, Pune", Contact_No: "020 4100 2200" },
  { Hospital_ID: 2, Name: "Sahyadri Medical Centre", Address: "Deccan, Pune", Contact_No: "020 6721 3000" },
  { Hospital_ID: 3, Name: "Lifeline Multispeciality", Address: "Kothrud, Pune", Contact_No: "020 6700 4100" },
];

export const initialRequests = [
  { Request_ID: "REQ-081", Request_Date: "2026-10-09", Needed_Blood_Type: "O-", Qty_Requested: 4, Status: "Pending", Urgency_Level: "Critical", Hospital_ID: 1 },
  { Request_ID: "REQ-080", Request_Date: "2026-10-09", Needed_Blood_Type: "A+", Qty_Requested: 2, Status: "Approved", Urgency_Level: "High", Hospital_ID: 2 },
  { Request_ID: "REQ-079", Request_Date: "2026-10-08", Needed_Blood_Type: "B+", Qty_Requested: 3, Status: "Processing", Urgency_Level: "Normal", Hospital_ID: 3 },
  { Request_ID: "REQ-078", Request_Date: "2026-10-08", Needed_Blood_Type: "AB-", Qty_Requested: 1, Status: "Fulfilled", Urgency_Level: "High", Hospital_ID: 1 },
];

export const initialBanks = [
  { Bank_ID: 1, Name: "VitalDrop Central Bank", Address: "Camp, Pune", Contact_No: "020 2600 1000", Staff_Count: 24 },
  { Bank_ID: 2, Name: "North Pune Blood Centre", Address: "Aundh, Pune", Contact_No: "020 2720 6000", Staff_Count: 16 },
];

export const stockChart = [
  { month: "May", donations: 42, requests: 31 },
  { month: "Jun", donations: 48, requests: 35 },
  { month: "Jul", donations: 38, requests: 33 },
  { month: "Aug", donations: 58, requests: 41 },
  { month: "Sep", donations: 51, requests: 39 },
  { month: "Oct", donations: 64, requests: 44 },
];

export const bloodColors = ["#e5484d", "#f59e0b", "#6d5ce8", "#0ea5a4", "#3b82f6", "#ec4899", "#64748b", "#22a06b"];
