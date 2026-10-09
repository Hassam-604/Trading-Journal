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
      <div id="dash-loading" style="padding: 40px; text-align: center; color: var(--text-muted);">
        Loading dashboard analytics...
      </div>
      <div id="dash-content" style="display: none;"></div>
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
      if (loading) loading.style.display = "none";
      if (dashContent) dashContent.style.display = "block";

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
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <div class="empty-title">Failed to load Dashboard data</div>
          <div class="empty-desc">${err.message || 'Please check backend server connection.'}</div>
          <button class="btn btn-secondary" style="margin-top: 15px;" onclick="dashboard.render(document.getElementById('content-body'))">Retry</button>
        </div>
      `;
    }
  },

  // ── 1. KPI Cards ──
  renderKPIs(container, kpi) {
    const pnlClass = kpi.total_pnl > 0 ? "text-win" : kpi.total_pnl < 0 ? "text-loss" : "text-be";
    const rClass = kpi.total_r > 0 ? "text-win" : kpi.total_r < 0 ? "text-loss" : "text-be";

    const kpiHtml = `
      <div class="kpi-grid">
        <!-- Account Balance -->
        <div class="kpi-card kpi-balance-card" onclick="app.openEditBalanceModal()" style="cursor: pointer;" title="Click to edit starting balance">
          <div class="kpi-header">
            <span class="kpi-label">Account Balance</span>
            <span class="kpi-icon" title="Edit Balance">💰 <span class="kpi-edit-icon" style="font-size:12px; opacity:0.7;">✏️</span></span>
          </div>
          <div class="kpi-value text-gold">$${kpi.current_balance.toFixed(2)}</div>
          <div class="kpi-subtext">Net P&L: <span class="${pnlClass}">${app.formatMoney(kpi.total_pnl)}</span> <span class="kpi-action-link" style="color:var(--color-gold); font-size:11px; margin-left:6px; opacity:0.8;">• Edit</span></div>
        </div>

        <!-- Total Trades -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Total Trades</span>
            <span class="kpi-icon">📋</span>
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
            <span class="kpi-icon">🎯</span>
          </div>
          <div class="kpi-value ${kpi.win_rate >= 50 ? 'text-win' : 'text-loss'}">${kpi.win_rate}%</div>
          <div class="kpi-subtext">${kpi.wins} wins of ${kpi.wins + kpi.losses} closed</div>
        </div>

        <!-- Total P&L -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Total P&L</span>
            <span class="kpi-icon">💵</span>
          </div>
          <div class="kpi-value ${pnlClass}">${app.formatMoney(kpi.total_pnl)}</div>
          <div class="kpi-subtext">Avg: ${app.formatMoney(kpi.total_trades > 0 ? kpi.total_pnl / kpi.total_trades : 0)} / trade</div>
        </div>

        <!-- Total R -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Total R-Multiple</span>
            <span class="kpi-icon">📐</span>
          </div>
          <div class="kpi-value ${rClass}">${app.formatR(kpi.total_r)}</div>
          <div class="kpi-subtext">Avg R: ${app.formatR(kpi.avg_r)}</div>
        </div>

        <!-- Profit Factor -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Profit Factor</span>
            <span class="kpi-icon">⚡</span>
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
            <div class="chart-title"><span>📈</span> Cumulative Equity Curve</div>
            <span class="badge badge-tag">${equityPoints.length} points</span>
          </div>
          <div class="chart-canvas-container">
            ${hasTrades 
              ? `<canvas id="dash-equity-canvas"></canvas>` 
              : `<div class="empty-state" style="padding: 40px 0;"><div class="empty-desc">No trade data for equity curve yet.</div></div>`
            }
          </div>
        </div>

        <!-- Monthly P&L -->
        <div class="chart-card">
          <div class="chart-card-header">
            <div class="chart-title"><span>📊</span> Monthly P&L ($)</div>
            <span class="badge badge-tag">${monthlyPnl.length} Months</span>
          </div>
          <div class="chart-canvas-container">
            ${monthlyPnl.length > 0 
              ? `<canvas id="dash-monthly-canvas"></canvas>` 
              : `<div class="empty-state" style="padding: 40px 0;"><div class="empty-desc">No monthly trade records yet.</div></div>`
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
            <td style="font-weight: 600;">${s.session}</td>
            <td>${s.trades}</td>
            <td><span class="text-win">${s.wins}</span> / <span class="text-loss">${s.losses}</span></td>
            <td><span class="badge ${s.win_rate >= 50 ? 'badge-win' : 'badge-loss'}">${s.win_rate}%</span></td>
            <td class="${pnlCls}" style="font-weight: 700;">${app.formatMoney(s.pnl)}</td>
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
            <td style="font-weight: 600;"><span class="badge badge-tag">${st.setup}</span></td>
            <td>${st.trades}</td>
            <td><span class="text-win">${st.wins}</span> / <span class="text-loss">${st.losses}</span></td>
            <td><span class="badge ${st.win_rate >= 50 ? 'badge-win' : 'badge-loss'}">${st.win_rate}%</span></td>
            <td class="${pnlCls}" style="font-weight: 700;">${app.formatMoney(st.pnl)}</td>
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
        <div class="table-card" style="padding: 16px;">
          <div class="section-title-bar">
            <div class="section-title"><span>🕒</span> Session Performance</div>
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
        <div class="table-card" style="padding: 16px;">
          <div class="section-title-bar">
            <div class="section-title"><span>🎯</span> Setup Performance</div>
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
          <tr style="cursor: pointer;" onclick="dashboard.openTradeDetailModal(${t.id})" title="Click to view details">
            <td>
              <div style="font-weight: 600;">${t.date}</div>
              <div class="text-muted" style="font-size: 11px;">${t.time}</div>
            </td>
            <td><b>${t.pair}</b> <span class="text-secondary" style="font-size: 11px;">(${t.session})</span></td>
            <td><span class="badge ${dirClass}">${t.direction}</span></td>
            <td>${t.setup ? `<span class="badge badge-tag">${t.setup}</span>` : '-'}</td>
            <td>${t.rr.toFixed(2)}</td>
            <td><span class="badge ${resClass}">${t.result}</span></td>
            <td class="${pnlClass}" style="font-weight: 700;">
              <div>${app.formatMoney(t.pnl)}</div>
              <div style="font-size: 11px;">${app.formatR(t.r_multiple)}</div>
            </td>
            <td>
              <button class="icon-btn" onclick="event.stopPropagation(); dashboard.openTradeDetailModal(${t.id})">👁️</button>
            </td>
          </tr>
        `;
      });
    } else {
      rowsHtml = `
        <tr>
          <td colspan="8">
            <div class="empty-state" style="padding: 24px;">
              <div class="empty-desc">No recent trades found. Click "Add Trade" above to begin.</div>
            </div>
          </td>
        </tr>
      `;
    }

    const recentHtml = `
      <div class="table-card" style="margin-top: 6px; padding: 18px 20px;">
        <div class="section-title-bar">
          <div class="section-title"><span>📒</span> Recent Trades</div>
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
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#1a202c",
            borderColor: "#283040",
            borderWidth: 1,
            titleColor: "#f0f3f8",
            bodyColor: "#9aa4b5",
            callbacks: {
              label: (ctx) => `Cumulative P&L: $${ctx.raw.toFixed(2)}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(255, 255, 255, 0.04)" },
            ticks: { color: "#5e697d", font: { size: 10 }, maxTicksLimit: 8 }
          },
          y: {
            grid: { color: "rgba(255, 255, 255, 0.04)" },
            ticks: {
              color: "#5e697d",
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
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#1a202c",
            borderColor: "#283040",
            borderWidth: 1,
            titleColor: "#f0f3f8",
            bodyColor: "#9aa4b5",
            callbacks: {
              label: (ctx) => `Net P&L: $${ctx.raw.toFixed(2)}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(255, 255, 255, 0.04)" },
            ticks: { color: "#5e697d", font: { size: 10 } }
          },
          y: {
            grid: { color: "rgba(255, 255, 255, 0.04)" },
            ticks: {
              color: "#5e697d",
              font: { size: 10 },
              callback: (val) => `$${val}`
            }
          }
        }
      }
    });
  }
};
