Chart.defaults.color = "#93a4c3";
Chart.defaults.font.family = "Inter, sans-serif";
Chart.defaults.borderColor = "rgba(255,255,255,0.06)";
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.interaction = { mode: "index", intersect: false };

const COLORS = { PAK: "#22c55e", IND: "#f59e0b", BGD: "#06b6d4", CHN: "#ef4444", USA: "#3b82f6", WLD: "#a78bfa" };
const LOG_FIELDS = ["gdp_nominal", "gdp_ppp", "population", "gdp_per_capita"];
const PRESETS = [
  { name: "Conservative", g: 5, p: 2.0 },
  { name: "Baseline", g: 7, p: 1.7 },
  { name: "High", g: 10, p: 1.4 },
];

const $ = (s) => document.querySelector(s);
const fmt = (n, d = 0) => (n == null ? "–" : n.toLocaleString("en-US", { maximumFractionDigits: d }));

let YEARS = [], BY = {}, NAMES = {};
let compareChart, scenarioChart;
const active = new Set(["PAK", "IND", "BGD", "CHN", "USA"]);

fetch("data.json").then((r) => r.json()).then(init);

const series = (code, f, scale = 1) =>
  YEARS.map((y) => { const v = BY[code]?.[y]?.[f]; return v == null ? null : v / scale; });

const latest = (code, f) => {
  for (let i = YEARS.length - 1; i >= 0; i--) {
    const v = BY[code]?.[YEARS[i]]?.[f];
    if (v != null) return { year: YEARS[i], value: v };
  }
  return null;
};

const lineDs = (label, data, color, extra = {}) => ({
  label, data, borderColor: color, backgroundColor: color + "22",
  borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 4, tension: 0.3, spanGaps: true, ...extra,
});

function init(rows) {
  YEARS = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);
  rows.forEach((r) => {
    (BY[r.country_code] ??= {})[r.year] = r;
    NAMES[r.country_code] = r.country;
  });
  renderKpis();
  renderTrends();
  renderPpp();
  renderCompare();
  renderScenarios();
}

/* ---------- KPIs ---------- */
function renderKpis() {
  const items = [
    ["GDP (nominal)", latest("PAK", "gdp_nominal"), (v) => "$" + fmt(v / 1e9) + "B"],
    ["Population", latest("PAK", "population"), (v) => fmt(v / 1e6, 1) + "M"],
    ["GDP per capita", latest("PAK", "gdp_per_capita"), (v) => "$" + fmt(v)],
    ["Real GDP growth", latest("PAK", "gdp_growth"), (v) => fmt(v, 1) + "%"],
  ];
  $("#kpis").innerHTML = items
    .map(([label, d, f]) => `<div class="kpi"><span>${label}</span><strong>${d ? f(d.value) : "–"}</strong><small>${d ? d.year : ""}</small></div>`)
    .join("");
}

/* ---------- Trends ---------- */
function renderTrends() {
  const idx = (f) => {
    const s = series("PAK", f);
    const base = s.find((v) => v != null);
    return s.map((v) => (v == null ? null : (v / base) * 100));
  };
  new Chart($("#indexChart"), {
    type: "line",
    data: { labels: YEARS, datasets: [lineDs("GDP (nominal)", idx("gdp_nominal"), "#22c55e"), lineDs("Population", idx("population"), "#f59e0b")] },
    options: { maintainAspectRatio: false },
  });

  const g = series("PAK", "gdp_growth"), p = series("PAK", "population_growth");
  new Chart($("#growthChart"), {
    type: "line",
    data: { labels: YEARS, datasets: [lineDs("Real GDP growth", g, "#22c55e"), lineDs("Population growth", p, "#f59e0b")] },
    options: { maintainAspectRatio: false },
  });
  let below = 0, total = 0;
  g.forEach((v, i) => { if (v != null && p[i] != null) { total++; if (v < p[i]) below++; } });
  $("#growthNote").textContent = `Real GDP growth was below population growth in ${below} of ${total} years.`;
}

/* ---------- PPP ---------- */
function renderPpp() {
  new Chart($("#pppChart"), {
    type: "line",
    data: { labels: YEARS, datasets: [
      lineDs("Nominal GDP", series("PAK", "gdp_nominal", 1e9), "#22c55e", { fill: true }),
      lineDs("PPP GDP", series("PAK", "gdp_ppp", 1e9), "#3b82f6", { fill: true }),
    ] },
    options: { maintainAspectRatio: false },
  });
  const n = latest("PAK", "gdp_nominal"), p = latest("PAK", "gdp_ppp");
  if (n && p) {
    $("#pppNote").textContent = `In ${p.year}, PPP GDP was about ${fmt(p.value / n.value, 1)}x nominal GDP. Prices in Pakistan are lower, so each dollar buys more locally.`;
  }
}

/* ---------- Compare ---------- */
function renderCompare() {
  $("#chips").innerHTML = Object.keys(NAMES)
    .map((c) => `<button class="chip ${active.has(c) ? "active" : ""}" data-c="${c}" style="--c:${COLORS[c] || "#999"}">${NAMES[c]}</button>`)
    .join("");
  $("#chips").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    const c = b.dataset.c;
    active.has(c) ? active.delete(c) : active.add(c);
    b.classList.toggle("active");
    updateCompare();
  });
  $("#indicator").addEventListener("change", updateCompare);
  compareChart = new Chart($("#compareChart"), { type: "line", data: { labels: YEARS, datasets: [] }, options: { maintainAspectRatio: false } });
  updateCompare();
}

function updateCompare() {
  const f = $("#indicator").value;
  compareChart.data.datasets = [...active].map((c) => lineDs(NAMES[c], series(c, f), COLORS[c] || "#999"));
  compareChart.options.scales = { y: { type: LOG_FIELDS.includes(f) ? "logarithmic" : "linear" } };
  compareChart.update();
}

/* ---------- Scenarios ---------- */
function renderScenarios() {
  const g0 = latest("PAK", "gdp_nominal");
  const p0 = latest("PAK", "population");
  const n = 2050 - g0.year;
  const required = (Math.pow(6e12 / g0.value, 1 / n) - 1) * 100;
  $("#req").innerHTML = `Reaching <b>US$6 trillion by 2050</b> from $${fmt(g0.value / 1e9)}B in ${g0.year} needs about <b>${fmt(required, 1)}% nominal US$ growth every year</b>.`;

  $("#scenarioCards").innerHTML = PRESETS.map((s, i) => `
    <div class="card scn">
      <h3>${s.name}</h3>
      <label>GDP growth <b id="gv${i}">${s.g.toFixed(1)}%</b></label>
      <input type="range" id="g${i}" min="0" max="15" step="0.1" value="${s.g}">
      <label>Population growth <b id="pv${i}">${s.p.toFixed(1)}%</b></label>
      <input type="range" id="p${i}" min="0" max="4" step="0.1" value="${s.p}">
      <div class="res">
        <div><span>GDP 2050</span><b id="r1${i}"></b></div>
        <div><span>Population 2050</span><b id="r2${i}"></b></div>
        <div><span>GDP per capita</span><b id="r3${i}"></b></div>
        <div><span>% of $6T target</span><b id="r4${i}"></b></div>
      </div>
    </div>`).join("");

  scenarioChart = new Chart($("#scenarioChart"), {
    data: {
      labels: PRESETS.map((s) => s.name),
      datasets: [
        { type: "bar", label: "GDP 2050 (US$ T)", data: [], backgroundColor: ["#15803d", "#22c55e", "#86efac"], borderRadius: 10 },
        { type: "line", label: "US$6T target", data: [6, 6, 6], borderColor: "#f59e0b", borderDash: [6, 6], pointRadius: 0, borderWidth: 2 },
      ],
    },
    options: { maintainAspectRatio: false, scales: { y: { beginAtZero: true } } },
  });

  const update = () => {
    const vals = PRESETS.map((_, i) => {
      const g = +$("#g" + i).value, p = +$("#p" + i).value;
      $("#gv" + i).textContent = g.toFixed(1) + "%";
      $("#pv" + i).textContent = p.toFixed(1) + "%";
      const gdp = g0.value * Math.pow(1 + g / 100, n);
      const pop = p0.value * Math.pow(1 + p / 100, n);
      $("#r1" + i).textContent = "$" + fmt(gdp / 1e12, 2) + "T";
      $("#r2" + i).textContent = fmt(pop / 1e6) + "M";
      $("#r3" + i).textContent = "$" + fmt(gdp / pop);
      $("#r4" + i).textContent = fmt((gdp / 6e12) * 100, 1) + "%";
      return +(gdp / 1e12).toFixed(2);
    });
    scenarioChart.data.datasets[0].data = vals;
    scenarioChart.update();
  };
  document.querySelectorAll("#scenarioCards input").forEach((el) => el.addEventListener("input", update));
  update();
}