/**
 * analytics.js
 * Stage 7: Advanced Analytics with filtering
 */

const analytics = (() => {
  let reportData = null;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]);
  }

  // ── Render ─────────────────────────────────────────────────────────
  function render(container) {
    container.innerHTML = `
      <div class="analytics-page">
        <header class="analytics-heading">
          <div>
            <p class="dashboard-eyebrow">ANALYSIS</p>
            <h1>Advanced analytics</h1>
            <p class="dashboard-intro-copy">Filter your trade history to compare performance across setups, sessions, and execution habits.</p>
          </div>
        </header>

        <div class="analytics-workspace">
          <aside class="analytics-filters">
            <div class="analytics-filter-heading">
              <div>
                <h2>Trade filters</h2>
                <p>Refine the trades included in this report.</p>
              </div>
              <button class="btn btn-secondary btn-sm" id="btn-clear-filters" type="button">Clear</button>
            </div>

          <form id="analytics-filter-form" class="filter-form">
            <div class="form-group">
              <span class="analytics-filter-label">Date range</span>
              <div class="analytics-date-range">
                <label for="analytics-date-from">From</label>
                <input type="date" id="analytics-date-from" name="date_from" class="form-control">
                <label for="analytics-date-to">To</label>
                <input type="date" id="analytics-date-to" name="date_to" class="form-control">
              </div>
            </div>
            
            <div class="form-group">
              <label for="analytics-pair">Pair / asset</label>
              <input type="text" id="analytics-pair" name="pair" class="form-control" placeholder="e.g. EURUSD, BTC, NAS100">
            </div>

            <div class="form-group">
              <label for="analytics-session">Session</label>
              <select id="analytics-session" name="session_filter" class="form-control">
                <option value="">All</option>
                <option value="Asia">Asia</option>
                <option value="London">London</option>
                <option value="New York">New York</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div class="form-group">
              <label for="analytics-direction">Direction</label>
              <select id="analytics-direction" name="direction" class="form-control">
                <option value="">All</option>
                <option value="Buy">Buy</option>
                <option value="Sell">Sell</option>
              </select>
            </div>

            <div class="form-group">
              <label for="analytics-setup-select">Setup</label>
              <select name="setup" class="form-control" id="analytics-setup-select">
                <option value="">All</option>
              </select>
            </div>

            <div class="form-group">
              <label for="analytics-result">Result</label>
              <select id="analytics-result" name="result" class="form-control">
                <option value="">All</option>
                <option value="Win">Win</option>
                <option value="Loss">Loss</option>
                <option value="BE">BE</option>
              </select>
            </div>

            <div class="form-group">
              <label for="analytics-rule-followed">Rule followed</label>
              <select id="analytics-rule-followed" name="rule_followed" class="form-control">
                <option value="">All</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Partially">Partially</option>
              </select>
            </div>

            <button type="submit" class="btn btn-primary analytics-apply-btn">Apply filters</button>
          </form>
          </aside>

          <section class="analytics-content" id="analytics-reports" aria-live="polite" aria-busy="true">
            <div class="loading-state" role="status"><div class="spinner"></div><p>Loading analytics…</p></div>
          </section>
        </div>
      </div>
    `;

    populateDropdowns();
    attachListeners();
    loadReport();
  }

  // ── Init & Listeners ───────────────────────────────────────────────
  function populateDropdowns() {
    const setupSelect = document.getElementById("analytics-setup-select");
    if (setupSelect && Array.isArray(app.state.setups)) {
      app.state.setups.forEach(s => {
        const option = document.createElement("option");
        option.value = s.name;
        option.textContent = s.name;
        setupSelect.appendChild(option);
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
      container.setAttribute("aria-busy", "true");
      container.innerHTML = `<div class="loading-state" role="status"><div class="spinner"></div><p>Applying filters…</p></div>`;
      reportData = await api.getAdvancedAnalytics(params);
      renderReports(container, reportData);
    } catch (err) {
      console.error("Advanced analytics failed:", err);
      container.setAttribute("aria-busy", "false");
      container.innerHTML = `
        <div class="empty-state analytics-state-message" role="alert">
          <span class="empty-icon">⚠️</span>
          <p>Unable to load analytics. Check your connection and try again.</p>
          <button class="btn btn-secondary" type="button" id="btn-retry-analytics">Try again</button>
        </div>`;
      document.getElementById("btn-retry-analytics")?.addEventListener("click", loadReport);
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
    container.setAttribute("aria-busy", "false");
  }

  function renderKPIs(kpis) {
    return `
      <div class="kpi-grid analytics-kpi-grid">
        <div class="kpi-card analytics-kpi-card">
          <div class="kpi-header"><span class="kpi-label">Filtered Trades</span></div>
          <div class="kpi-value">${kpis.total_trades}</div>
          <div class="kpi-subtext">W: ${kpis.wins} | L: ${kpis.losses} | BE: ${kpis.breakeven}</div>
        </div>
        <div class="kpi-card analytics-kpi-card">
          <div class="kpi-header"><span class="kpi-label">Filtered Win Rate</span></div>
          <div class="kpi-value">${kpis.win_rate.toFixed(1)}%</div>
          <div class="kpi-subtext">Profit Factor: ${kpis.profit_factor.toFixed(2)}</div>
        </div>
        <div class="kpi-card analytics-kpi-card">
          <div class="kpi-header"><span class="kpi-label">Filtered P&L</span></div>
          <div class="kpi-value ${app.formatMoney(kpis.total_pnl).includes('-')?'negative':'positive'}">${app.formatMoney(kpis.total_pnl)}</div>
          <div class="kpi-subtext">Avg R: ${app.formatR(kpis.avg_r)}</div>
        </div>
        <div class="kpi-card analytics-kpi-card">
          <div class="kpi-header"><span class="kpi-label">Averages</span></div>
          <div class="kpi-value analytics-average-value">Win: ${app.formatMoney(kpis.avg_win)}</div>
          <div class="kpi-subtext">Loss: ${app.formatMoney(kpis.avg_loss)}</div>
        </div>
      </div>
    `;
  }

  function renderSetupAnalysis(setups) {
    if (!setups || setups.length === 0) {
      return buildPanel("Setup Analysis", "<p class='text-muted analytics-empty-message'>No setups matched these filters.</p>");
    }
    const rows = setups.map(s => `
      <tr>
        <td><strong>${escapeHtml(s.setup)}</strong></td>
        <td>${s.trades}</td>
        <td>${s.win_rate.toFixed(1)}%</td>
        <td class="${s.pnl >= 0 ? 'positive' : 'negative'}">${app.formatMoney(s.pnl)}</td>
        <td class="${s.avg_r >= 0 ? 'positive' : 'negative'}">${app.formatR(s.avg_r)}</td>
      </tr>
    `).join("");
    return buildPanel("Setup Analysis", `
      <div class="analytics-table-wrap"><table class="data-table">
        <thead><tr><th>Setup</th><th>Trades</th><th>Win%</th><th>P&L</th><th>Avg R</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    `);
  }

  function renderSessionAnalysis(sessions) {
    if (!sessions || sessions.length === 0) {
      return buildPanel("Session Analysis", "<p class='text-muted analytics-empty-message'>No sessions matched these filters.</p>");
    }
    const rows = sessions.map(s => `
      <tr>
        <td><strong>${escapeHtml(s.session)}</strong></td>
        <td>${s.trades}</td>
        <td>${s.win_rate.toFixed(1)}%</td>
        <td class="${s.pnl >= 0 ? 'positive' : 'negative'}">${app.formatMoney(s.pnl)}</td>
        <td class="${s.avg_r >= 0 ? 'positive' : 'negative'}">${app.formatR(s.avg_r)}</td>
      </tr>
    `).join("");
    return buildPanel("Session Analysis", `
      <div class="analytics-table-wrap"><table class="data-table">
        <thead><tr><th>Session</th><th>Trades</th><th>Win%</th><th>P&L</th><th>Avg R</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    `);
  }

  function renderDirectionAnalysis(directions) {
    if (!directions || directions.length === 0) {
      return buildPanel("Direction Analysis", "<p class='text-muted analytics-empty-message'>No directions matched these filters.</p>");
    }
    const rows = directions.map(d => `
      <tr>
        <td><strong>${escapeHtml(d.direction)}</strong></td>
        <td>${d.trades}</td>
        <td>${d.win_rate.toFixed(1)}%</td>
        <td class="${d.pnl >= 0 ? 'positive' : 'negative'}">${app.formatMoney(d.pnl)}</td>
        <td class="${d.avg_r >= 0 ? 'positive' : 'negative'}">${app.formatR(d.avg_r)}</td>
      </tr>
    `).join("");
    return buildPanel("Direction Analysis", `
      <div class="analytics-table-wrap"><table class="data-table">
        <thead><tr><th>Direction</th><th>Trades</th><th>Win%</th><th>P&L</th><th>Avg R</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    `);
  }

  function renderMistakeAnalysis(mistakes) {
    if (!mistakes || mistakes.length === 0) {
      return buildPanel("Mistake Analysis", "<p class='text-muted analytics-empty-message'>No mistakes recorded for the selected trades.</p>");
    }
    const rows = mistakes.map(m => `
      <tr>
        <td><strong>${escapeHtml(m.mistake)}</strong></td>
        <td>${m.occurrences}</td>
        <td class="${m.total_pnl >= 0 ? 'positive' : 'negative'}">${app.formatMoney(m.total_pnl)}</td>
        <td class="${m.average_pnl >= 0 ? 'positive' : 'negative'}">${app.formatMoney(m.average_pnl)}</td>
      </tr>
    `).join("");
    return buildPanel("Mistake Analysis", `
      <div class="analytics-table-wrap"><table class="data-table">
        <thead><tr><th>Mistake</th><th>Occurrences</th><th>Total P&L</th><th>Avg P&L</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    `);
  }

  function buildPanel(title, content) {
    return `
      <div class="analytics-panel">
        <div class="panel-header"><h4>${title}</h4></div>
        <div class="panel-body analytics-panel-body">${content}</div>
      </div>
    `;
  }

  return { render };
})();
