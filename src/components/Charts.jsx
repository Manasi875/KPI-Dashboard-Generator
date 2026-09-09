import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler);

function Charts({ kpis }) {
  const labels = kpis.map((kpi) => kpi.name);
  const performance = kpis.map((kpi) => Math.min((Number(kpi.actual) / Number(kpi.target || 1)) * 100, 100));
  const growth = kpis.map((kpi) => (Number(kpi.previous) ? ((Number(kpi.actual) - Number(kpi.previous)) / Number(kpi.previous)) * 100 : 0));

  const barData = {
    labels,
    datasets: [
      { label: "Performance", data: performance, borderRadius: 8, backgroundColor: "rgba(124, 92, 255, 0.82)", maxBarThickness: 32 },
    ],
  };

  const lineData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [{ label: "Business momentum", data: [58, 64, 61, 73, 69, 82, Math.max(82, Math.round((performance.reduce((a, b) => a + b, 0) / (performance.length || 1))))], fill: true, tension: 0.42, borderWidth: 3, pointRadius: 3, backgroundColor: "rgba(124, 92, 255, 0.10)", borderColor: "#7c5cff", pointBackgroundColor: "#ffffff", pointBorderColor: "#7c5cff" }],
  };

  const distribution = [
    kpis.filter((kpi) => Math.min((Number(kpi.actual) / Number(kpi.target || 1)) * 100, 100) >= 90).length,
    kpis.filter((kpi) => { const p = Math.min((Number(kpi.actual) / Number(kpi.target || 1)) * 100, 100); return p >= 70 && p < 90; }).length,
    kpis.filter((kpi) => Math.min((Number(kpi.actual) / Number(kpi.target || 1)) * 100, 100) < 70).length,
  ];

  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { padding: 12, displayColors: false } }, scales: { x: { grid: { display: false }, ticks: { color: "#8a8fa3", maxRotation: 0, font: { size: 11 } } }, y: { beginAtZero: true, suggestedMax: 100, grid: { color: "rgba(138,143,163,.12)" }, ticks: { color: "#8a8fa3", font: { size: 11 } } } } };
  const lineOptions = { ...options, scales: { x: { grid: { display: false }, ticks: { color: "#8a8fa3" } }, y: { beginAtZero: true, suggestedMax: 100, grid: { color: "rgba(138,143,163,.12)" }, ticks: { color: "#8a8fa3" } } } };

  return <section className="charts-section">
    <div className="chart-header"><div><span className="section-kicker">Analytics</span><h2>Performance trends</h2><p>Understand momentum and KPI target attainment.</p></div><div className="chart-legend"><span><i className="legend-dot purple" />Performance</span><span><i className="legend-dot muted" />Target benchmark</span></div></div>
    <div className="charts-grid">
      <div className="chart-panel wide-chart"><div className="chart-panel-title"><div><strong>Weekly momentum</strong><span>Overall business activity</span></div><span className="trend-pill"><span>↗</span> 12.4%</span></div><div className="line-chart"><Line data={lineData} options={lineOptions} /></div></div>
      <div className="chart-panel"><div className="chart-panel-title"><div><strong>KPI attainment</strong><span>Actual vs target</span></div></div><div className="bar-chart"><Bar data={barData} options={options} /></div></div>
      <div className="chart-panel distribution-panel"><div className="chart-panel-title"><div><strong>Health distribution</strong><span>Current KPI status</span></div></div><div className="donut-wrap"><div className="donut"><Doughnut data={{ labels: ["Excellent", "On track", "Attention"], datasets: [{ data: distribution, backgroundColor: ["#25b86f", "#5b8def", "#ff9b5c"], borderWidth: 0, spacing: 4 }] }} options={{ responsive: true, maintainAspectRatio: false, cutout: "76%", plugins: { legend: { display: false } } }} /></div><div className="donut-total"><strong>{kpis.length}</strong><span>KPIs</span></div><div className="donut-legend"><span><i className="dot green" />Excellent <b>{distribution[0]}</b></span><span><i className="dot blue" />On track <b>{distribution[1]}</b></span><span><i className="dot orange" />Attention <b>{distribution[2]}</b></span></div></div></div>
    </div>
  </section>;
}

export default Charts;
