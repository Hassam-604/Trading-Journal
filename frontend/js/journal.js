/**
 * journal.js
 * Handles the Trade Journal table, filters, sorting, and Trade Details view.
 */

const journal = {
  state: {
    trades: [],
    totalCount: 0,
    filters: {
      skip: 0,
      limit: 50,
      sort_by: "date",
      sort_dir: "desc",
      pair: "",
      session: "",
      direction: "",
      result: ""
    },
    currentTrade: null // Used for details view
  },

  async render(container) {
    container.innerHTML = `
      <div class="toolbar-card">
        <div class="toolbar-row">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input type="text" id="j-search" class="search-input" placeholder="Search setup, notes...">
          </div>
          <input type="date" id="j-date-from" class="date-input" title="From Date">
          <input type="date" id="j-date-to" class="date-input" title="To Date">
          
          <select id="j-session" class="filter-select">
            <option value="">All Sessions</option>
            <option value="Asia">Asia</option>
            <option value="London">London</option>
            <option value="New York">New York</option>
            <option value="Other">Other</option>
          </select>

          <select id="j-direction" class="filter-select">
            <option value="">All Directions</option>
            <option value="Buy">Buy</option>
            <option value="Sell">Sell</option>
          </select>
          
          <select id="j-result" class="filter-select">
            <option value="">All Results</option>
            <option value="Win">Win</option>
            <option value="Loss">Loss</option>
            <option value="BE">BE</option>
          </select>
          
          <button class="btn btn-secondary btn-sm" onclick="journal.resetFilters()">Reset</button>
        </div>
      </div>

      <div class="table-card">
        <div class="table-responsive">
          <table class="data-table" id="journal-table">
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Pair / Session</th>
                <th>Direction</th>
                <th>Risk / RR</th>
                <th>Setup</th>
                <th>Result</th>
                <th class="sortable" data-sort="pnl">P&L ($)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="journal-tbody">
              <!-- Rendered via JS -->
            </tbody>
          </table>
        </div>
        <div class="pagination-bar">
          <div class="page-info" id="j-page-info">Showing 0 of 0 trades</div>
          <div class="page-controls">
            <button class="btn btn-secondary btn-sm" id="btn-prev" onclick="journal.prevPage()">Previous</button>
            <button class="btn btn-secondary btn-sm" id="btn-next" onclick="journal.nextPage()">Next</button>
          </div>
        </div>
      </div>
    `;

    this.attachFilterListeners();
    await this.loadTrades();
  },

  attachFilterListeners() {
    const ids = ["j-session", "j-direction", "j-result"];
    ids.forEach(id => {
      document.getElementById(id)?.addEventListener("change", (e) => {
        const key = id.replace("j-", "");
        this.state.filters[key] = e.target.value;
        this.state.filters.skip = 0; // Reset pagination
        this.loadTrades();
      });
    });
    
    // Setup Sort listeners on headers
    document.querySelectorAll(".data-table th.sortable").forEach(th => {
      th.addEventListener("click", () => {
        const sortCol = th.getAttribute("data-sort");
        if (this.state.filters.sort_by === sortCol) {
          this.state.filters.sort_dir = this.state.filters.sort_dir === "desc" ? "asc" : "desc";
        } else {
          this.state.filters.sort_by = sortCol;
          this.state.filters.sort_dir = "desc";
        }
        this.loadTrades();
      });
    });
  },

  resetFilters() {
    this.state.filters = {
      skip: 0,
      limit: 50,
      sort_by: "date",
      sort_dir: "desc",
      pair: "",
      session: "",
      direction: "",
      result: ""
    };
    document.getElementById("j-session").value = "";
    document.getElementById("j-direction").value = "";
    document.getElementById("j-result").value = "";
    this.loadTrades();
  },

  async loadTrades() {
    try {
      const tbody = document.getElementById("journal-tbody");
      if(tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 30px;">Loading trades...</td></tr>`;
      
      const params = {
        skip: this.state.filters.skip,
        limit: this.state.filters.limit,
        sort_by: this.state.filters.sort_by,
        sort_dir: this.state.filters.sort_dir,
        session_filter: this.state.filters.session,
        direction: this.state.filters.direction,
        result: this.state.filters.result
      };

      this.state.trades = await api.getTrades(params);
      const countData = await api.getTradeCount(params);
      this.state.totalCount = countData.count;
      
      this.renderTableBody();
      this.updatePagination();
    } catch (e) {
      console.error(e);
      const tbody = document.getElementById("journal-tbody");
      if(tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: var(--color-loss);">Failed to load trades.</td></tr>`;
    }
  },

  renderTableBody() {
    const tbody = document.getElementById("journal-tbody");
    if (!tbody) return;

    if (this.state.trades.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state" style="padding: 30px 10px;">
              <div class="empty-title">No trades found</div>
              <div class="empty-desc">Try adjusting your filters or add a new trade.</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    let html = "";
    this.state.trades.forEach(t => {
      // Badges styling
      const dirClass = t.direction === "Buy" ? "badge-buy" : "badge-sell";
      let resClass = "badge-be";
      if(t.result === "Win") resClass = "badge-win";
      if(t.result === "Loss") resClass = "badge-loss";

      const pnlClass = t.pnl > 0 ? "text-win" : t.pnl < 0 ? "text-loss" : "text-be";
      const pnlText = app.formatMoney(t.pnl);

      const setupHtml = t.setup ? t.setup.split(",").map(s => `<span class="badge badge-tag">${s.trim()}</span>`).join(" ") : "-";

      html += `
        <tr>
          <td>
            <div style="font-weight: 600;">${t.date}</div>
            <div class="text-secondary" style="font-size: 11px;">${t.time}</div>
          </td>
          <td>
            <div style="font-weight: 600;">${t.pair}</div>
            <div class="text-secondary" style="font-size: 11px;">${t.session}</div>
          </td>
          <td><span class="badge ${dirClass}">${t.direction}</span></td>
          <td>
            <div>Risk: $${t.risk.toFixed(2)}</div>
            <div class="text-secondary" style="font-size: 11px;">RR: ${t.rr.toFixed(2)}</div>
          </td>
          <td style="max-width: 150px; white-space: normal;">${setupHtml}</td>
          <td><span class="badge ${resClass}">${t.result}</span></td>
          <td class="${pnlClass}" style="font-weight: 700;">
            <div>${pnlText}</div>
            <div style="font-size: 11px;">${app.formatR(t.r_multiple)}</div>
          </td>
          <td>
            <div class="action-btns">
              <button class="icon-btn" title="View Details" onclick="journal.viewTrade(${t.id})">👁️</button>
              <button class="icon-btn" title="Edit" onclick="journal.editTrade(${t.id})">✏️</button>
              <button class="icon-btn danger" title="Delete" onclick="journal.deleteTrade(${t.id})">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  },

  updatePagination() {
    const info = document.getElementById("j-page-info");
    const btnPrev = document.getElementById("btn-prev");
    const btnNext = document.getElementById("btn-next");
    if (!info || !btnPrev || !btnNext) return;

    const start = this.state.filters.skip + 1;
    let end = this.state.filters.skip + this.state.filters.limit;
    if (end > this.state.totalCount) end = this.state.totalCount;

    if (this.state.totalCount === 0) {
      info.textContent = "Showing 0 trades";
    } else {
      info.textContent = `Showing ${start} - ${end} of ${this.state.totalCount} trades`;
    }

    btnPrev.disabled = this.state.filters.skip === 0;
    btnNext.disabled = end >= this.state.totalCount;
  },

  prevPage() {
    if (this.state.filters.skip >= this.state.filters.limit) {
      this.state.filters.skip -= this.state.filters.limit;
      this.loadTrades();
    }
  },

  nextPage() {
    this.state.filters.skip += this.state.filters.limit;
    this.loadTrades();
  },

  // ── Actions ──
  
  viewTrade(id) {
    const trade = this.state.trades.find(t => t.id === id);
    if(trade) {
      this.state.currentTrade = trade;
      app.openTradeDetails(trade);
    }
  },

  editTrade(id) {
    const trade = this.state.trades.find(t => t.id === id);
    if(trade) {
      app.openEditTradeModal(trade);
    }
  },

  editTradeFromDetails() {
    if (this.state.currentTrade) {
      app.closeTradeDetails();
      app.openEditTradeModal(this.state.currentTrade);
    }
  },

  async deleteTrade(id) {
    if(confirm("Are you sure you want to delete this trade? This cannot be undone.")) {
      try {
        await api.deleteTrade(id);
        app.showToast("Trade deleted");
        this.loadTrades();
        app.refreshGlobalStats();
      } catch(e) {
        // handled in api.js
      }
    }
  },

  async deleteTradeFromDetails() {
    if (this.state.currentTrade) {
      if(confirm("Are you sure you want to delete this trade? This cannot be undone.")) {
        try {
          await api.deleteTrade(this.state.currentTrade.id);
          app.showToast("Trade deleted");
          app.closeTradeDetails();
          this.loadTrades();
          app.refreshGlobalStats();
        } catch(e) {}
      }
    }
  },

  // ── Details View Rendering ──
  renderTradeDetails(trade) {
    const body = document.getElementById("trade-details-body");
    
    let resClass = "badge-be";
    if(trade.result === "Win") resClass = "badge-win";
    if(trade.result === "Loss") resClass = "badge-loss";
    const dirClass = trade.direction === "Buy" ? "badge-buy" : "badge-sell";
    const pnlClass = trade.pnl > 0 ? "text-win" : trade.pnl < 0 ? "text-loss" : "text-be";

    const getBiasHtml = (val) => {
      if(!val) return "-";
      let cl = "bias-neutral";
      if(val === "Bullish") cl = "bias-bullish";
      if(val === "Bearish") cl = "bias-bearish";
      return `<span class="bias-pill ${cl}">${val}</span>`;
    };

    let screenshotsHtml = "";
    if (trade.screenshots && trade.screenshots.length > 0) {
      screenshotsHtml = `
        <div class="form-section-header">Screenshots</div>
        <div class="screenshot-grid">
          ${trade.screenshots.map(ss => `
            <div class="screenshot-thumb-box" onclick="window.open('/api/screenshots/file/${ss.filename}', '_blank')">
              <span class="screenshot-badge">${ss.category}</span>
              <img src="/api/screenshots/file/${ss.filename}" alt="${ss.category}">
            </div>
          `).join('')}
        </div>
      `;
    }

    body.innerHTML = `
      <div style="display:flex; justify-content: space-between; align-items:flex-start; margin-bottom: 16px;">
        <div>
          <div style="font-size:18px; font-weight:700;">${trade.pair}</div>
          <div class="text-secondary">${trade.date} at ${trade.time} (${trade.session} Session)</div>
        </div>
        <div style="text-align:right;">
          <span class="badge ${dirClass}" style="font-size: 14px; padding: 4px 10px;">${trade.direction}</span>
          <span class="badge ${resClass}" style="font-size: 14px; padding: 4px 10px;">${trade.result}</span>
          <div class="${pnlClass}" style="font-size: 20px; font-weight: 700; margin-top: 4px;">
            ${app.formatMoney(trade.pnl)} <span style="font-size: 14px;">(${app.formatR(trade.r_multiple)})</span>
          </div>
        </div>
      </div>

      <div class="form-grid-3" style="background: var(--bg-input); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-default);">
        <div><div class="text-muted" style="font-size:10px;">ENTRY</div><div class="mono" style="font-weight:600;">${trade.entry_price}</div></div>
        <div><div class="text-muted" style="font-size:10px;">STOP LOSS</div><div class="mono" style="font-weight:600;">${trade.stop_loss}</div></div>
        <div><div class="text-muted" style="font-size:10px;">TAKE PROFIT</div><div class="mono" style="font-weight:600;">${trade.take_profit}</div></div>
        <div><div class="text-muted" style="font-size:10px;">RISK</div><div class="mono" style="font-weight:600;">$${trade.risk.toFixed(2)}</div></div>
        <div><div class="text-muted" style="font-size:10px;">RR</div><div class="mono" style="font-weight:600;">${trade.rr.toFixed(2)}</div></div>
        <div><div class="text-muted" style="font-size:10px;">SETUP</div><div style="font-weight:600;">${trade.setup || '-'}</div></div>
      </div>

      <div class="form-section-header">Market Context</div>
      <div class="form-grid-6 text-center">
        <div><div class="text-muted" style="font-size:10px;">DAILY</div>${getBiasHtml(trade.daily_bias)}</div>
        <div><div class="text-muted" style="font-size:10px;">H1</div>${getBiasHtml(trade.hourly_bias)}</div>
        <div><div class="text-muted" style="font-size:10px;">M30</div>${getBiasHtml(trade.m30_bias)}</div>
        <div><div class="text-muted" style="font-size:10px;">M15</div>${getBiasHtml(trade.m15_bias)}</div>
        <div><div class="text-muted" style="font-size:10px;">M5</div>${getBiasHtml(trade.m5_bias)}</div>
        <div><div class="text-muted" style="font-size:10px;">M1</div>${getBiasHtml(trade.m1_bias)}</div>
      </div>

      <div class="form-grid-3">
        <div><div class="text-muted" style="font-size:10px;">LIQUIDITY</div><div style="font-weight:600;">${trade.liquidity || '-'}</div></div>
        <div><div class="text-muted" style="font-size:10px;">DISPLACEMENT</div><div style="font-weight:600;">${trade.displacement || '-'}</div></div>
        <div><div class="text-muted" style="font-size:10px;">RULE FOLLOWED</div><div style="font-weight:600;">${trade.rule_followed || '-'}</div></div>
      </div>

      <div class="form-section-header">Review & Lessons</div>
      <div><div class="text-muted" style="font-size:10px;">MISTAKES</div><div style="color: var(--color-loss); font-weight:600;">${trade.mistake || 'None'}</div></div>
      
      ${trade.lesson ? `<div><div class="text-muted" style="font-size:10px;">LESSON</div><div style="background:var(--bg-input); padding: 8px; border-radius:4px; font-style:italic;">${trade.lesson}</div></div>` : ''}
      ${trade.notes ? `<div><div class="text-muted" style="font-size:10px;">NOTES</div><div style="background:var(--bg-input); padding: 8px; border-radius:4px;">${trade.notes}</div></div>` : ''}

      ${screenshotsHtml}
    `;
  }
};
