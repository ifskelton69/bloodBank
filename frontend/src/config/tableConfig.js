export const donorsTable = {
  title: "Registered donors",
  desc: "Manage donor profiles and eligibility.",
  action: "Add donor",
  type: "Donor",
  cols: [
    ["Donor_ID", "Donor ID"], ["Name", "Full name"], ["Blood_Type", "Blood type"],
    ["Contact_No", "Contact"], ["Gender", "Gender"], ["Eligibility_Status", "Eligibility"],
  ],
};

export const inventoryTable = {
  title: "Blood inventory",
  desc: "Track tested units, quantities and expiry dates.",
  action: "Add blood unit",
  type: "Blood unit",
  cols: [
    ["Unit_ID", "Unit ID"], ["Blood_Type", "Blood type"], ["Quantity", "Quantity"],
    ["Collection_Date", "Collected"], ["Expiration_Date", "Expires"], ["Testing_Status", "Testing"],
  ],
};

export const hospitalsTable = {
  title: "Hospital directory",
  desc: "Hospitals connected to your blood bank network.",
  action: "Add hospital",
  type: "Hospital",
  cols: [
    ["Hospital_ID", "Hospital ID"], ["Name", "Hospital name"],
    ["Address", "Address"], ["Contact_No", "Contact"],
  ],
};

export const banksTable = {
  title: "Blood bank network",
  desc: "Locations and teams managing blood inventory.",
  action: "Add blood bank",
  type: "Blood bank",
  cols: [
    ["Bank_ID", "Bank ID"], ["Name", "Blood bank"], ["Address", "Address"],
    ["Contact_No", "Contact"], ["Staff_Count", "Staff"],
  ],
};

export const requestsTable = {
  title: "Hospital requests",
  desc: "Prioritise urgent requests and track fulfilment.",
  action: "New request",
  type: "Blood request",
  cols: [
    ["Request_ID", "Request ID"], ["Request_Date", "Date"], ["Needed_Blood_Type", "Blood type"],
    ["Qty_Requested", "Units"], ["Urgency_Level", "Urgency"], ["Status", "Status"],
  ],
};

// Donations + Storage share the same unit columns
export const unitsTable = {
  cols: [
    ["Unit_ID", "Unit ID"], ["Blood_Type", "Blood type"], ["Quantity", "Quantity"],
    ["Collection_Date", "Collection date"], ["Expiration_Date", "Expiry date"],
    ["Testing_Status", "Testing status"], ["Bank_ID", "Bank ID"],
  ],
};
