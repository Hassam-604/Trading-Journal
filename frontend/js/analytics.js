/**
 * analytics.js
 * Stage 7: Advanced Analytics with filtering
 */

const analytics = (() => {
  let reportData = null;

  // ── Render ─────────────────────────────────────────────────────────
  function render(container) {
    container.innerHTML = `
      <div class="analytics-page">
        <!-- Filters Sidebar -->
        <aside class="analytics-filters">
          <div class="section-header">
            <h3 class="section-title">🔍 Filters</h3>
            <button class="btn btn-secondary btn-sm" id="btn-clear-filters">Clear</button>
          </div>
          
          <form id="analytics-filter-form" class="filter-form">
            <div class="form-group">
              <label>Date Range</label>
              <div style="display:flex;gap:8px;">
                <input type="date" name="date_from" class="form-control" title="From">
                <input type="date" name="date_to" class="form-control" title="To">
              </div>
            </div>
            
            <div class="form-group">
              <label>Pair / Asset</label>
              <input type="text" name="pair" class="form-control" placeholder="e.g. EURUSD, BTC, NAS100">
            </div>

            <div class="form-group">
              <label>Session</label>
              <select name="session_filter" class="form-control">
                <option value="">All</option>
                <option value="Asia">Asia</option>
                <option value="London">London</option>
                <option value="New York">New York</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div class="form-group">
              <label>Direction</label>
              <select name="direction" class="form-control">
                <option value="">All</option>
                <option value="Buy">Buy</option>
                <option value="Sell">Sell</option>
              </select>
            </div>

            <div class="form-group">
              <label>Setup</label>
              <select name="setup" class="form-control" id="analytics-setup-select">
                <option value="">All</option>
              </select>
            </div>

            <div class="form-group">
              <label>Result</label>
              <select name="result" class="form-control">
                <option value="">All</option>
                <option value="Win">Win</option>
                <option value="Loss">Loss</option>
                <option value="BE">BE</option>
              </select>
            </div>

            <div class="form-group">
              <label>Rule Followed</label>
              <select name="rule_followed" class="form-control">
                <option value="">All</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Partially">Partially</option>
              </select>
            </div>

            <button type="submit" class="btn btn-primary" style="width:100%;margin-top:12px;">Apply Filters</button>
          </form>
        </aside>

        <!-- Reports Area -->
        <main class="analytics-content" id="analytics-reports">
          <div class="loading-state"><div class="spinner"></div><p>Loading analytics…</p></div>
        </main>
      </div>
    `;

    populateDropdowns();
    attachListeners();
    loadReport();
  }

  // ── Init & Listeners ───────────────────────────────────────────────
  function populateDropdowns() {
    const setupSelect = document.getElementById("analytics-setup-select");
    if (setupSelect && app.state.setups) {
      app.state.setups.forEach(s => {
        setupSelect.insertAdjacentHTML("beforeend", `<option value="${s.name}">${s.name}</option>`);
      });
    }
  }

  function attachListeners() {
    const form = document.getElementById("analytics-filter-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        loadReport();
      });
    }
    const clearBtn = document.getElementById("btn-clear-filters");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (form) form.reset();
        loadReport();
      });
    }
  }

  // ── Data Loading ───────────────────────────────────────────────────
  async function loadReport() {
    const container = document.getElementById("analytics-reports");
    if (!container) return;

    // Get filters
    const params = {};
    const form = document.getElementById("analytics-filter-form");
    if (form) {
      const fd = new FormData(form);
      for (let [k, v] of fd.entries()) {
        if (v.trim() !== "") params[k] = v;
      }
    }

    try {
      container.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Applying filters…</p></div>`;
      reportData = await api.getAdvancedAnalytics(params);
      renderReports(container, reportData);
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><p>Error loading analytics data.</p></div>`;
    }
  }

  // ── Render Views ───────────────────────────────────────────────────
  function renderReports(container, data) {
    const kpis = renderKPIs(data.kpis);
    const setups = renderSetupAnalysis(data.setups);
    const sessions = renderSessionAnalysis(data.sessions);
    const directions = renderDirectionAnalysis(data.directions);
    const mistakes = renderMistakeAnalysis(data.mistakes);

    container.innerHTML = `
      <div class="analytics-sections">
        ${kpis}
        <div class="analytics-grid">
          ${setups}
          ${sessions}
        </div>
        <div class="analytics-grid">
          ${directions}
          ${mistakes}
        </div>
      </div>
    `;
  }

  function renderKPIs(kpis) {
    return `
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-header"><span class="kpi-label">Filtered Trades</span></div>
          <div class="kpi-value">${kpis.total_trades}</div>
          <div class="kpi-subtext">W: ${kpis.wins} | L: ${kpis.losses} | BE: ${kpis.breakeven}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header"><span class="kpi-label">Filtered Win Rate</span></div>
          <div class="kpi-value">${kpis.win_rate.toFixed(1)}%</div>
          <div class="kpi-subtext">Profit Factor: ${kpis.profit_factor.toFixed(2)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header"><span class="kpi-label">Filtered P&L</span></div>
          <div class="kpi-value ${app.formatMoney(kpis.total_pnl).includes('-')?'negative':'positive'}">${app.formatMoney(kpis.total_pnl)}</div>
          <div class="kpi-subtext">Avg R: ${app.formatR(kpis.avg_r)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header"><span class="kpi-label">Averages</span></div>
          <div class="kpi-value" style="font-size:18px;">Win: ${app.formatMoney(kpis.avg_win)}</div>
          <div class="kpi-subtext">Loss: ${app.formatMoney(kpis.avg_loss)}</div>
        </div>
      </div>
    `;
  }

  function renderSetupAnalysis(setups) {
    if (!setups || setups.length === 0) {
      return buildPanel("Setup Analysis", "<p class='text-muted' style='padding:16px;'>No setups matched.</p>");
    }
    const rows = setups.map(s => `
      <tr>
        <td><strong>${s.setup}</strong></td>
        <td>${s.trades}</td>
        <td>${s.win_rate.toFixed(1)}%</td>
        <td class="${s.pnl >= 0 ? 'positive' : 'negative'}">${app.formatMoney(s.pnl)}</td>
        <td class="${s.avg_r >= 0 ? 'positive' : 'negative'}">${app.formatR(s.avg_r)}</td>
      </tr>
    `).join("");
    return buildPanel("Setup Analysis", `
      <table class="data-table">
        <thead><tr><th>Setup</th><th>Trades</th><th>Win%</th><th>P&L</th><th>Avg R</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `);
  }

  function renderSessionAnalysis(sessions) {
    if (!sessions || sessions.length === 0) {
      return buildPanel("Session Analysis", "<p class='text-muted' style='padding:16px;'>No sessions matched.</p>");
    }
    const rows = sessions.map(s => `
      <tr>
        <td><strong>${s.session}</strong></td>
        <td>${s.trades}</td>
        <td>${s.win_rate.toFixed(1)}%</td>
        <td class="${s.pnl >= 0 ? 'positive' : 'negative'}">${app.formatMoney(s.pnl)}</td>
        <td class="${s.avg_r >= 0 ? 'positive' : 'negative'}">${app.formatR(s.avg_r)}</td>
      </tr>
    `).join("");
    return buildPanel("Session Analysis", `
      <table class="data-table">
        <thead><tr><th>Session</th><th>Trades</th><th>Win%</th><th>P&L</th><th>Avg R</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `);
  }

  function renderDirectionAnalysis(directions) {
    if (!directions || directions.length === 0) {
      return buildPanel("Direction Analysis", "<p class='text-muted' style='padding:16px;'>No directions matched.</p>");
    }
    const rows = directions.map(d => `
      <tr>
        <td><strong>${d.direction}</strong></td>
        <td>${d.trades}</td>
        <td>${d.win_rate.toFixed(1)}%</td>
        <td class="${d.pnl >= 0 ? 'positive' : 'negative'}">${app.formatMoney(d.pnl)}</td>
        <td class="${d.avg_r >= 0 ? 'positive' : 'negative'}">${app.formatR(d.avg_r)}</td>
      </tr>
    `).join("");
    return buildPanel("Direction Analysis", `
      <table class="data-table">
        <thead><tr><th>Direction</th><th>Trades</th><th>Win%</th><th>P&L</th><th>Avg R</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `);
  }

  function renderMistakeAnalysis(mistakes) {
    if (!mistakes || mistakes.length === 0) {
      return buildPanel("Mistake Analysis", "<p class='text-muted' style='padding:16px;'>No mistakes recorded.</p>");
    }
    const rows = mistakes.map(m => `
      <tr>
        <td><strong>${m.mistake}</strong></td>
        <td>${m.occurrences}</td>
        <td class="${m.total_pnl >= 0 ? 'positive' : 'negative'}">${app.formatMoney(m.total_pnl)}</td>
        <td class="${m.average_pnl >= 0 ? 'positive' : 'negative'}">${app.formatMoney(m.average_pnl)}</td>
      </tr>
    `).join("");
    return buildPanel("Mistake Analysis", `
      <table class="data-table">
        <thead><tr><th>Mistake</th><th>Occurrences</th><th>Total P&L</th><th>Avg P&L</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `);
  }

  function buildPanel(title, content) {
    return `
      <div class="analytics-panel">
        <div class="panel-header"><h4>${title}</h4></div>
        <div class="panel-body">${content}</div>
      </div>
    `;
  }

  return { render };
})();
