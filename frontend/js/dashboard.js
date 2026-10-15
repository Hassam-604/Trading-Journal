/**
 * dashboard.js
 * Renders the Main Dashboard:
 * - High-level KPI summary cards
 * - Equity Curve (Line chart via Chart.js)
 * - Monthly P&L (Bar chart via Chart.js)
 * - Session Performance breakdown table
 * - Setup Performance breakdown table
 * - Recent 10 Trades table with instant modal preview
 */

const dashboard = {
  charts: {
    equity: null,
    monthly: null
  },

  async render(container) {
    container.innerHTML = `
      <div id="dash-loading" class="dashboard-loading" role="status">
        <span class="dashboard-spinner" aria-hidden="true"></span>
        <span>Loading your journal metrics…</span>
      </div>
      <div id="dash-content" class="dashboard-content" hidden></div>
    `;

    try {
      const [kpi, equityPoints, monthlyPnl, sessions, setups, recentTrades] = await Promise.all([
        api.getDashboardKPI(),
        api.getEquityCurve(),
        api.getMonthlyPnl(),
        api.getSessionPerformance(),
        api.getSetupPerformance(),
        api.getTrades({ limit: 10, sort_by: "date", sort_dir: "desc" })
      ]);

      const dashContent = document.getElementById("dash-content");
      const loading = document.getElementById("dash-loading");
      if (loading) loading.hidden = true;
      if (dashContent) dashContent.hidden = false;

      // Render all sections
      this.renderKPIs(dashContent, kpi);
      this.renderChartsSection(dashContent, equityPoints, monthlyPnl);
      this.renderBreakdownTables(dashContent, sessions, setups);
      this.renderRecentTrades(dashContent, recentTrades);

      // Initialize Charts
      this.initEquityChart(equityPoints);
      this.initMonthlyChart(monthlyPnl);

    } catch (err) {
      console.error("Dashboard render failed:", err);
      container.innerHTML = `
        <div class="empty-state dashboard-load-error">
          <div class="empty-icon">⚠️</div>
          <div class="empty-title">Failed to load Dashboard data</div>
          <div class="empty-desc">${err.message || 'Please check backend server connection.'}</div>
          <button class="btn btn-secondary" onclick="dashboard.render(document.getElementById('content-body'))">Retry</button>
        </div>
      `;
    }
  },

  // ── 1. KPI Cards ──
  renderKPIs(container, kpi) {
    const pnlClass = kpi.total_pnl > 0 ? "text-win" : kpi.total_pnl < 0 ? "text-loss" : "text-be";
    const rClass = kpi.total_r > 0 ? "text-win" : kpi.total_r < 0 ? "text-loss" : "text-be";

    const kpiHtml = `
      <header class="dashboard-intro">
        <div>
          <p class="dashboard-eyebrow">YOUR JOURNAL</p>
          <h1>Performance overview</h1>
          <p class="dashboard-intro-copy">Review your results, patterns, and recent execution.</p>
        </div>
      </header>
      <div class="kpi-grid">
        <!-- Account Balance -->
        <button type="button" class="kpi-card kpi-balance-card" onclick="app.openEditBalanceModal()" title="Edit starting balance">
          <span class="kpi-header">
            <span class="kpi-label">Account Balance</span>
            <span class="kpi-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M3 9h18m-5 4h2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
              <span class="kpi-edit-icon">↗</span>
            </span>
          </span>
          <span class="kpi-value text-gold">$${kpi.current_balance.toFixed(2)}</span>
          <span class="kpi-subtext">Net P&amp;L: <span class="${pnlClass}">${app.formatMoney(kpi.total_pnl)}</span> <span class="kpi-action-link">Edit balance</span></span>
        </button>

        <!-- Total Trades -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Total Trades</span>
            <span class="kpi-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none"><rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M9 8h6m-6 4h6m-6 4h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
            </span>
          </div>
          <div class="kpi-value">${kpi.total_trades}</div>
          <div class="kpi-subtext">
            <span class="text-win">${kpi.wins}W</span> &nbsp;|&nbsp; 
            <span class="text-loss">${kpi.losses}L</span> &nbsp;|&nbsp; 
            <span class="text-be">${kpi.breakeven}BE</span>
          </div>
        </div>

        <!-- Win Rate -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Win Rate</span>
            <span class="kpi-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>
            </span>
          </div>
          <div class="kpi-value ${kpi.win_rate >= 50 ? 'text-win' : 'text-loss'}">${kpi.win_rate}%</div>
          <div class="kpi-subtext">${kpi.wins} wins of ${kpi.wins + kpi.losses} closed</div>
        </div>

        <!-- Total P&L -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Total P&L</span>
            <span class="kpi-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none"><path d="M5 17 10 12l3 3 6-7m-5 0h5v5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
          </div>
          <div class="kpi-value ${pnlClass}">${app.formatMoney(kpi.total_pnl)}</div>
          <div class="kpi-subtext">Avg: ${app.formatMoney(kpi.total_trades > 0 ? kpi.total_pnl / kpi.total_trades : 0)} / trade</div>
        </div>

        <!-- Total R -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Total R-Multiple</span>
            <span class="kpi-icon kpi-icon-letter" aria-hidden="true">R</span>
          </div>
          <div class="kpi-value ${rClass}">${app.formatR(kpi.total_r)}</div>
          <div class="kpi-subtext">Avg R: ${app.formatR(kpi.avg_r)}</div>
        </div>

        <!-- Profit Factor -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Profit Factor</span>
            <span class="kpi-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none"><path d="m13.5 2-8 11h6l-1 9 8-12h-6l1-8Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
          </div>
          <div class="kpi-value text-primary">${kpi.profit_factor.toFixed(2)}</div>
          <div class="kpi-subtext">Best: <span class="text-win">${app.formatMoney(kpi.largest_win)}</span> | Worst: <span class="text-loss">${app.formatMoney(kpi.largest_loss)}</span></div>
        </div>
      </div>
    `;

    container.insertAdjacentHTML("beforeend", kpiHtml);
  },

  // ── 2. Charts Section ──
  renderChartsSection(container, equityPoints, monthlyPnl) {
    const hasTrades = equityPoints.length > 0;

    const chartsHtml = `
      <div class="dashboard-charts-grid">
        <!-- Equity Curve -->
        <div class="chart-card">
          <div class="chart-card-header">
            <div class="chart-title">Cumulative equity curve</div>
            <span class="badge badge-tag">${equityPoints.length} ${equityPoints.length === 1 ? "point" : "points"}</span>
          </div>
          <div class="chart-canvas-container">
            ${hasTrades 
              ? `<canvas id="dash-equity-canvas" role="img" aria-label="Cumulative equity curve"></canvas>`
              : `<div class="dashboard-chart-empty"><span class="dashboard-empty-mark" aria-hidden="true">—</span><p>No trade data for the equity curve yet.</p></div>`
            }
          </div>
        </div>

        <!-- Monthly P&L -->
        <div class="chart-card">
          <div class="chart-card-header">
            <div class="chart-title">Monthly P&amp;L</div>
            <span class="badge badge-tag">${monthlyPnl.length} ${monthlyPnl.length === 1 ? "month" : "months"}</span>
          </div>
          <div class="chart-canvas-container">
            ${monthlyPnl.length > 0 
              ? `<canvas id="dash-monthly-canvas" role="img" aria-label="Monthly profit and loss chart"></canvas>`
              : `<div class="dashboard-chart-empty"><span class="dashboard-empty-mark" aria-hidden="true">—</span><p>No monthly trade records yet.</p></div>`
            }
          </div>
        </div>
      </div>
    `;

    container.insertAdjacentHTML("beforeend", chartsHtml);
  },

  // ── 3. Performance Tables Section ──
  renderBreakdownTables(container, sessions, setups) {
    // Sessions rows
    let sessionRows = "";
    if (sessions && sessions.length > 0) {
      sessions.forEach(s => {
        const pnlCls = s.pnl > 0 ? "text-win" : s.pnl < 0 ? "text-loss" : "text-be";
        sessionRows += `
          <tr>
            <td class="dashboard-table-primary">${s.session}</td>
            <td>${s.trades}</td>
            <td><span class="text-win">${s.wins}</span> / <span class="text-loss">${s.losses}</span></td>
            <td><span class="badge ${s.win_rate >= 50 ? 'badge-win' : 'badge-loss'}">${s.win_rate}%</span></td>
            <td class="dashboard-table-pnl ${pnlCls}">${app.formatMoney(s.pnl)}</td>
            <td>${app.formatR(s.avg_r)}</td>
          </tr>
        `;
      });
    } else {
      sessionRows = `<tr><td colspan="6" style="text-align:center;" class="text-muted">No session data</td></tr>`;
    }

    // Setups rows
    let setupRows = "";
    if (setups && setups.length > 0) {
      setups.forEach(st => {
        const pnlCls = st.pnl > 0 ? "text-win" : st.pnl < 0 ? "text-loss" : "text-be";
        setupRows += `
          <tr>
              <td class="dashboard-table-primary"><span class="badge badge-tag">${st.setup}</span></td>
            <td>${st.trades}</td>
            <td><span class="text-win">${st.wins}</span> / <span class="text-loss">${st.losses}</span></td>
            <td><span class="badge ${st.win_rate >= 50 ? 'badge-win' : 'badge-loss'}">${st.win_rate}%</span></td>
              <td class="dashboard-table-pnl ${pnlCls}">${app.formatMoney(st.pnl)}</td>
            <td>${app.formatR(st.avg_r)}</td>
          </tr>
        `;
      });
    } else {
      setupRows = `<tr><td colspan="6" style="text-align:center;" class="text-muted">No setup data tagged yet</td></tr>`;
    }

    const tablesHtml = `
      <div class="dashboard-tables-grid">
        <!-- Session Performance -->
        <div class="table-card dashboard-table-card">
          <div class="section-title-bar">
            <div class="section-title">Session performance</div>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Trades</th>
                  <th>W / L</th>
                  <th>Win Rate</th>
                  <th>P&L</th>
                  <th>Avg R</th>
                </tr>
              </thead>
              <tbody>
                ${sessionRows}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Setup Performance -->
        <div class="table-card dashboard-table-card">
          <div class="section-title-bar">
            <div class="section-title">Setup performance</div>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Setup</th>
                  <th>Trades</th>
                  <th>W / L</th>
                  <th>Win Rate</th>
                  <th>P&L</th>
                  <th>Avg R</th>
                </tr>
              </thead>
              <tbody>
                ${setupRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    container.insertAdjacentHTML("beforeend", tablesHtml);
  },

  // ── 4. Recent Trades Table ──
  renderRecentTrades(container, trades) {
    let rowsHtml = "";
    if (trades && trades.length > 0) {
      trades.forEach(t => {
        const dirClass = t.direction === "Buy" ? "badge-buy" : "badge-sell";
        let resClass = "badge-be";
        if (t.result === "Win") resClass = "badge-win";
        if (t.result === "Loss") resClass = "badge-loss";
        const pnlClass = t.pnl > 0 ? "text-win" : t.pnl < 0 ? "text-loss" : "text-be";

        rowsHtml += `
          <tr class="dashboard-trade-row" onclick="dashboard.openTradeDetailModal(${t.id})" title="Click to view details">
            <td>
              <div class="dashboard-table-primary">${t.date}</div>
              <div class="dashboard-trade-time text-muted">${t.time}</div>
            </td>
            <td><b>${t.pair}</b> <span class="dashboard-trade-session text-secondary">(${t.session})</span></td>
            <td><span class="badge ${dirClass}">${t.direction}</span></td>
            <td>${t.setup ? `<span class="badge badge-tag">${t.setup}</span>` : '-'}</td>
            <td>${t.rr.toFixed(2)}</td>
            <td><span class="badge ${resClass}">${t.result}</span></td>
            <td class="dashboard-table-pnl ${pnlClass}">
              <div>${app.formatMoney(t.pnl)}</div>
              <div class="dashboard-trade-r">${app.formatR(t.r_multiple)}</div>
            </td>
            <td>
              <button class="icon-btn" type="button" aria-label="View trade details" title="View trade details" onclick="event.stopPropagation(); dashboard.openTradeDetailModal(${t.id})">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="12" r="2.5" stroke="currentColor" stroke-width="1.6"/></svg>
              </button>
            </td>
          </tr>
        `;
      });
    } else {
      rowsHtml = `
        <tr>
          <td colspan="8">
            <div class="dashboard-table-empty">
              <p>No recent trades yet.</p>
              <span>Add a trade to begin building your journal history.</span>
            </div>
          </td>
        </tr>
      `;
    }

    const recentHtml = `
      <div class="table-card dashboard-table-card dashboard-recent-trades">
        <div class="section-title-bar">
          <div class="section-title">Recent trades</div>
          <button class="btn btn-secondary btn-sm" onclick="app.navigateTo('journal')">View Full Journal →</button>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Pair / Session</th>
                <th>Direction</th>
                <th>Setup</th>
                <th>RR</th>
                <th>Result</th>
                <th>P&L ($)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.insertAdjacentHTML("beforeend", recentHtml);
  },

  async openTradeDetailModal(tradeId) {
    try {
      const trade = await api.getTrade(tradeId);
      if (trade) {
        app.openTradeDetails(trade);
      }
    } catch (e) {
      console.error(e);
    }
  },

  chartAnimation() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? false
      : { duration: 180 };
  },

  // ── 5. Chart.js Initializers ──
  initEquityChart(equityPoints) {
    const canvas = document.getElementById("dash-equity-canvas");
    if (!canvas || typeof Chart === "undefined" || equityPoints.length === 0) return;

    if (this.charts.equity) {
      this.charts.equity.destroy();
    }

    const labels = equityPoints.map((p, idx) => `#${idx + 1} (${p.date})`);
    const data = equityPoints.map(p => p.cumulative_pnl);

    const isPositive = data[data.length - 1] >= 0;
    const lineColor = isPositive ? "#10b981" : "#ef4444";
    const fillColor = isPositive ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)";

    const ctx = canvas.getContext("2d");
    this.charts.equity = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "Cumulative P&L ($)",
          data: data,
          borderColor: lineColor,
          backgroundColor: fillColor,
          fill: true,
          tension: 0.25,
          borderWidth: 2,
          pointRadius: equityPoints.length > 40 ? 1 : 3,
          pointHoverRadius: 6,
          pointBackgroundColor: lineColor,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: this.chartAnimation(),
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#181e26",
            borderColor: "#2a3440",
            borderWidth: 1,
            titleColor: "#f1f3f6",
            bodyColor: "#a4adba",
            callbacks: {
              label: (ctx) => `Cumulative P&L: $${ctx.raw.toFixed(2)}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(255, 255, 255, 0.04)" },
            ticks: { color: "#778392", font: { size: 10 }, maxTicksLimit: 8 }
          },
          y: {
            grid: { color: "rgba(255, 255, 255, 0.04)" },
            ticks: {
              color: "#778392",
              font: { size: 10 },
              callback: (val) => `$${val}`
            }
          }
        }
      }
    });
  },

  initMonthlyChart(monthlyPnl) {
    const canvas = document.getElementById("dash-monthly-canvas");
    if (!canvas || typeof Chart === "undefined" || monthlyPnl.length === 0) return;

    if (this.charts.monthly) {
      this.charts.monthly.destroy();
    }

    const labels = monthlyPnl.map(m => m.month);
    const data = monthlyPnl.map(m => m.pnl);
    const bgColors = data.map(val => val >= 0 ? "rgba(16, 185, 129, 0.7)" : "rgba(239, 68, 68, 0.7)");
    const borderColors = data.map(val => val >= 0 ? "#10b981" : "#ef4444");

    const ctx = canvas.getContext("2d");
    this.charts.monthly = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Monthly Net ($)",
          data: data,
          backgroundColor: bgColors,
          borderColor: borderColors,
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: this.chartAnimation(),
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#181e26",
            borderColor: "#2a3440",
            borderWidth: 1,
            titleColor: "#f1f3f6",
            bodyColor: "#a4adba",
            callbacks: {
              label: (ctx) => `Net P&L: $${ctx.raw.toFixed(2)}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(255, 255, 255, 0.04)" },
            ticks: { color: "#778392", font: { size: 10 } }
          },
          y: {
            grid: { color: "rgba(255, 255, 255, 0.04)" },
            ticks: {
              color: "#778392",
              font: { size: 10 },
              callback: (val) => `$${val}`
            }
          }
        }
      }
    });
  }
};
