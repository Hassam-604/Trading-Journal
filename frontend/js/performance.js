/**
 * performance.js
 * Stage 6: Performance page — Yearly/Monthly/Weekly breakdown, Calendar view, Equity Curve.
 */

const performance = (() => {
  // ── State ──────────────────────────────────────────────────────────
  let yearData = [];
  let equityCurveChart = null;
  let calendarYear  = new Date().getFullYear();
  let calendarMonth = new Date().getMonth() + 1; // 1-indexed

  // ── Helpers ────────────────────────────────────────────────────────
  function fmt(v) { return v == null ? "–" : v; }
  function fmtPnl(v) {
    if (v == null) return "–";
    const cls = v >= 0 ? "positive" : "negative";
    const sign = v >= 0 ? "+" : "";
    return `<span class="${cls}">${sign}$${Number(v).toFixed(2)}</span>`;
  }
  function fmtR(v) {
    if (v == null) return "–";
    const cls = v >= 0 ? "positive" : "negative";
    const sign = v >= 0 ? "+" : "";
    return `<span class="${cls}">${sign}${Number(v).toFixed(2)}R</span>`;
  }
  function fmtWr(v) {
    if (v == null) return "–";
    return `${Number(v).toFixed(1)}%`;
  }
  function pnlClass(v) { return v >= 0 ? "positive" : "negative"; }

  const MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // ── Init ───────────────────────────────────────────────────────────
  async function init() {
    setupYearTabs();
    setupCalendarNav();
    await Promise.all([loadPerformance(), loadEquityCurve(), loadCalendar()]);
  }

  // ── Year Tabs ──────────────────────────────────────────────────────
  function setupYearTabs() {
    const btn = document.getElementById("perf-year-all");
    if (btn) btn.addEventListener("click", () => showYear("all"));
  }

  // ── Performance Data ───────────────────────────────────────────────
  async function loadPerformance() {
    const container = document.getElementById("perf-breakdown-container");
    if (!container) return;
    try {
      container.innerHTML = `<div class="loading-state" role="status"><div class="spinner"></div><p>Loading performance data…</p></div>`;
      yearData = await api.getYearlyPerformance();
      renderYearTabs();
      renderAllYears();
    } catch (err) {
      console.error("Performance data failed:", err);
      container.innerHTML = `<div class="empty-state perf-state-message" role="alert"><span class="empty-icon">⚠️</span><p>Unable to load performance data. Check your connection and try again.</p></div>`;
    }
  }

  function renderYearTabs() {
    const tabBar = document.getElementById("perf-year-tabs");
    if (!tabBar) return;
    // Remove old dynamic tabs
    tabBar.querySelectorAll(".dyn-year-tab").forEach(el => el.remove());
    const allBtn = document.getElementById("perf-year-all");
    yearData.forEach(y => {
      const btn = document.createElement("button");
      btn.className = "tab-btn dyn-year-tab";
      btn.textContent = y.year;
      btn.dataset.year = y.year;
      btn.addEventListener("click", () => showYear(y.year));
      tabBar.insertBefore(btn, allBtn.nextSibling);
    });
    // Activate "All" by default
    setActiveTab("all");
  }

  function setActiveTab(year) {
    document.querySelectorAll("#perf-year-tabs .tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.year == year || (year === "all" && btn.id === "perf-year-all"));
    });
  }

  function showYear(year) {
    setActiveTab(year);
    const container = document.getElementById("perf-breakdown-container");
    if (!container) return;
    if (year === "all") {
      renderAllYears();
    } else {
      const yd = yearData.find(y => y.year == year);
      if (yd) renderSingleYear(yd, container);
    }
  }

  function renderAllYears() {
    const container = document.getElementById("perf-breakdown-container");
    if (!container) return;
    if (!yearData.length) {
      container.innerHTML = `<div class="empty-state perf-state-message"><span class="empty-icon">📊</span><p>No trades recorded yet. Your performance breakdown will appear here after you record trades.</p></div>`;
      return;
    }
    container.innerHTML = yearData.map(y => buildYearHTML(y)).join("");
    attachToggleListeners();
  }

  function renderSingleYear(yd, container) {
    container.innerHTML = buildYearHTML(yd);
    attachToggleListeners();
  }

  function buildYearHTML(yd) {
    const monthRows = yd.months.map(m => buildMonthRows(m)).join("");
    return `
      <div class="perf-year-block">
        <div class="perf-year-header">
          <h3 class="perf-year-title">${yd.year}</h3>
          <div class="perf-year-summary">
            <span class="perf-stat"><span class="perf-stat-label">Trades</span> <strong>${yd.trades}</strong></span>
            <span class="perf-stat"><span class="perf-stat-label">Win Rate</span> <strong>${fmtWr(yd.win_rate)}</strong></span>
            <span class="perf-stat"><span class="perf-stat-label">P&amp;L</span> <strong class="${pnlClass(yd.pnl)}">${yd.pnl >= 0 ? "+" : ""}$${yd.pnl.toFixed(2)}</strong></span>
            <span class="perf-stat"><span class="perf-stat-label">Total R</span> <strong class="${pnlClass(yd.total_r)}">${yd.total_r >= 0 ? "+" : ""}${yd.total_r.toFixed(2)}R</strong></span>
          </div>
        </div>
        <div class="perf-table-wrap">
          <table class="perf-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Trades</th>
                <th>W</th>
                <th>L</th>
                <th>BE</th>
                <th>Win%</th>
                <th>P&amp;L ($)</th>
                <th>R Total</th>
              </tr>
            </thead>
            <tbody>${monthRows}</tbody>
          </table>
        </div>
      </div>`;
  }

  function buildMonthRows(m) {
    const weekRows = m.weeks.map(w => `
      <tr class="week-row hidden-row" data-parent="${m.month}">
        <td class="week-label"><span class="indent">↳</span> ${w.week_label}</td>
        <td>${w.trades}</td>
        <td class="positive">${w.wins}</td>
        <td class="negative">${w.losses}</td>
        <td>${w.breakeven}</td>
        <td>${fmtWr(w.win_rate)}</td>
        <td>${fmtPnl(w.pnl)}</td>
        <td>${fmtR(w.total_r)}</td>
      </tr>`).join("");

    return `
      <tr class="month-row toggleable" data-month="${m.month}" tabindex="0" aria-expanded="false">
        <td class="month-label"><span class="toggle-icon" aria-hidden="true">▶</span> ${m.month_label}</td>
        <td>${m.trades}</td>
        <td class="positive">${m.wins}</td>
        <td class="negative">${m.losses}</td>
        <td>${m.breakeven}</td>
        <td>${fmtWr(m.win_rate)}</td>
        <td>${fmtPnl(m.pnl)}</td>
        <td>${fmtR(m.total_r)}</td>
      </tr>
      ${weekRows}`;
  }

  function attachToggleListeners() {
    document.querySelectorAll(".month-row.toggleable").forEach(row => {
      const toggleMonth = () => {
        const month = row.dataset.month;
        const icon  = row.querySelector(".toggle-icon");
        const isOpen = icon.textContent === "▼";
        icon.textContent = isOpen ? "▶" : "▼";
        row.setAttribute("aria-expanded", String(!isOpen));
        row.closest(".perf-year-block")
          .querySelectorAll(`.week-row[data-parent="${month}"]`)
          .forEach(r => r.classList.toggle("hidden-row", isOpen));
      };
      row.addEventListener("click", toggleMonth);
      row.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleMonth();
        }
      });
    });
  }

  // ── Equity Curve ───────────────────────────────────────────────────
  async function loadEquityCurve() {
    const ctx = document.getElementById("perf-equity-chart");
    if (!ctx) return;
    try {
      const data = await api.getEquityCurve();
      renderEquityCurve(ctx, data);
    } catch (err) {
      console.error("Equity curve failed:", err);
      ctx.parentElement.innerHTML = `<div class="empty-state perf-state-message" role="alert"><span class="empty-icon">⚠️</span><p>Unable to load equity data. Check your connection and try again.</p></div>`;
    }
  }

  function renderEquityCurve(ctx, data) {
    if (equityCurveChart) { equityCurveChart.destroy(); equityCurveChart = null; }
    if (!data || data.length === 0) {
      ctx.parentElement.innerHTML = `<div class="empty-state"><span class="empty-icon">📈</span><p>No equity data yet.</p></div>`;
      return;
    }
    const labels = data.map((p, i) => `#${i + 1} (${p.date})`);
    const values = data.map(p => p.cumulative_pnl);
    const positiveColor = "rgba(34, 197, 94, 0.8)";
    const negativeColor = "rgba(239, 68, 68, 0.8)";

    equityCurveChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Cumulative P&L ($)",
          data: values,
          borderColor: values[values.length - 1] >= 0 ? positiveColor : negativeColor,
          backgroundColor: values[values.length - 1] >= 0
            ? "rgba(34, 197, 94, 0.08)"
            : "rgba(239, 68, 68, 0.08)",
          borderWidth: 2,
          pointRadius: data.length > 60 ? 0 : 3,
          pointHoverRadius: 5,
          fill: true,
          tension: 0.3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` $${ctx.parsed.y.toFixed(2)}`,
            },
          },
        },
        scales: {
          x: {
            ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10, color: "#9ca3af", font: { size: 11 } },
            grid: { color: "rgba(255,255,255,0.05)" },
          },
          y: {
            ticks: { color: "#9ca3af", callback: v => `$${v}` },
            grid: { color: "rgba(255,255,255,0.08)" },
          },
        },
      },
    });
  }

  // ── Calendar ───────────────────────────────────────────────────────
  function setupCalendarNav() {
    const prevBtn = document.getElementById("cal-prev");
    const nextBtn = document.getElementById("cal-next");
    if (prevBtn) prevBtn.addEventListener("click", () => { shiftMonth(-1); loadCalendar(); });
    if (nextBtn) nextBtn.addEventListener("click", () => { shiftMonth(1);  loadCalendar(); });
  }

  function shiftMonth(delta) {
    calendarMonth += delta;
    if (calendarMonth < 1)  { calendarMonth = 12; calendarYear--;  }
    if (calendarMonth > 12) { calendarMonth = 1;  calendarYear++;  }
  }

  async function loadCalendar() {
    const header = document.getElementById("cal-month-label");
    if (header) header.textContent = `${MONTH_NAMES[calendarMonth]} ${calendarYear}`;
    const grid = document.getElementById("cal-grid");
    if (!grid) return;
    try {
      grid.innerHTML = `<div class="loading-state" role="status" aria-label="Loading calendar data" style="grid-column:1/-1"><div class="spinner small"></div></div>`;
      const days = await api.getCalendar(calendarYear, calendarMonth);
      renderCalendar(grid, days);
    } catch (err) {
      console.error("Performance calendar failed:", err);
      grid.innerHTML = `<p class="perf-calendar-error" role="alert">Unable to load calendar data. Please try again.</p>`;
    }
  }

  function renderCalendar(grid, dayData) {
    // Build lookup: day → data
    const lookup = {};
    dayData.forEach(d => {
      const dayNum = parseInt(d.date.split("-")[2], 10);
      lookup[dayNum] = d;
    });

    const firstDay = new Date(calendarYear, calendarMonth - 1, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();

    grid.innerHTML = "";
    // Blank leading cells (Sunday = 0 offset)
    for (let i = 0; i < firstDay; i++) {
      grid.appendChild(Object.assign(document.createElement("div"), { className: "cal-cell empty" }));
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement("div");
      cell.className = "cal-cell";
      const data = lookup[d];
      const today = new Date();
      if (d === today.getDate() && calendarMonth === today.getMonth() + 1 && calendarYear === today.getFullYear()) {
        cell.classList.add("today");
      }
      if (data) {
        const isPos = data.pnl >= 0;
        cell.classList.add(isPos ? "cal-win-day" : "cal-loss-day");
        cell.innerHTML = `
          <span class="cal-day-num">${d}</span>
          <span class="cal-day-pnl ${isPos ? "positive" : "negative"}">${isPos ? "+" : ""}$${data.pnl.toFixed(0)}</span>
          <span class="cal-day-trades">${data.trades}T</span>`;
      } else {
        cell.innerHTML = `<span class="cal-day-num">${d}</span>`;
      }
      grid.appendChild(cell);
    }
  }

  // ── Render (called by app.js) ──────────────────────────────────────
  function render(container) {
    container.innerHTML = `
      <div class="perf-page">
        <header class="perf-page-header">
          <div>
            <p class="dashboard-eyebrow">PERFORMANCE</p>
            <h1>Performance</h1>
            <p class="dashboard-intro-copy">Explore your realized results over time, review daily outcomes, and expand each month for a weekly breakdown.</p>
          </div>
        </header>

        <section class="perf-section">
          <div class="perf-section-heading">
            <div>
              <h2>Equity curve</h2>
              <p>Cumulative realized P&amp;L across your recorded trades.</p>
            </div>
          </div>
          <div class="chart-card perf-chart-card">
            <canvas id="perf-equity-chart"></canvas>
          </div>
        </section>

        <section class="perf-section">
          <div class="perf-section-heading perf-calendar-heading">
            <div>
              <h2>Trade calendar</h2>
              <p>Daily realized results for the selected month.</p>
            </div>
            <div class="cal-nav">
              <button class="btn btn-secondary btn-sm" id="cal-prev" type="button" aria-label="Previous month">‹ Prev</button>
              <span class="cal-month-label" id="cal-month-label" aria-live="polite">${MONTH_NAMES[calendarMonth]} ${calendarYear}</span>
              <button class="btn btn-secondary btn-sm" id="cal-next" type="button" aria-label="Next month">Next ›</button>
            </div>
          </div>
          <div class="cal-wrapper">
            <div class="cal-day-headers">
              <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
            </div>
            <div class="cal-grid" id="cal-grid">
              <div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div></div>
            </div>
          </div>
        </section>

        <section class="perf-section">
          <div class="perf-section-heading perf-breakdown-heading">
            <div>
              <h2>Performance breakdown</h2>
              <p>Select a year, then expand a month to review its weekly results.</p>
            </div>
            <div class="tab-bar" id="perf-year-tabs">
              <button class="tab-btn active" id="perf-year-all" data-year="all">All Years</button>
            </div>
          </div>
          <div id="perf-breakdown-container">
            <div class="loading-state"><div class="spinner"></div><p>Loading…</p></div>
          </div>
        </section>

      </div>`;

    init();
  }

  // ── Public ─────────────────────────────────────────────────────────
  return { render };
})();
