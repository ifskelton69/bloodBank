import {
  Building2, ClipboardList, Droplet, Droplets, FileBarChart,
  Hospital, LayoutDashboard, Settings, Users, Warehouse,
} from "lucide-react";

// [label, icon, path]
export const nav = [
  {
    label: "Workspace",
    items: [
      ["Dashboard", LayoutDashboard, "/"],
      ["Donors", Users, "/donors"],
      ["Blood inventory", Droplets, "/inventory"],
      ["Blood banks", Warehouse, "/blood-banks"],
      ["Hospitals", Hospital, "/hospitals"],
      ["Blood requests", ClipboardList, "/requests"],
    ],
  },
  {
    label: "Management",
    items: [
      ["Donations", Droplet, "/donations"],
      ["Storage", Building2, "/storage"],
      ["Reports", FileBarChart, "/reports"],
      ["Admin settings", Settings, "/settings"],
    ],
  },
];

const allItems = nav.flatMap((g) => g.items);
export const pagePath = Object.fromEntries(allItems.map(([label, , path]) => [label, path]));
export const pathToPage = {
  ...Object.fromEntries(allItems.map(([label, , path]) => [path, label])),
  "/dashboard": "Dashboard",
  "/index.html": "Dashboard",
};

export const pageTitles = {
  Dashboard: "Overview",
  Donors: "Donor directory",
  "Blood inventory": "Inventory management",
  "Blood banks": "Blood bank network",
  Hospitals: "Hospital directory",
  "Blood requests": "Request management",
  Donations: "Donation activity",
  Storage: "Storage overview",
  Reports: "Analytics & reports",
  "Admin settings": "Workspace settings",
};

// Which modal the "Quick add" button opens on each page
export const quickAddType = {
  Donors: "Donor",
  Hospitals: "Hospital",
  "Blood banks": "Blood bank",
  "Blood requests": "Blood request",
};