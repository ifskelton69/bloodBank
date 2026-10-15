import {
  ClipboardList, Droplets, FileBarChart,
  Hospital, LayoutDashboard, Settings, Users, Warehouse,
} from "lucide-react";

// [label, icon, path]
export const nav = [
  {
    label: "Workspace",
    items: [
      ["Dashboard", LayoutDashboard, "/"],
      ["Blood requests", ClipboardList, "/requests"],
      ["Blood inventory", Droplets, "/inventory"],
      ["Hospitals", Hospital, "/hospitals"],
      ["Donors", Users, "/donors"],
      ["Blood banks", Warehouse, "/blood-banks"],
    ],
  },
  {
    label: "Management",
    items: [
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
  "/requests": "Blood requests",
  "/inventory": "Blood inventory",
  "/hospitals": "Hospitals",
};

export const pageTitles = {
  Dashboard: "Overview",
  "Blood requests": "Request management",
  "Blood inventory": "Inventory management",
  Hospitals: "Hospital management",
  Donors: "Donor directory",
  "Blood banks": "Blood bank network",
  Reports: "Analytics & reports",
  "Admin settings": "Workspace settings",
};

// Which modal the "Quick add" button opens on each page
export const quickAddType = {
  "Blood requests": "Blood request",
  "Blood inventory": "Blood unit",
  Hospitals: "Hospital",
  Donors: "Donor",
  "Blood banks": "Blood bank",
};