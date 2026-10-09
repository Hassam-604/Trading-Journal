/**
 * levels.js
 * Handles Stage 5: Level Tests & Level Validity Analytics.
 * Core research system to record and analyze whether planned trading levels
 * continue to be respected when price returns later.
 */

const levelTests = {
  state: {
    tests: [],
    validityStats: null,
    plannedTrades: [],
    filters: {
      reaction: "",
      status: "",
      search: ""
    },
    editingId: null,
    pendingScreenshots: [],
    existingScreenshots: []
  },

  async render(container) {
    container.innerHTML = `
      <div id="levels-loading" style="padding: 40px; text-align: center; color: var(--text-muted);">
        Loading Level Validity Analytics & Tests...
      </div>
      <div id="levels-content" style="display: none;"></div>
    `;

    try {
      const [stats, tests, planned] = await Promise.all([
        api.getLevelValidity(),
        api.getLevelTests(),
        api.getPlannedTrades({ limit: 200 })
      ]);

      this.state.validityStats = stats;
      this.state.tests = tests;
      this.state.plannedTrades = planned;

      const content = document.getElementById("levels-content");
      const loading = document.getElementById("levels-loading");
      if (loading) loading.style.display = "none";
      if (content) content.style.display = "block";

      this.renderValidityAnalytics(content, stats);
      this.renderRetestsSection(content);

    } catch (err) {
      console.error("Levels render failed:", err);
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <div class="empty-title">Failed to load Level Tests data</div>
          <div class="empty-desc">${err.message || 'Please check backend server connection.'}</div>
          <button class="btn btn-secondary" style="margin-top: 15px;" onclick="levelTests.render(document.getElementById('content-body'))">Retry</button>
        </div>
      `;
    }
  },

  // ── 1. Validity Analytics & Retest Breakdown ──
  renderValidityAnalytics(container, stats) {
    const respectRateColor = stats.respect_rate >= 60 ? "text-win" : stats.respect_rate >= 40 ? "text-gold" : "text-loss";

    let retestRowsHtml = "";
    if (stats.retests && stats.retests.length > 0) {
      stats.retests.forEach(r => {
        const rateColor = r.respect_rate >= 60 ? "badge-win" : r.respect_rate >= 40 ? "badge-tag" : "badge-loss";
        retestRowsHtml += `
          <tr>
            <td style="font-weight: 700; color: var(--gold-accent);">${r.retest} Visit</td>
            <td><b>${r.tested}</b></td>
            <td><span class="text-win">${r.respected}</span></td>
            <td><span class="text-loss">${r.broken}</span></td>
            <td><span class="badge ${rateColor}">${r.respect_rate}%</span></td>
          </tr>
        `;
      });
    }

    const html = `
      <div style="margin-bottom: 24px;">
        <div style="margin-bottom: 12px;">
          <h3 style="font-size: 16px; font-weight: 700;">🔁 Level Validity Analytics</h3>
          <p class="text-secondary" style="font-size: 12px;">Statistical verification of planned key price levels when revisited by market price.</p>
        </div>

        <!-- KPI Cards -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Planned Levels</span>
              <span class="kpi-icon">🎯</span>
            </div>
            <div class="kpi-value text-gold">${stats.total_planned}</div>
            <div class="kpi-subtext">Total zones mapped</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Levels Tested</span>
              <span class="kpi-icon">📍</span>
            </div>
            <div class="kpi-value text-primary">${stats.total_tested}</div>
            <div class="kpi-subtext">${stats.total_planned > 0 ? ((stats.total_tested / stats.total_planned) * 100).toFixed(1) : 0}% retest rate</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Respect Rate</span>
              <span class="kpi-icon">🛡️</span>
            </div>
            <div class="kpi-value ${respectRateColor}">${stats.respect_rate}%</div>
            <div class="kpi-subtext"><span class="text-win">${stats.levels_respected} Respected</span> | <span class="text-loss">${stats.levels_broken} Broken</span></div>
          </div>

          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Avg Retests Before Break</span>
              <span class="kpi-icon">⏳</span>
            </div>
            <div class="kpi-value text-primary">${stats.avg_retests_before_break}</div>
            <div class="kpi-subtext">Visits sustained before invalidation</div>
          </div>
        </div>

        <!-- Retest Performance Breakdown Table -->
        <div class="table-card" style="padding: 16px 20px; margin-bottom: 24px;">
          <div class="section-title-bar">
            <div class="section-title"><span>📊</span> Retest Performance by Visit Count</div>
            <span class="text-muted" style="font-size: 11px;">Studies whether levels weaken after repeated tests</span>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Retest Visit</th>
                  <th>Total Tested</th>
                  <th>Levels Respected</th>
                  <th>Levels Broken</th>
                  <th>Respect Rate (%)</th>
                </tr>
              </thead>
              <tbody>
                ${retestRowsHtml || '<tr><td colspan="5" class="text-muted" style="text-align:center;">No retest history yet</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    container.insertAdjacentHTML("beforeend", html);
  },

  // ── 2. Recorded Retests List Section ──
  renderRetestsSection(container) {
    const html = `
      <div class="toolbar-card">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:8px;">
          <div>
            <div style="font-weight:700; font-size:15px;">📋 Recorded Level Retests</div>
            <div class="text-secondary" style="font-size:12px;">Individual test records documenting market reaction to previous levels.</div>
          </div>
          <button class="btn btn-gold" onclick="levelTests.openAddModal()">+ Record Retest</button>
        </div>

        <div class="toolbar-row">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input type="text" id="lt-search" class="search-input" placeholder="Search notes, price...">
          </div>

          <select id="lt-reaction" class="filter-select">
            <option value="">All Reactions</option>
            <option value="Strong">Strong</option>
            <option value="Moderate">Moderate</option>
            <option value="Weak">Weak</option>
            <option value="No Reaction">No Reaction</option>
          </select>

          <select id="lt-status" class="filter-select">
            <option value="">All Outcomes</option>
            <option value="Respected">Respected</option>
            <option value="Partially Respected">Partially Respected</option>
            <option value="Broken">Broken</option>
          </select>

          <button class="btn btn-secondary btn-sm" onclick="levelTests.resetFilters()">Reset</button>
        </div>
      </div>

      <div class="table-card">
        <div class="table-responsive">
          <table class="data-table" id="levels-table">
            <thead>
              <tr>
                <th>Test #</th>
                <th>Test Date</th>
                <th>Original Level</th>
                <th>Direction</th>
                <th>Test Price</th>
                <th>Reaction</th>
                <th>Level Status</th>
                <th>Notes</th>
                <th>Screenshots</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="levels-tbody">
              <!-- Rendered via JS -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.insertAdjacentHTML("beforeend", html);
    this.attachFilterListeners();
    this.renderTableBody();
  },

  attachFilterListeners() {
    document.getElementById("lt-search")?.addEventListener("input", (e) => {
      this.state.filters.search = e.target.value.toLowerCase();
      this.renderTableBody();
    });

    document.getElementById("lt-reaction")?.addEventListener("change", (e) => {
      this.state.filters.reaction = e.target.value;
      this.renderTableBody();
    });

    document.getElementById("lt-status")?.addEventListener("change", (e) => {
      this.state.filters.status = e.target.value;
      this.renderTableBody();
    });
  },

  resetFilters() {
    this.state.filters = { reaction: "", status: "", search: "" };
    if (document.getElementById("lt-search")) document.getElementById("lt-search").value = "";
    if (document.getElementById("lt-reaction")) document.getElementById("lt-reaction").value = "";
    if (document.getElementById("lt-status")) document.getElementById("lt-status").value = "";
    this.renderTableBody();
  },

  renderTableBody() {
    const tbody = document.getElementById("levels-tbody");
    if (!tbody) return;

    let filtered = this.state.tests;

    if (this.state.filters.reaction) {
      filtered = filtered.filter(t => t.reaction === this.state.filters.reaction);
    }
    if (this.state.filters.status) {
      filtered = filtered.filter(t => t.level_status === this.state.filters.status);
    }
    if (this.state.filters.search) {
      const q = this.state.filters.search;
      filtered = filtered.filter(t => 
        (t.notes && t.notes.toLowerCase().includes(q)) ||
        (t.price && t.price.toString().includes(q))
      );
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10">
            <div class="empty-state" style="padding: 30px;">
              <div class="empty-icon">🔁</div>
              <div class="empty-title">No level retests found</div>
              <div class="empty-desc">When price returns to one of your planned levels, record what happens to build research data.</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    let rowsHtml = "";
    filtered.forEach(t => {
      // Find parent planned trade
      const pt = this.state.plannedTrades.find(p => p.id === t.planned_trade_id);
      const dir = pt ? pt.direction : "-";
      const dirClass = dir === "Buy" ? "badge-buy" : dir === "Sell" ? "badge-sell" : "badge-be";
      const entryPrice = pt ? pt.planned_entry : "-";

      // Reaction pill styling
      let reactionBadge = "badge-be";
      if (t.reaction === "Strong") reactionBadge = "badge-win";
      if (t.reaction === "Moderate") reactionBadge = "badge-tag";
      if (t.reaction === "Weak") reactionBadge = "bias-neutral";
      if (t.reaction === "No Reaction") reactionBadge = "badge-loss";

      // Status pill styling
      let statusBadge = "badge-be";
      if (t.level_status === "Respected") statusBadge = "badge-win";
      if (t.level_status === "Partially Respected") statusBadge = "badge-tag";
      if (t.level_status === "Broken") statusBadge = "badge-loss";

      const ssCount = t.screenshots ? t.screenshots.length : 0;
      const ssBadge = ssCount > 0 
        ? `<span class="badge badge-tag" style="cursor:pointer;" onclick="levelTests.viewTest(${t.id})">📷 ${ssCount}</span>` 
        : `<span class="text-muted" style="font-size:11px;">-</span>`;

      rowsHtml += `
        <tr>
          <td><b style="color:var(--gold-accent);">#${t.test_number}</b></td>
          <td style="font-weight:600;">${t.test_date}</td>
          <td>
            <div class="mono" style="font-weight:700;">${entryPrice}</div>
            <div class="text-secondary" style="font-size:11px;">Planned #${t.planned_trade_id}</div>
          </td>
          <td><span class="badge ${dirClass}">${dir}</span></td>
          <td class="mono">${t.price || '-'}</td>
          <td><span class="badge ${reactionBadge}">${t.reaction}</span></td>
          <td><span class="badge ${statusBadge}">${t.level_status}</span></td>
          <td style="max-width:200px; white-space:normal; font-size:12px;" class="text-secondary">${t.notes || '-'}</td>
          <td>${ssBadge}</td>
          <td>
            <div class="action-btns">
              <button class="icon-btn" title="View Details" onclick="levelTests.viewTest(${t.id})">👁️</button>
              <button class="icon-btn" title="Edit" onclick="levelTests.editTest(${t.id})">✏️</button>
              <button class="icon-btn danger" title="Delete" onclick="levelTests.deleteTest(${t.id})">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = rowsHtml;
  },

  // ── Actions ──
  openAddModal(preselectedPlannedId = null) {
    this.state.editingId = null;
    this.state.pendingScreenshots = [];
    this.state.existingScreenshots = [];
    this.renderFormModal(null, preselectedPlannedId);
  },

  editTest(id) {
    const test = this.state.tests.find(t => t.id === id);
    if (!test) return;
    this.state.editingId = test.id;
    this.state.pendingScreenshots = [];
    this.state.existingScreenshots = test.screenshots || [];
    this.renderFormModal(test);
  },

  async deleteTest(id) {
    if (confirm("Delete this level test record?")) {
      try {
        await api.deleteLevelTest(id);
        app.showToast("Level test deleted");
        this.render(document.getElementById("content-body"));
      } catch (e) {}
    }
  },

  renderFormModal(test = null, preselectedPlannedId = null) {
    const isEdit = !!test;
    const overlay = document.getElementById("trade-modal-overlay");
    const title = document.getElementById("trade-modal-title");
    title.textContent = isEdit ? `Edit Level Retest #${test.test_number}` : "Record Level Retest";

    const todayStr = new Date().toISOString().split("T")[0];
    const dateVal = isEdit ? test.test_date : todayStr;
    const selectedPlannedId = isEdit ? test.planned_trade_id : preselectedPlannedId;

    const plannedOptions = this.state.plannedTrades.map(p => {
      const isSel = selectedPlannedId === p.id;
      return `<option value="${p.id}" ${isSel ? 'selected' : ''}>#${p.id} — ${p.pair} ${p.direction} @ ${p.planned_entry} (${p.planned_date})</option>`;
    }).join('');

    const body = document.getElementById("trade-modal-body");
    body.innerHTML = `
      <form id="level-test-form">
        <div class="form-group">
          <label>Original Planned Level / Setup *</label>
          <select class="form-input" id="ltf-planned-id" ${isEdit ? 'disabled' : ''} required>
            <option value="">- Select Planned Level -</option>
            ${plannedOptions}
          </select>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label>Test Date *</label>
            <input type="date" class="form-input" id="ltf-date" value="${dateVal}" required>
          </div>
          <div class="form-group">
            <label>Retest Price</label>
            <input type="number" step="0.001" class="form-input mono" id="ltf-price" value="${isEdit && test.price ? test.price : ''}" placeholder="Actual price on visit">
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label>Reaction *</label>
            <select class="form-input" id="ltf-reaction" required>
              <option value="Strong" ${isEdit && test.reaction==='Strong'?'selected':''}>Strong (Immediate bounce/rejection)</option>
              <option value="Moderate" ${!isEdit || test.reaction==='Moderate'?'selected':''}>Moderate (Some reaction)</option>
              <option value="Weak" ${isEdit && test.reaction==='Weak'?'selected':''}>Weak (Sluggish / little reaction)</option>
              <option value="No Reaction" ${isEdit && test.reaction==='No Reaction'?'selected':''}>No Reaction (Blew through level)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Level Status *</label>
            <select class="form-input" id="ltf-status" required>
              <option value="Respected" ${!isEdit || test.level_status==='Respected'?'selected':''}>Respected (Held key level)</option>
              <option value="Partially Respected" ${isEdit && test.level_status==='Partially Respected'?'selected':''}>Partially Respected (Reacted then invalidated)</option>
              <option value="Broken" ${isEdit && test.level_status==='Broken'?'selected':''}>Broken (Level completely failed)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Notes & Observations</label>
          <textarea class="form-input" id="ltf-notes" rows="3" placeholder="Describe price action when revisiting the zone...">${isEdit && test.notes ? test.notes : ''}</textarea>
        </div>

        <div class="form-section-header">Screenshots</div>
        <div class="form-group">
          <input type="file" id="ltf-screenshot-input" accept="image/*" multiple style="display:none;">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('ltf-screenshot-input').click()">+ Add Retest Screenshot</button>
          <div id="ltf-screenshot-preview" class="screenshot-grid" style="margin-top: 10px;"></div>
        </div>
      </form>
    `;

    const saveBtn = document.getElementById("trade-modal-save");
    saveBtn.onclick = () => levelTests.saveLevelTest();
    saveBtn.textContent = isEdit ? "Update Retest" : "Save Retest";

    this.attachFormListeners();
    this.renderScreenshotPreviews();
    overlay.classList.add("active");
  },

  attachFormListeners() {
    document.getElementById("ltf-screenshot-input")?.addEventListener("change", (e) => {
      const files = e.target.files;
      for (let i = 0; i < files.length; i++) {
        this.state.pendingScreenshots.push({
          file: files[i],
          category: "retest",
          url: URL.createObjectURL(files[i])
        });
      }
      this.renderScreenshotPreviews();
      e.target.value = "";
    });
  },

  renderScreenshotPreviews() {
    const container = document.getElementById("ltf-screenshot-preview");
    if (!container) return;
    let html = "";

    this.state.existingScreenshots.forEach((ss, idx) => {
      html += `
        <div class="screenshot-thumb-box">
          <img src="/api/screenshots/file/${ss.filename}">
          <div class="screenshot-actions">
            <span>${ss.category}</span>
            <button type="button" class="icon-btn danger" onclick="levelTests.removeExistingScreenshot(${idx})" style="padding:2px;">✕</button>
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
            <button type="button" class="icon-btn danger" onclick="levelTests.removePendingScreenshot(${idx})" style="padding:2px;">✕</button>
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

  async saveLevelTest() {
    const form = document.getElementById("level-test-form");
    if (!form.reportValidity()) return;

    const btn = document.getElementById("trade-modal-save");
    btn.disabled = true;
    btn.textContent = "Saving...";

    try {
      const data = {
        test_date: document.getElementById("ltf-date").value,
        price: document.getElementById("ltf-price").value ? parseFloat(document.getElementById("ltf-price").value) : null,
        reaction: document.getElementById("ltf-reaction").value,
        level_status: document.getElementById("ltf-status").value,
        notes: document.getElementById("ltf-notes").value || null
      };

      let saved;
      if (this.state.editingId) {
        saved = await api.updateLevelTest(this.state.editingId, data);
        app.showToast("Retest updated");
      } else {
        data.planned_trade_id = parseInt(document.getElementById("ltf-planned-id").value);
        saved = await api.createLevelTest(data);
        app.showToast("Level retest recorded");
      }

      // Upload screenshots
      for (const ps of this.state.pendingScreenshots) {
        const formData = new FormData();
        formData.append("file", ps.file);
        formData.append("level_test_id", saved.id);
        formData.append("category", ps.category);
        await api.uploadScreenshot(formData);
      }

      app.closeTradeModal();
      this.render(document.getElementById("content-body"));

    } catch (e) {
      console.error(e);
    } finally {
      btn.disabled = false;
      btn.textContent = "Save";
    }
  },

  // ── Details View ──
  viewTest(id) {
    const test = this.state.tests.find(t => t.id === id);
    if (!test) return;

    const overlay = document.getElementById("trade-details-overlay");
    const title = document.getElementById("trade-details-title");
    title.textContent = `Level Retest #${test.test_number} Details`;

    const body = document.getElementById("trade-details-body");
    const pt = this.state.plannedTrades.find(p => p.id === test.planned_trade_id);

    let screenshotsHtml = "";
    if (test.screenshots && test.screenshots.length > 0) {
      screenshotsHtml = `
        <div class="form-section-header">Retest Screenshots</div>
        <div class="screenshot-grid">
          ${test.screenshots.map(ss => `
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
          <div style="font-size:18px; font-weight:700;">Retest #${test.test_number} — ${pt ? pt.pair : 'Level'}</div>
          <div class="text-secondary">${test.test_date} | Tested Zone: <b class="text-gold">${pt ? pt.planned_entry : '-'}</b></div>
        </div>
        <div style="text-align:right;">
          <span class="badge ${test.reaction === 'Strong' ? 'badge-win' : test.reaction === 'No Reaction' ? 'badge-loss' : 'badge-tag'}" style="font-size:13px; padding:4px 10px;">${test.reaction}</span>
          <span class="badge ${test.level_status === 'Respected' ? 'badge-win' : test.level_status === 'Broken' ? 'badge-loss' : 'badge-be'}" style="font-size:13px; padding:4px 10px;">${test.level_status}</span>
        </div>
      </div>

      <div class="form-grid-3" style="background:var(--bg-input); padding:12px; border-radius:var(--radius-md); border:1px solid var(--border-default); margin-bottom:16px;">
        <div>
          <div class="text-muted" style="font-size:10px;">RETEST PRICE</div>
          <div class="mono" style="font-size:16px; font-weight:700;">${test.price || '-'}</div>
        </div>
        <div>
          <div class="text-muted" style="font-size:10px;">ORIGINAL DIRECTION</div>
          <div><b>${pt ? pt.direction : '-'}</b></div>
        </div>
        <div>
          <div class="text-muted" style="font-size:10px;">PLANNED SETUP</div>
          <div>${pt && pt.setup ? pt.setup : '-'}</div>
        </div>
      </div>

      ${test.notes ? `
        <div class="form-section-header">Observations & Notes</div>
        <div style="background:var(--bg-input); padding:10px; border-radius:var(--radius-md); margin-bottom:14px; font-size:12px;">
          ${test.notes}
        </div>
      ` : ''}

      ${screenshotsHtml}
    `;

    const editBtn = document.getElementById("trade-details-edit");
    const delBtn = document.getElementById("trade-details-delete");
    editBtn.onclick = () => {
      app.closeTradeDetails();
      levelTests.editTest(test.id);
    };
    delBtn.onclick = () => {
      if (confirm("Delete this level test record?")) {
        api.deleteLevelTest(test.id).then(() => {
          app.showToast("Deleted");
          app.closeTradeDetails();
          levelTests.render(document.getElementById("content-body"));
        });
      }
    };

    overlay.classList.add("active");
  }
};
