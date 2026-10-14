import {
  AlertTriangle, ArrowUpRight, ClipboardList, Droplet, Droplets,
  HeartPulse, Hospital, Plus, Users, Zap,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import Status from "../components/common/Status";
import { STOCK_TYPES, bloodColors, stockChart } from "../data/initialData";
import { sumByType } from "../utils/format";

function StatCard({ label, icon: Icon, iconClass, value, trend, trendNote, path, sparkClass = "" }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon ${iconClass}`}><Icon size={19} /></span>
      </div>
      <div className="stat-number">{value}</div>
      <div className="stat-bottom">{trend}<span>{trendNote}</span></div>
      <div className={`sparkline ${sparkClass}`}>
        <svg viewBox="0 0 120 28"><path d={path} /></svg>
      </div>
    </div>
  );
}

const up = (text) => <span className="trend up"><ArrowUpRight size={14} /> {text}</span>;

export default function Dashboard({
  donors, units, hospitals, requests, totalUnits, pending, setPage, onAdd,
}) {
  const donutData = STOCK_TYPES.map((name) => ({ name, value: sumByType(units, name) || 1 }));

  return (
    <>
      {/* Welcome banner */}
      <div className="welcome">
        <div className="welcome-copy">
          <span className="welcome-pill"><Zap size={13} /> NETWORK OVERVIEW</span>
          <h2>Every drop makes a difference.</h2>
          <p>Here’s what’s happening across your blood bank network today.</p>
          <button onClick={() => setPage("Blood requests")}>
            Review hospital requests <span>→</span>
          </button>
        </div>
        <div className="welcome-art">
          <div className="art-ring ring1" />
          <div className="art-ring ring2" />
          <div className="art-drop">
            <Droplet size={68} fill="currentColor" strokeWidth={1.2} />
            <HeartPulse size={27} />
          </div>
          <span className="art-plus p1">+</span>
          <span className="art-plus p2">+</span>
          <span className="art-plus p3">+</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stats-grid">
        <StatCard
          label="Total donors" icon={Users} iconClass="red-icon"
          value={donors.length.toLocaleString()}
          trend={up("12.8%")} trendNote="vs. last month"
          path="M0 23 C10 21 13 12 23 16 S40 21 48 11 S62 14 70 8 S85 15 93 7 S109 9 120 2"
        />
        <StatCard
          label="Available units" icon={Droplets} iconClass="pink-icon"
          value={totalUnits}
          trend={up("8.4%")} trendNote="vs. last month"
          path="M0 24 C12 18 18 21 25 15 S42 18 50 9 S65 17 74 12 S89 14 98 5 S112 8 120 2"
        />
        <StatCard
          label="Partner hospitals" icon={Hospital} iconClass="blue-icon" sparkClass="blue-spark"
          value={hospitals.length}
          trend={up("2 new")} trendNote="this quarter"
          path="M0 24 C12 22 15 15 26 18 S42 12 52 16 S69 5 78 10 S95 7 105 5 S115 4 120 1"
        />
        <StatCard
          label="Pending requests" icon={ClipboardList} iconClass="amber-icon" sparkClass="amber-spark"
          value={pending}
          trend={<span className="trend down"><AlertTriangle size={13} /> Needs attention</span>}
          trendNote="right now"
          path="M0 6 C12 10 16 5 25 12 S40 6 50 14 S67 10 77 18 S93 11 102 20 S114 18 120 24"
        />
      </div>

      {/* Charts */}
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-head">
            <div>
              <h3>Network activity</h3>
              <p>Donations and fulfilled requests over time</p>
            </div>
            <select className="select-small" defaultValue="6 months">
              <option>6 months</option>
              <option>30 days</option>
            </select>
          </div>
          <div className="chart-legend">
            <span><i className="legend-red" /> Donations</span>
            <span><i className="legend-blue" /> Requests fulfilled</span>
          </div>
          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stockChart} margin={{ top: 8, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="donationFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e5484d" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#e5484d" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="requestFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c83fd" stopOpacity={0.16} />
                    <stop offset="100%" stopColor="#7c83fd" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#edf0f5" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#8b93a4", fontSize: 12 }} dy={9} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8b93a4", fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e8ebf2", fontSize: 12 }} />
                <Area type="monotone" dataKey="donations" name="Donations" stroke="#e5484d" strokeWidth={2.5} fill="url(#donationFill)" />
                <Area type="monotone" dataKey="requests" name="Requests fulfilled" stroke="#7c83fd" strokeWidth={2.5} fill="url(#requestFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel blood-panel">
          <div className="panel-head">
            <div>
              <h3>Blood group stock</h3>
              <p>Units by blood type</p>
            </div>
            <button className="dots-btn" onClick={() => setPage("Blood inventory")}>•••</button>
          </div>
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={64} outerRadius={87} paddingAngle={3} stroke="none">
                  {bloodColors.map((c, i) => <Cell key={i} fill={c} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <b>{totalUnits}</b>
              <span>Total units</span>
            </div>
          </div>
          <div className="blood-legend">
            {STOCK_TYPES.map((t, i) => (
              <div key={t}>
                <span><i style={{ background: bloodColors[i] }} />{t}</span>
                <b>{sumByType(units, t)}</b>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Recent requests + donors */}
      <div className="bottom-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Recent hospital requests</h3>
              <p>Latest requests from partner hospitals</p>
            </div>
            <button className="text-link" onClick={() => setPage("Blood requests")}>
              View all <span>→</span>
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Request</th><th>Blood type</th><th>Units</th><th>Urgency</th><th>Status</th></tr>
              </thead>
              <tbody>
                {requests.slice(0, 4).map((r) => (
                  <tr key={r.Request_ID}>
                    <td>
                      <b className="table-primary">{r.Request_ID}</b>
                      <small>{r.Request_Date}</small>
                    </td>
                    <td><span className="blood-chip">{r.Needed_Blood_Type}</span></td>
                    <td>{r.Qty_Requested}</td>
                    <td><Status value={r.Urgency_Level} /></td>
                    <td><Status value={r.Status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Recently registered donors</h3>
              <p>Your growing donor community</p>
            </div>
            <button className="text-link" onClick={() => setPage("Donors")}>
              View all <span>→</span>
            </button>
          </div>
          <div className="donor-list">
            {donors.slice(0, 4).map((d, i) => (
              <div className="donor-row" key={d.Donor_ID}>
                <div className={`donor-avatar av${i % 4}`}>
                  {String(d.Name || "D").split(" ").map((s) => s[0]).slice(0, 2).join("")}
                </div>
                <div className="donor-name">
                  <b>{d.Name}</b>
                  <span>Donor ID: {d.Donor_ID}</span>
                </div>
                <span className="blood-chip">{d.Blood_Type}</span>
                <Status value={d.Eligibility_Status} />
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Quick actions */}
      <div className="quick-actions">
        <div>
          <h3>Quick actions</h3>
          <p>Common tasks, one click away</p>
        </div>
        <button onClick={() => onAdd("Donor")}>
          <span className="qa-icon qa-red"><Users size={19} /></span>
          <b>Register donor</b>
          <span>Add a new donor profile</span>
          <Plus size={17} />
        </button>
        <button onClick={() => onAdd("Blood unit")}>
          <span className="qa-icon qa-pink"><Droplets size={19} /></span>
          <b>Record blood unit</b>
          <span>Update inventory stock</span>
          <Plus size={17} />
        </button>
        <button onClick={() => onAdd("Blood request")}>
          <span className="qa-icon qa-blue"><ClipboardList size={19} /></span>
          <b>Create request</b>
          <span>Log a hospital requirement</span>
          <Plus size={17} />
        </button>
      </div>
    </>
  );
}
