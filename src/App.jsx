import { useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Database,
  FileSpreadsheet,
  Gauge,
  LayoutDashboard,
  Lightbulb,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Settings,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  X,
  Zap,
} from "lucide-react";
import Papa from "papaparse";
import Charts from "./components/Charts";
import "./App.css";

const CATEGORIES = ["Sales", "Marketing", "Finance", "Operations", "Customer"];
const KPI_TYPES = ["Currency", "Number", "Percentage"];

const INITIAL_KPIS = [
  { name: "Revenue", category: "Sales", type: "Currency", target: 100000, actual: 85000, previous: 75000 },
  { name: "Customers", category: "Customer", type: "Number", target: 1000, actual: 820, previous: 760 },
  { name: "Conversion Rate", category: "Marketing", type: "Percentage", target: 10, actual: 8.5, previous: 7.8 },
  { name: "Operating Cost", category: "Finance", type: "Currency", target: 60000, actual: 54000, previous: 57500 },
  { name: "Orders Fulfilled", category: "Operations", type: "Number", target: 900, actual: 792, previous: 735 },
  { name: "Customer Satisfaction", category: "Customer", type: "Percentage", target: 95, actual: 91, previous: 88.5 },
];

const CATEGORY_META = {
  Sales: { icon: TrendingUp, tone: "violet" },
  Marketing: { icon: Zap, tone: "orange" },
  Finance: { icon: BarChart3, tone: "blue" },
  Operations: { icon: Activity, tone: "cyan" },
  Customer: { icon: Users, tone: "green" },
};

function App() {
  const [kpis, setKpis] = useState(INITIAL_KPIS);
  const [form, setForm] = useState({ name: "", category: "Sales", type: "Number", target: "", actual: "", previous: "" });
  const [editingIndex, setEditingIndex] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [fileName, setFileName] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [csvData, setCsvData] = useState([]);
  const [csvColumns, setCsvColumns] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const fileInputRef = useRef(null);

  const cleanNumber = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const cleaned = String(value).trim().replace(/₹/g, "").replace(/,/g, "").replace(/%/g, "");
    if (!cleaned) return null;
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : null;
  };

  const formatValue = (value, type) => {
    if (type === "Currency") return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
    if (type === "Percentage") return `${Number(value).toFixed(1)}%`;
    return Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  };

  const calculateGrowth = (actual, previous) => {
    if (!previous) return 0;
    return Number((((actual - previous) / previous) * 100).toFixed(1));
  };

  const calculatePerformance = (target, actual) => {
    if (!target || target <= 0) return 0;
    return Math.min(Math.round((actual / target) * 100), 100);
  };

  const getStatus = (performance) => {
    if (performance >= 90) return { label: "Excellent", className: "status-excellent" };
    if (performance >= 70) return { label: "On Track", className: "status-track" };
    return { label: "Needs Attention", className: "status-attention" };
  };

  const detectKPIType = (columnName) => {
    const name = columnName.toLowerCase().trim();
    if (["%", "rate", "percentage", "margin", "conversion", "ratio"].some((x) => name.includes(x))) return "Percentage";
    if (["revenue", "sales", "profit", "income", "cost", "expense", "price", "amount", "salary", "budget"].some((x) => name.includes(x))) return "Currency";
    return "Number";
  };

  const detectCategory = (columnName) => {
    const name = columnName.toLowerCase().trim();
    if (["revenue", "sales", "profit", "order"].some((x) => name.includes(x))) return "Sales";
    if (["conversion", "campaign", "click", "lead", "marketing"].some((x) => name.includes(x))) return "Marketing";
    if (["customer", "user", "retention", "satisfaction"].some((x) => name.includes(x))) return "Customer";
    if (["cost", "expense", "budget", "income", "salary"].some((x) => name.includes(x))) return "Finance";
    return "Operations";
  };

  const getNumericColumns = (data) => {
    if (!data.length) return [];
    return Object.keys(data[0]).filter((column) => {
      const values = data.map((row) => row[column]).filter((value) => value !== undefined && value !== null && String(value).trim() !== "");
      if (!values.length) return false;
      return values.filter((value) => cleanNumber(value) !== null).length / values.length >= 0.8;
    });
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setUploadMessage("");
    setUploadError("");
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setUploadError("Please upload a CSV file.");
      event.target.value = "";
      return;
    }
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          if (!results.data?.length) throw new Error("The CSV file is empty.");
          const cleanedData = results.data.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim(), typeof value === "string" ? value.trim() : value])));
          const columns = Object.keys(cleanedData[0]);
          const numericColumns = getNumericColumns(cleanedData);
          if (!numericColumns.length) throw new Error("No numeric KPI columns were found in this CSV.");
          const generated = numericColumns.map((column) => {
            const values = cleanedData.map((row) => cleanNumber(row[column])).filter((value) => value !== null);
            const actual = values.at(-1);
            const previous = values.length > 1 ? values.at(-2) : actual;
            const average = values.reduce((sum, value) => sum + value, 0) / values.length;
            return { name: column, category: detectCategory(column), type: detectKPIType(column), target: Number((average * 1.1).toFixed(2)), actual, previous };
          });
          setCsvData(cleanedData);
          setCsvColumns(columns);
          setKpis(generated);
          setSelectedCategory("All");
          setFileName(file.name);
          setUploadMessage(`${generated.length} KPIs generated from ${file.name}.`);
        } catch (error) {
          setUploadError(error.message || "Something went wrong while processing the CSV.");
        }
      },
      error: () => setUploadError("Unable to read the CSV file."),
    });
    event.target.value = "";
  };

  const resetDashboard = () => {
    setKpis(INITIAL_KPIS);
    setCsvData([]);
    setCsvColumns([]);
    setFileName("");
    setUploadMessage("Dashboard restored to the sample dataset.");
    setUploadError("");
    setSelectedCategory("All");
  };

  const resetForm = () => {
    setEditingIndex(null);
    setForm({ name: "", category: "Sales", type: "Number", target: "", actual: "", previous: "" });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.name || form.target === "" || form.actual === "" || form.previous === "") return;
    const updated = { ...form, name: form.name.trim(), target: Number(form.target), actual: Number(form.actual), previous: Number(form.previous) };
    setKpis((current) => editingIndex === null ? [...current, updated] : current.map((item, index) => index === editingIndex ? updated : item));
    resetForm();
  };

  const editKPI = (index) => {
    const kpi = kpis[index];
    setForm({ name: kpi.name, category: kpi.category, type: kpi.type, target: kpi.target, actual: kpi.actual, previous: kpi.previous });
    setEditingIndex(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteKPI = (index) => {
    if (window.confirm("Are you sure you want to delete this KPI?")) setKpis((current) => current.filter((_, i) => i !== index));
  };

  const filteredKPIs = selectedCategory === "All" ? kpis : kpis.filter((kpi) => kpi.category === selectedCategory);
  const performanceValues = filteredKPIs.map((kpi) => calculatePerformance(kpi.target, kpi.actual));
  const overallPerformance = performanceValues.length ? Math.round(performanceValues.reduce((sum, value) => sum + value, 0) / performanceValues.length) : 0;
  const excellentCount = performanceValues.filter((value) => value >= 90).length;
  const onTrackCount = performanceValues.filter((value) => value >= 70 && value < 90).length;
  const attentionCount = performanceValues.filter((value) => value < 70).length;
  const positiveGrowth = kpis.filter((kpi) => calculateGrowth(kpi.actual, kpi.previous) >= 0).length;
  const averageGrowth = kpis.length ? (kpis.reduce((sum, kpi) => sum + calculateGrowth(kpi.actual, kpi.previous), 0) / kpis.length).toFixed(1) : 0;

  const bestKPI = useMemo(() => [...filteredKPIs].sort((a, b) => calculatePerformance(b.target, b.actual) - calculatePerformance(a.target, a.actual))[0], [filteredKPIs]);
  const needsAttention = useMemo(() => [...filteredKPIs].sort((a, b) => calculatePerformance(a.target, a.actual) - calculatePerformance(b.target, b.actual)).slice(0, 2), [filteredKPIs]);

  return (
    <div className={`app ${darkMode ? "dark" : ""}`}>
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark"><BarChart3 size={20} /></div>
          <div><strong>Metricly</strong><span>Business intelligence</span></div>
        </div>
        <div className="workspace-switcher"><div className="workspace-avatar">AC</div><div><small>Workspace</small><strong>Acme Corporation</strong></div><ChevronDown size={15} /></div>
        <nav>
          <p className="nav-label">Workspace</p>
          <button className="nav-item active"><LayoutDashboard size={18} /> Overview</button>
          <button className="nav-item" onClick={() => document.getElementById("kpis")?.scrollIntoView({ behavior: "smooth" })}><Gauge size={18} /> KPI Library <span className="nav-count">{kpis.length}</span></button>
          <button className="nav-item" onClick={() => document.getElementById("data")?.scrollIntoView({ behavior: "smooth" })}><Database size={18} /> Data Explorer</button>
          <p className="nav-label">Manage</p>
          <button className="nav-item"><Bell size={18} /> Alerts <span className="notification-dot" /></button>
          <button className="nav-item"><Target size={18} /> Goals</button>
          <button className="nav-item"><Settings size={18} /> Settings</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-icon"><CircleHelp size={17} /></div><div><strong>Need a hand?</strong><span>View dashboard guide</span></div></div>
          <div className="profile-mini"><div className="profile-avatar">AM</div><div><strong>User</strong><span>Administrator</span></div><MoreHorizontal size={18} /></div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setSidebarOpen((open) => !open)}><Menu size={21} /></button>
          <div className="breadcrumbs"><span>Analytics</span><span>/</span><strong>Performance Overview</strong></div>
          <div className="topbar-actions">
            <button className="icon-button" title="Notifications"><Bell size={18} /><span /></button>
            <button className="icon-button" onClick={() => setDarkMode((value) => !value)} title="Toggle theme"><Activity size={18} /></button>
            <div className="top-profile"><div className="profile-avatar">AM</div><div><strong>User</strong><span>Admin</span></div><ChevronDown size={15} /></div>
          </div>
        </header>

        <main className="container">
          <section className="hero-panel">
            <div className="hero-copy">
              <div className="eyebrow"><span className="live-dot" /> Live dashboard</div>
              <h1>Good morning <span>👋</span></h1>
              <p>Here’s what’s happening across your business today. Track progress, spot trends, and make faster decisions.</p>
              <div className="hero-actions">
                <button className="primary-button" onClick={() => document.getElementById("kpis")?.scrollIntoView({ behavior: "smooth" })}><Plus size={17} /> Add KPI</button>
                <button className="secondary-button" onClick={() => fileInputRef.current?.click()}><Upload size={17} /> Import data</button>
              </div>
            </div>
            <div className="hero-visual">
              <div className="orb orb-one" /><div className="orb orb-two" />
              <div className="hero-chart"><div className="chart-line"><i /><i /><i /><i /><i /><i /><i /></div><div className="chart-bars"><b /><b /><b /><b /><b /><b /></div></div>
              <div className="floating-stat"><TrendingUp size={16} /><div><strong>+{averageGrowth}%</strong><span>vs last period</span></div></div>
            </div>
          </section>

          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden-file-input" />

          <section className="summary-grid">
            <SummaryCard icon={Gauge} label="Overall performance" value={`${overallPerformance}%`} detail={`${kpis.length} KPIs tracked`} tone="violet" progress={overallPerformance} />
            <SummaryCard icon={TrendingUp} label="Average growth" value={`${averageGrowth > 0 ? "+" : ""}${averageGrowth}%`} detail={`${positiveGrowth} of ${kpis.length} improving`} tone="green" positive={Number(averageGrowth) >= 0} />
            <SummaryCard icon={CheckCircle2} label="On target" value={`${excellentCount + onTrackCount}`} detail={`${excellentCount} excellent · ${onTrackCount} on track`} tone="blue" />
            <SummaryCard icon={AlertTriangle} label="Needs attention" value={`${attentionCount}`} detail={attentionCount ? "Review performance gaps" : "Everything looks healthy"} tone={attentionCount ? "orange" : "green"} />
          </section>

          <section className="content-grid" id="data">
            <div className="main-column">
              <div className="section-heading">
                <div><span className="section-kicker">Performance</span><h2>Business overview</h2><p>Monitor your most important metrics at a glance.</p></div>
                <div className="filter-container"><select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}><option>All</option>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select><button className="ghost-button" onClick={resetDashboard}><RefreshCw size={15} /> Reset</button></div>
              </div>

              <div className="kpi-grid" id="kpis">
                {filteredKPIs.map((kpi, index) => {
                  const actualIndex = kpis.indexOf(kpi);
                  const performance = calculatePerformance(kpi.target, kpi.actual);
                  const growth = calculateGrowth(kpi.actual, kpi.previous);
                  const status = getStatus(performance);
                  const meta = CATEGORY_META[kpi.category] || CATEGORY_META.Operations;
                  const Icon = meta.icon;
                  return <article className="kpi-card" key={`${kpi.name}-${index}`}>
                    <div className="kpi-card-top"><div className={`kpi-icon ${meta.tone}`}><Icon size={17} /></div><button className="more-button"><MoreHorizontal size={18} /></button></div>
                    <div className="kpi-card-title"><div><h3>{kpi.name}</h3><span>{kpi.category} · {kpi.type}</span></div><span className={`status-badge ${status.className}`}>{status.label}</span></div>
                    <div className="kpi-value-row"><strong>{formatValue(kpi.actual, kpi.type)}</strong><span className={growth >= 0 ? "growth-up" : "growth-down"}>{growth >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}{Math.abs(growth)}%</span></div>
                    <div className="progress-meta"><span>Target {formatValue(kpi.target, kpi.type)}</span><strong>{performance}%</strong></div>
                    <div className="progress-track"><span style={{ width: `${performance}%` }} /></div>
                    <div className="kpi-card-footer"><span>Previous {formatValue(kpi.previous, kpi.type)}</span><div><button className="small-action edit" onClick={() => editKPI(actualIndex)}><Pencil size={14} /> Edit</button><button className="small-action delete" onClick={() => deleteKPI(actualIndex)}><Trash2 size={14} /> Delete</button></div></div>
                  </article>;
                })}
              </div>

              {!filteredKPIs.length && <div className="empty-state"><Target size={34} /><h3>No KPIs in this category</h3><p>Add a KPI or choose another category.</p></div>}

              <Charts kpis={filteredKPIs} />
            </div>

            <aside className="right-column">
              <section className="side-card insight-card">
                <div className="side-card-heading"><div className="heading-icon purple"><Lightbulb size={18} /></div><div><h3>Smart insights</h3><p>Generated from your metrics</p></div></div>
                <div className="insight-highlight"><strong>{bestKPI ? bestKPI.name : "—"}</strong><span>is your strongest metric at {bestKPI ? calculatePerformance(bestKPI.target, bestKPI.actual) : 0}% of target.</span></div>
                {needsAttention.map((kpi) => <div className="insight-row" key={kpi.name}><div className="insight-dot orange" /><div><strong>{kpi.name}</strong><span>{calculatePerformance(kpi.target, kpi.actual)}% of target · {calculateGrowth(kpi.actual, kpi.previous)}% growth</span></div></div>)}
              </section>

              <section className="side-card activity-card">
                <div className="side-card-heading"><div className="heading-icon blue"><Activity size={18} /></div><div><h3>Recent activity</h3><p>Latest dashboard updates</p></div></div>
                <ActivityItem icon={FileSpreadsheet} title={fileName ? `Imported ${fileName}` : "Sample dashboard loaded"} time="Just now" tone="green" />
                <ActivityItem icon={Plus} title="6 KPI metrics are active" time="Today" tone="blue" />
                <ActivityItem icon={Target} title="Monthly targets reviewed" time="Yesterday" tone="purple" />
              </section>

              <section className="side-card health-card">
                <div className="health-ring" style={{ "--progress": `${overallPerformance * 3.6}deg` }}><div><strong>{overallPerformance}%</strong><span>Health</span></div></div>
                <div><h3>Dashboard health</h3><p>Your KPI set is healthy and ready for decision-making.</p><div className="health-list"><span><i className="dot green" /> Data connected</span><span><i className="dot blue" /> Metrics updated</span></div></div>
              </section>
            </aside>
          </section>

          {csvData.length > 0 && <section className="data-preview-card">
            <div className="data-preview-header"><div className="section-heading compact"><div><span className="section-kicker">Imported dataset</span><h2>Data preview</h2><p>Inspect the source rows used to generate your KPIs.</p></div></div><div className="dataset-stats"><div><strong>{csvData.length}</strong><span>Rows</span></div><div><strong>{csvColumns.length}</strong><span>Columns</span></div></div></div>
            <div className="table-wrapper"><table className="data-table"><thead><tr>{csvColumns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{csvData.slice(0, 6).map((row, rowIndex) => <tr key={rowIndex}>{csvColumns.map((column) => <td key={column}>{row[column] || "—"}</td>)}</tr>)}</tbody></table></div>
            {csvData.length > 6 && <div className="preview-footer">Showing 6 of {csvData.length} rows <span>•</span> Imported from {fileName}</div>}
          </section>}

          {uploadMessage && <div className="toast success"><CheckCircle2 size={18} />{uploadMessage}<button onClick={() => setUploadMessage("")}><X size={15} /></button></div>}
          {uploadError && <div className="toast error"><AlertTriangle size={18} />{uploadError}<button onClick={() => setUploadError("")}><X size={15} /></button></div>}

          <section className="form-section card" id="add-kpi">
            <div className="section-heading compact"><div><span className="section-kicker">KPI management</span><h2>{editingIndex !== null ? "Edit KPI" : "Create a KPI"}</h2><p>{editingIndex !== null ? "Update the metric and keep your dashboard accurate." : "Add a custom metric to your performance dashboard."}</p></div>{editingIndex !== null && <button className="close-edit" onClick={resetForm}><X size={19} /></button>}</div>
            <form onSubmit={handleSubmit} className="kpi-form">
              <div className="form-group wide"><label>KPI name</label><input type="text" placeholder="e.g. Monthly recurring revenue" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="form-group"><label>Category</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></div>
              <div className="form-group"><label>Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{KPI_TYPES.map((type) => <option key={type}>{type}</option>)}</select></div>
              <div className="form-group"><label>Target</label><input type="number" min="0" step="any" placeholder="1000" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} /></div>
              <div className="form-group"><label>Actual</label><input type="number" min="0" step="any" placeholder="850" value={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.value })} /></div>
              <div className="form-group"><label>Previous period</label><input type="number" min="0" step="any" placeholder="780" value={form.previous} onChange={(e) => setForm({ ...form, previous: e.target.value })} /></div>
              <div className="form-actions"><button type="submit" className="primary-button"><Plus size={17} /> {editingIndex !== null ? "Save changes" : "Create KPI"}</button>{editingIndex !== null && <button type="button" className="secondary-button" onClick={resetForm}>Cancel</button>}</div>
            </form>
          </section>

          <footer className="footer"><div><strong>Metricly</strong><span>Make better decisions with better metrics.</span></div><span>Dashboard updated just now</span></footer>
        </main>
      </div>
      {sidebarOpen && <button className="sidebar-overlay" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, detail, tone, progress, positive }) {
  return <article className="summary-card"><div className={`summary-icon ${tone}`}><Icon size={19} /></div><div className="summary-content"><span>{label}</span><strong>{value}</strong><small className={positive === false ? "negative" : ""}>{detail}</small></div>{progress !== undefined && <div className="mini-progress"><span style={{ height: `${progress}%` }} /></div>}</article>;
}

function ActivityItem({ icon: Icon, title, time, tone }) {
  return <div className="activity-item"><div className={`activity-icon ${tone}`}><Icon size={15} /></div><div><strong>{title}</strong><span>{time}</span></div></div>;
}

export default App;
