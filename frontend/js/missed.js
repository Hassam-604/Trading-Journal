/**
 * missed.js
 * Handles the Missed / Planned Trades feature (Stage 4).
 * Allows traders to record setups/levels planned but not activated,
 * track reasons not activated, and prepare them for later Level Retesting.
 */

const missedTrades = {
  state: {
    trades: [],
    totalCount: 0,
    filters: {
      skip: 0,
      limit: 50,
      status: "",
      direction: "",
      session: "",
      search: "",
      sort_by: "planned_date",
      sort_dir: "desc"
    },
    editingId: null,
    currentTrade: null,
    pendingScreenshots: [],
    existingScreenshots: []
  },

  async render(container) {
    container.innerHTML = `
      <!-- Toolbar & Status Summary Bar -->
      <div class="toolbar-card">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:8px;">
          <div>
            <div style="font-weight:700; font-size:15px;">🎯 Planned & Missed Levels</div>
            <div class="text-secondary" style="font-size:12px;">Track valid planned levels that were not activated to study if they react later.</div>
          </div>
          <button class="btn btn-gold" onclick="missedTrades.openAddModal()">+ Plan Trade / Level</button>
        </div>

        <div class="toolbar-row">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input type="text" id="m-search" class="search-input" placeholder="Search setup, reason, notes...">
          </div>

          <select id="m-status" class="filter-select">
            <option value="">All Statuses</option>
            <option value="Waiting">Waiting</option>
            <option value="Not Activated">Not Activated</option>
            <option value="Later Tested">Later Tested</option>
            <option value="Invalidated">Invalidated</option>
          </select>

          <select id="m-session" class="filter-select">
            <option value="">All Sessions</option>
            <option value="Asia">Asia</option>
            <option value="London">London</option>
            <option value="New York">New York</option>
            <option value="Other">Other</option>
          </select>

          <select id="m-direction" class="filter-select">
            <option value="">All Directions</option>
            <option value="Buy">Buy</option>
            <option value="Sell">Sell</option>
          </select>

          <button class="btn btn-secondary btn-sm" onclick="missedTrades.resetFilters()">Reset</button>
        </div>
      </div>

      <!-- Planned Trades Table -->
      <div class="table-card">
        <div class="table-responsive">
          <table class="data-table" id="missed-table">
            <thead>
              <tr>
                <th class="sortable" data-sort="planned_date">Planned Date</th>
                <th>Pair / Session</th>
                <th>Direction</th>
                <th class="sortable" data-sort="planned_entry">Level / Entry</th>
                <th>Target / Inval.</th>
                <th>Expected RR</th>
                <th>Setup</th>
                <th>Reason Not Activated</th>
                <th>Status</th>
                <th>Retests</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="missed-tbody">
              <!-- Rendered via JS -->
            </tbody>
          </table>
        </div>

        <div class="pagination-bar">
          <div class="page-info" id="m-page-info">Showing 0 of 0 planned trades</div>
          <div class="page-controls">
            <button class="btn btn-secondary btn-sm" id="m-btn-prev" onclick="missedTrades.prevPage()">Previous</button>
            <button class="btn btn-secondary btn-sm" id="m-btn-next" onclick="missedTrades.nextPage()">Next</button>
          </div>
        </div>
      </div>
    `;

    this.attachFilterListeners();
    await this.loadTrades();
  },

  attachFilterListeners() {
    const searchInput = document.getElementById("m-search");
    let debounceTimer;
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.state.filters.search = e.target.value;
          this.state.filters.skip = 0;
          this.loadTrades();
        }, 300);
      });
    }

    const selectIds = ["m-status", "m-session", "m-direction"];
    selectIds.forEach(id => {
      document.getElementById(id)?.addEventListener("change", (e) => {
        const key = id.replace("m-", "");
        this.state.filters[key] = e.target.value;
        this.state.filters.skip = 0;
        this.loadTrades();
      });
    });

    document.querySelectorAll("#missed-table th.sortable").forEach(th => {
      th.addEventListener("click", () => {
        const col = th.getAttribute("data-sort");
        if (this.state.filters.sort_by === col) {
          this.state.filters.sort_dir = this.state.filters.sort_dir === "desc" ? "asc" : "desc";
        } else {
          this.state.filters.sort_by = col;
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
      status: "",
      direction: "",
      session: "",
      search: "",
      sort_by: "planned_date",
      sort_dir: "desc"
    };
    if (document.getElementById("m-search")) document.getElementById("m-search").value = "";
    if (document.getElementById("m-status")) document.getElementById("m-status").value = "";
    if (document.getElementById("m-session")) document.getElementById("m-session").value = "";
    if (document.getElementById("m-direction")) document.getElementById("m-direction").value = "";
    this.loadTrades();
  },

  async loadTrades() {
    const tbody = document.getElementById("missed-tbody");
    if (tbody) tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:30px;">Loading planned levels...</td></tr>`;

    try {
      const params = {
        skip: this.state.filters.skip,
        limit: this.state.filters.limit,
        status: this.state.filters.status,
        direction: this.state.filters.direction,
        session: this.state.filters.session,
        search: this.state.filters.search,
        sort_by: this.state.filters.sort_by,
        sort_dir: this.state.filters.sort_dir
      };

      this.state.trades = await api.getPlannedTrades(params);
      const countData = await api.getPlannedTradeCount(params);
      this.state.totalCount = countData.count;

      this.renderTableBody();
      this.updatePagination();
    } catch (e) {
      console.error(e);
      if (tbody) tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; color: var(--color-loss);">Failed to load planned trades.</td></tr>`;
    }
  },

  renderTableBody() {
    const tbody = document.getElementById("missed-tbody");
    if (!tbody) return;

    if (this.state.trades.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11">
            <div class="empty-state" style="padding: 30px;">
              <div class="empty-icon">🎯</div>
              <div class="empty-title">No planned trades found</div>
              <div class="empty-desc">Click "+ Plan Trade / Level" above to record a planned setup or level.</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    let html = "";
    this.state.trades.forEach(t => {
      const dirClass = t.direction === "Buy" ? "badge-buy" : "badge-sell";

      // Status Badge
      let statusClass = "badge-be";
      if (t.status === "Waiting") statusClass = "bias-bullish";
      if (t.status === "Not Activated") statusClass = "badge-tag";
      if (t.status === "Later Tested") statusClass = "badge-win";
      if (t.status === "Invalidated") statusClass = "badge-loss";

      const setupHtml = t.setup 
        ? t.setup.split(",").map(s => `<span class="badge badge-tag">${s.trim()}</span>`).join(" ") 
        : "-";

      const testsCount = t.level_tests ? t.level_tests.length : 0;
      const testsBadge = testsCount > 0 
        ? `<span class="badge badge-win" style="cursor:pointer;" title="View retests">${testsCount} Test${testsCount > 1 ? 's' : ''}</span>`
        : `<span class="text-muted" style="font-size:11px;">0 Tests</span>`;

      html += `
        <tr>
          <td>
            <div style="font-weight: 600;">${t.planned_date}</div>
            <div class="text-secondary" style="font-size: 11px;">${t.timeframe || 'TF: -'}</div>
          </td>
          <td>
            <div style="font-weight: 600;">${t.pair}</div>
            <div class="text-secondary" style="font-size: 11px;">${t.session || '-'}</div>
          </td>
          <td><span class="badge ${dirClass}">${t.direction}</span></td>
          <td class="mono" style="font-weight:700; color: var(--gold-accent);">${t.planned_entry}</td>
          <td class="mono" style="font-size:11px;">
            <div>TP: ${t.target || '-'}</div>
            <div class="text-secondary">SL: ${t.invalidation || '-'}</div>
          </td>
          <td><b>${t.expected_rr ? t.expected_rr.toFixed(2) + 'R' : '-'}</b></td>
          <td style="max-width: 140px; white-space: normal;">${setupHtml}</td>
          <td style="font-size: 11px; max-width: 150px; white-space: normal; color: var(--text-secondary);">
            ${t.reason_not_activated || '-'}
          </td>
          <td><span class="badge ${statusClass}">${t.status}</span></td>
          <td>${testsBadge}</td>
          <td>
            <div class="action-btns">
              <button class="icon-btn" title="View Details" onclick="missedTrades.viewTrade(${t.id})">👁️</button>
              <button class="icon-btn" title="Edit" onclick="missedTrades.editTrade(${t.id})">✏️</button>
              <button class="icon-btn danger" title="Delete" onclick="missedTrades.deleteTrade(${t.id})">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  },

  updatePagination() {
    const info = document.getElementById("m-page-info");
    const btnPrev = document.getElementById("m-btn-prev");
    const btnNext = document.getElementById("m-btn-next");
    if (!info || !btnPrev || !btnNext) return;

    const start = this.state.filters.skip + 1;
    let end = this.state.filters.skip + this.state.filters.limit;
    if (end > this.state.totalCount) end = this.state.totalCount;

    if (this.state.totalCount === 0) {
      info.textContent = "Showing 0 planned trades";
    } else {
      info.textContent = `Showing ${start} - ${end} of ${this.state.totalCount} planned trades`;
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
  async viewTrade(id) {
    try {
      const trade = await api.getPlannedTrade(id);
      if (trade) {
        this.state.currentTrade = trade;
        this.renderDetailsModal(trade);
      }
    } catch (e) {
      console.error(e);
    }
  },

  async editTrade(id) {
    try {
      const trade = await api.getPlannedTrade(id);
      if (trade) {
        this.openEditModal(trade);
      }
    } catch (e) {
      console.error(e);
    }
  },

  async deleteTrade(id) {
    if (confirm("Are you sure you want to delete this planned trade/level? Linked level tests will also be removed.")) {
      try {
        await api.deletePlannedTrade(id);
        app.showToast("Planned trade deleted");
        this.loadTrades();
      } catch (e) {}
    }
  },

  // ── Modal Form: Add / Edit Planned Trade ──
  openAddModal() {
    this.state.editingId = null;
    this.state.pendingScreenshots = [];
    this.state.existingScreenshots = [];
    this.renderFormModal();
  },

  openEditModal(trade) {
    this.state.editingId = trade.id;
    this.state.pendingScreenshots = [];
    this.state.existingScreenshots = trade.screenshots || [];
    this.renderFormModal(trade);
  },

  renderFormModal(trade = null) {
    const isEdit = !!trade;
    const overlay = document.getElementById("trade-modal-overlay");
    const title = document.getElementById("trade-modal-title");
    title.textContent = isEdit ? "Edit Planned Trade / Level" : "Plan New Trade / Level";

    const todayStr = new Date().toISOString().split("T")[0];
    const dateVal = isEdit ? trade.planned_date : todayStr;

    const setupsHtml = app.state.setups.map(s =>
      `<span class="tag-pill ${isEdit && trade.setup && trade.setup.includes(s.name) ? 'active' : ''}" data-type="setup">${s.name}</span>`
    ).join("");

    const reasons = [
      "Price never reached level",
      "Entry condition not triggered",
      "Confirmation never appeared",
      "Price reversed before entry",
      "I was away",
      "Other"
    ];

    const body = document.getElementById("trade-modal-body");
    body.innerHTML = `
      <form id="planned-form">
        <div class="form-grid-3">
          <div class="form-group">
            <label>Planned Date *</label>
            <input type="date" class="form-input" id="pf-date" value="${dateVal}" required>
          </div>
          <div class="form-group">
            <label>Pair *</label>
            <input type="text" class="form-input" id="pf-pair" value="${isEdit ? trade.pair : 'XAUUSD'}" required>
          </div>
          <div class="form-group">
            <label>Direction *</label>
            <select class="form-input" id="pf-direction" required>
              <option value="Buy" ${isEdit && trade.direction==='Buy'?'selected':''}>Buy</option>
              <option value="Sell" ${isEdit && trade.direction==='Sell'?'selected':''}>Sell</option>
            </select>
          </div>
        </div>

        <div class="form-section-header">Level & Targets</div>
        <div class="form-grid-3">
          <div class="form-group">
            <label>Planned Entry (Level) *</label>
            <input type="number" step="0.001" class="form-input mono" id="pf-entry" value="${isEdit ? trade.planned_entry : ''}" required>
          </div>
          <div class="form-group">
            <label>Invalidation / SL</label>
            <input type="number" step="0.001" class="form-input mono" id="pf-inval" value="${isEdit && trade.invalidation ? trade.invalidation : ''}">
          </div>
          <div class="form-group">
            <label>Target / TP</label>
            <input type="number" step="0.001" class="form-input mono" id="pf-target" value="${isEdit && trade.target ? trade.target : ''}">
          </div>
        </div>

        <div class="form-grid-3">
          <div class="form-group">
            <label>Expected RR</label>
            <input type="number" step="0.01" class="form-input mono" id="pf-rr" value="${isEdit && trade.expected_rr ? trade.expected_rr : ''}" placeholder="e.g. 3.0">
          </div>
          <div class="form-group">
            <label>Session</label>
            <select class="form-input" id="pf-session">
              <option value="">- Select -</option>
              <option value="Asia" ${isEdit && trade.session==='Asia'?'selected':''}>Asia</option>
              <option value="London" ${isEdit && trade.session==='London'?'selected':''}>London</option>
              <option value="New York" ${isEdit && trade.session==='New York'?'selected':''}>New York</option>
              <option value="Other" ${isEdit && trade.session==='Other'?'selected':''}>Other</option>
            </select>
          </div>
          <div class="form-group">
            <label>Timeframe</label>
            <select class="form-input" id="pf-timeframe">
              <option value="">- Select -</option>
              <option value="Daily" ${isEdit && trade.timeframe==='Daily'?'selected':''}>Daily</option>
              <option value="H4" ${isEdit && trade.timeframe==='H4'?'selected':''}>H4</option>
              <option value="H1" ${isEdit && trade.timeframe==='H1'?'selected':''}>H1</option>
              <option value="M30" ${isEdit && trade.timeframe==='M30'?'selected':''}>M30</option>
              <option value="M15" ${isEdit && trade.timeframe==='M15'?'selected':''}>M15</option>
              <option value="M5" ${isEdit && trade.timeframe==='M5'?'selected':''}>M5</option>
              <option value="M1" ${isEdit && trade.timeframe==='M1'?'selected':''}>M1</option>
            </select>
          </div>
        </div>

        <div class="form-section-header">Status & Activation</div>
        <div class="form-grid-2">
          <div class="form-group">
            <label>Status *</label>
            <select class="form-input" id="pf-status" required>
              <option value="Waiting" ${!isEdit || trade.status==='Waiting'?'selected':''}>Waiting (Pending return)</option>
              <option value="Not Activated" ${isEdit && trade.status==='Not Activated'?'selected':''}>Not Activated</option>
              <option value="Later Tested" ${isEdit && trade.status==='Later Tested'?'selected':''}>Later Tested</option>
              <option value="Invalidated" ${isEdit && trade.status==='Invalidated'?'selected':''}>Invalidated</option>
            </select>
          </div>
          <div class="form-group">
            <label>Reason Not Activated</label>
            <select class="form-input" id="pf-reason">
              <option value="">- Select reason if missed -</option>
              ${reasons.map(r => `<option value="${r}" ${isEdit && trade.reason_not_activated===r?'selected':''}>${r}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Setup Tags</label>
          <div class="tag-picker" id="pf-setup-picker">
            ${setupsHtml}
          </div>
        </div>

        <div class="form-group">
          <label>Notes / Analysis</label>
          <textarea class="form-input" id="pf-notes" rows="3" placeholder="Context of why this level was identified...">${isEdit && trade.notes ? trade.notes : ''}</textarea>
        </div>

        <div class="form-section-header">Screenshots</div>
        <div class="form-group">
          <input type="file" id="pf-screenshot-input" accept="image/*" multiple style="display:none;">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('pf-screenshot-input').click()">+ Add Level Screenshot</button>
          <div id="pf-screenshot-preview" class="screenshot-grid" style="margin-top: 10px;"></div>
        </div>
      </form>
    `;

    // Swap Save Button Action to missedTrades.savePlannedTrade
    const saveBtn = document.getElementById("trade-modal-save");
    saveBtn.onclick = () => missedTrades.savePlannedTrade();
    saveBtn.textContent = isEdit ? "Update Planned Level" : "Save Planned Level";

    this.attachFormListeners();
    this.renderScreenshotPreviews();
    overlay.classList.add("active");
  },

  attachFormListeners() {
    // Tag Picker toggle
    document.querySelectorAll("#pf-setup-picker .tag-pill").forEach(pill => {
      pill.addEventListener("click", () => pill.classList.toggle("active"));
    });

    // Auto-calculate RR if entry, invalidation, and target filled
    const calcRR = () => {
      const e = parseFloat(document.getElementById("pf-entry")?.value);
      const sl = parseFloat(document.getElementById("pf-inval")?.value);
      const tp = parseFloat(document.getElementById("pf-target")?.value);
      const dir = document.getElementById("pf-direction")?.value;
      const rrInput = document.getElementById("pf-rr");

      if (!isNaN(e) && !isNaN(sl) && !isNaN(tp) && rrInput && !rrInput.value) {
        const risk = dir === "Buy" ? e - sl : sl - e;
        const reward = dir === "Buy" ? tp - e : e - tp;
        if (risk > 0 && reward > 0) {
          rrInput.value = (reward / risk).toFixed(2);
        }
      }
    };

    document.getElementById("pf-entry")?.addEventListener("blur", calcRR);
    document.getElementById("pf-inval")?.addEventListener("blur", calcRR);
    document.getElementById("pf-target")?.addEventListener("blur", calcRR);

    // Screenshots
    document.getElementById("pf-screenshot-input")?.addEventListener("change", (e) => {
      const files = e.target.files;
      for (let i = 0; i < files.length; i++) {
        this.state.pendingScreenshots.push({
          file: files[i],
          category: "planned",
          url: URL.createObjectURL(files[i])
        });
      }
      this.renderScreenshotPreviews();
      e.target.value = "";
    });
  },

  renderScreenshotPreviews() {
    const container = document.getElementById("pf-screenshot-preview");
    if (!container) return;
    let html = "";

    this.state.existingScreenshots.forEach((ss, idx) => {
      html += `
        <div class="screenshot-thumb-box">
          <img src="/api/screenshots/file/${ss.filename}">
          <div class="screenshot-actions">
            <span>${ss.category}</span>
            <button type="button" class="icon-btn danger" onclick="missedTrades.removeExistingScreenshot(${idx})" style="padding:2px;">✕</button>
          </div>
        </div>
      `;
    });

    this.state.pendingScreenshots.forEach((ps, idx) => {
      html += `
        <div class="screenshot-thumb-box" style="border: 2px dashed var(--color-gold);">
          <img src="${ps.url}">
          <div class="screenshot-actions">
            <span>Pending</span>
            <button type="button" class="icon-btn danger" onclick="missedTrades.removePendingScreenshot(${idx})" style="padding:2px;">✕</button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  removeExistingScreenshot(idx) {
    if (confirm("Delete this screenshot?")) {
      const ss = this.state.existingScreenshots[idx];
      api.deleteScreenshot(ss.id).then(() => {
        this.state.existingScreenshots.splice(idx, 1);
        this.renderScreenshotPreviews();
        app.showToast("Screenshot deleted");
      }).catch(e => {});
    }
  },

  removePendingScreenshot(idx) {
    this.state.pendingScreenshots.splice(idx, 1);
    this.renderScreenshotPreviews();
  },

  async savePlannedTrade() {
    const form = document.getElementById("planned-form");
    if (!form.reportValidity()) return;

    const btn = document.getElementById("trade-modal-save");
    btn.disabled = true;
    btn.textContent = "Saving...";

    try {
      const setups = Array.from(document.querySelectorAll("#pf-setup-picker .tag-pill.active"))
        .map(el => el.textContent)
        .join(", ");

      const data = {
        planned_date: document.getElementById("pf-date").value,
        pair: document.getElementById("pf-pair").value,
        direction: document.getElementById("pf-direction").value,
        planned_entry: parseFloat(document.getElementById("pf-entry").value),
        invalidation: document.getElementById("pf-inval").value ? parseFloat(document.getElementById("pf-inval").value) : null,
        target: document.getElementById("pf-target").value ? parseFloat(document.getElementById("pf-target").value) : null,
        expected_rr: document.getElementById("pf-rr").value ? parseFloat(document.getElementById("pf-rr").value) : null,
        session: document.getElementById("pf-session").value || null,
        timeframe: document.getElementById("pf-timeframe").value || null,
        status: document.getElementById("pf-status").value,
        reason_not_activated: document.getElementById("pf-reason").value || null,
        setup: setups || null,
        notes: document.getElementById("pf-notes").value || null
      };

      let saved;
      if (this.state.editingId) {
        saved = await api.updatePlannedTrade(this.state.editingId, data);
        app.showToast("Planned level updated successfully");
      } else {
        saved = await api.createPlannedTrade(data);
        app.showToast("Planned level created successfully");
      }

      // Upload screenshots
      for (const ps of this.state.pendingScreenshots) {
        const formData = new FormData();
        formData.append("file", ps.file);
        formData.append("planned_trade_id", saved.id);
        formData.append("category", ps.category);
        await api.uploadScreenshot(formData);
      }

      app.closeTradeModal();
      this.loadTrades();

    } catch (e) {
      console.error(e);
    } finally {
      btn.disabled = false;
      btn.textContent = "Save";
    }
  },

  // ── Details View Modal ──
  renderDetailsModal(trade) {
    const overlay = document.getElementById("trade-details-overlay");
    const title = document.getElementById("trade-details-title");
    title.textContent = `Planned Level #${trade.id} — ${trade.pair}`;

    const body = document.getElementById("trade-details-body");
    const dirClass = trade.direction === "Buy" ? "badge-buy" : "badge-sell";

    let statusClass = "badge-be";
    if (trade.status === "Waiting") statusClass = "bias-bullish";
    if (trade.status === "Not Activated") statusClass = "badge-tag";
    if (trade.status === "Later Tested") statusClass = "badge-win";
    if (trade.status === "Invalidated") statusClass = "badge-loss";

    let testsHtml = "";
    if (trade.level_tests && trade.level_tests.length > 0) {
      testsHtml = `
        <div class="form-section-header">Retest History (${trade.level_tests.length} Recorded)</div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Test #</th>
                <th>Test Date</th>
                <th>Price</th>
                <th>Reaction</th>
                <th>Level Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${trade.level_tests.map(lt => `
                <tr>
                  <td><b>#${lt.test_number}</b></td>
                  <td>${lt.test_date}</td>
                  <td class="mono">${lt.price || '-'}</td>
                  <td>${lt.reaction}</td>
                  <td><span class="badge ${lt.level_status === 'Respected' ? 'badge-win' : lt.level_status === 'Broken' ? 'badge-loss' : 'badge-be'}">${lt.level_status}</span></td>
                  <td class="text-secondary">${lt.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      testsHtml = `
        <div class="form-section-header">Retest History</div>
        <div class="text-muted" style="padding: 10px 0; font-size:12px;">
          No retests recorded yet for this level. When price revisits this price zone, you can test whether the level was respected.
        </div>
      `;
    }

    let screenshotsHtml = "";
    if (trade.screenshots && trade.screenshots.length > 0) {
      screenshotsHtml = `
        <div class="form-section-header">Screenshots</div>
        <div class="screenshot-grid">
          ${trade.screenshots.map(ss => `
            <div class="screenshot-thumb-box" onclick="window.open('/api/screenshots/file/${ss.filename}', '_blank')">
              <span class="screenshot-badge">${ss.category}</span>
              <img src="/api/screenshots/file/${ss.filename}">
            </div>
          `).join('')}
        </div>
      `;
    }

    body.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
        <div>
          <div style="font-size:18px; font-weight:700;">${trade.pair} — Planned Level</div>
          <div class="text-secondary">${trade.planned_date} | ${trade.session || 'Session N/A'} | ${trade.timeframe || 'TF N/A'}</div>
        </div>
        <div style="text-align:right;">
          <span class="badge ${dirClass}" style="font-size:13px; padding:4px 10px;">${trade.direction}</span>
          <span class="badge ${statusClass}" style="font-size:13px; padding:4px 10px;">${trade.status}</span>
        </div>
      </div>

      <div class="form-grid-3" style="background:var(--bg-input); padding:12px; border-radius:var(--radius-md); border:1px solid var(--border-default); margin-bottom:16px;">
        <div>
          <div class="text-muted" style="font-size:10px;">PLANNED LEVEL / ENTRY</div>
          <div class="mono" style="font-size:16px; font-weight:700; color:var(--gold-accent);">${trade.planned_entry}</div>
        </div>
        <div>
          <div class="text-muted" style="font-size:10px;">TARGET / TP</div>
          <div class="mono" style="font-size:14px; font-weight:600;">${trade.target || '-'}</div>
        </div>
        <div>
          <div class="text-muted" style="font-size:10px;">INVALIDATION / SL</div>
          <div class="mono" style="font-size:14px; font-weight:600;">${trade.invalidation || '-'}</div>
        </div>
        <div>
          <div class="text-muted" style="font-size:10px;">EXPECTED RR</div>
          <div class="mono" style="font-weight:600;">${trade.expected_rr ? trade.expected_rr.toFixed(2) + 'R' : '-'}</div>
        </div>
        <div>
          <div class="text-muted" style="font-size:10px;">SETUP TAGS</div>
          <div>${trade.setup || '-'}</div>
        </div>
        <div>
          <div class="text-muted" style="font-size:10px;">REASON NOT ACTIVATED</div>
          <div style="color:var(--text-secondary); font-weight:500;">${trade.reason_not_activated || '-'}</div>
        </div>
      </div>

      ${trade.notes ? `
        <div class="form-section-header">Notes & Analysis</div>
        <div style="background:var(--bg-input); padding:10px; border-radius:var(--radius-md); margin-bottom:14px; font-size:12px;">
          ${trade.notes}
        </div>
      ` : ''}

      ${testsHtml}
      ${screenshotsHtml}
    `;

    // Swap buttons on details modal
    const editBtn = document.getElementById("trade-details-edit");
    const delBtn = document.getElementById("trade-details-delete");
    editBtn.onclick = () => {
      app.closeTradeDetails();
      missedTrades.editTrade(trade.id);
    };
    delBtn.onclick = () => {
      if (confirm("Delete this planned level?")) {
        api.deletePlannedTrade(trade.id).then(() => {
          app.showToast("Deleted");
          app.closeTradeDetails();
          missedTrades.loadTrades();
        });
      }
    };

    overlay.classList.add("active");
  }
};
