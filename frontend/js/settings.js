/**
 * settings.js
 * Stage 8: Data Export, Backup, Account Settings, and Tag Management
 */

const settings = (() => {
  // ── Render ─────────────────────────────────────────────────────────
  async function render(container) {
    container.innerHTML = `
      <div class="settings-page">
        <div class="page-header" style="margin-bottom: 24px;">
          <h2 class="page-title">Settings & Account Management</h2>
          <p class="text-muted" style="margin-top: 4px;">Configure your starting account balance, risk defaults, tags, and data backups.</p>
        </div>
        
        <div class="settings-grid">
          
          <!-- 1. Account & Balance Configuration -->
          <div class="settings-panel">
            <div class="panel-header">
              <h4 style="display:flex; align-items:center; gap:8px;">
                <span>💰</span> Account & Balance Settings
              </h4>
            </div>
            <div class="panel-body">
              <form id="account-settings-form">
                <div class="form-grid-2" style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:16px;">
                  <div class="form-group">
                    <label for="set-starting-balance">Starting / Base Balance</label>
                    <div style="position: relative;">
                      <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-weight: 600; color: var(--color-gold);">$</span>
                      <input type="number" step="0.01" min="0" id="set-starting-balance" class="form-control" style="padding-left: 28px; font-weight: 600;" required>
                    </div>
                    <small class="text-muted" style="display:block; margin-top:4px;">Your initial or funded account capital.</small>
                  </div>

                  <div class="form-group">
                    <label for="set-currency">Account Currency</label>
                    <select id="set-currency" class="form-control">
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="AUD">AUD ($)</option>
                      <option value="CAD">CAD ($)</option>
                      <option value="JPY">JPY (¥)</option>
                      <option value="CHF">CHF (Fr)</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label for="set-default-risk">Default Risk per Trade ($)</label>
                    <input type="number" step="0.01" min="0" id="set-default-risk" class="form-control" required>
                  </div>

                  <div class="form-group">
                    <label for="set-default-rr">Default Risk : Reward Ratio</label>
                    <input type="number" step="0.1" min="0.1" id="set-default-rr" class="form-control" required>
                  </div>

                  <div class="form-group" style="grid-column: 1 / -1;">
                    <label for="set-default-pair">Default Trading Pair</label>
                    <input type="text" id="set-default-pair" class="form-control" placeholder="XAUUSD" required>
                  </div>
                </div>

                <!-- Live Balance Preview Box -->
                <div class="settings-balance-preview" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13.5px;">
                    <span class="text-muted">Total Net Journal P&amp;L:</span>
                    <span id="settings-preview-pnl" style="font-weight: 600;">$0.00</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; border-top: 1px dashed var(--border-subtle); padding-top: 10px;">
                    <span>Calculated Current Balance:</span>
                    <span id="settings-preview-current" class="text-gold">$0.00</span>
                  </div>
                </div>

                <button type="submit" class="btn btn-gold" id="btn-save-settings" style="width: 100%;">
                  💾 Save Account Settings
                </button>
              </form>
            </div>
          </div>

          <!-- 2. Tag Management (Setups & Mistakes) -->
          <div class="settings-panel">
            <div class="panel-header">
              <h4 style="display:flex; align-items:center; gap:8px;">
                <span>🏷️</span> Setup & Mistake Tags
              </h4>
            </div>
            <div class="panel-body">
              <!-- Setups -->
              <div style="margin-bottom: 24px;">
                <label style="font-weight: 600; display:block; margin-bottom: 8px;">Trading Setups</label>
                <div id="settings-setups-list" class="tags-container" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
                  <span class="text-muted" style="font-size: 13px;">Loading tags...</span>
                </div>
                <div class="tag-input-row" style="display: flex; gap: 8px;">
                  <input type="text" id="new-setup-tag-input" class="form-control" placeholder="New setup name (e.g. Breaker Block, SFP)..." style="flex: 1;">
                  <button type="button" class="btn btn-secondary" onclick="settings.addSetupTag()">+ Add Setup</button>
                </div>
              </div>

              <hr style="border-color: var(--border-subtle); margin: 20px 0;">

              <!-- Mistakes -->
              <div>
                <label style="font-weight: 600; display:block; margin-bottom: 8px;">Mistake Tags</label>
                <div id="settings-mistakes-list" class="tags-container" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
                  <span class="text-muted" style="font-size: 13px;">Loading tags...</span>
                </div>
                <div class="tag-input-row" style="display: flex; gap: 8px;">
                  <input type="text" id="new-mistake-tag-input" class="form-control" placeholder="New mistake tag (e.g. FOMO, Moving SL)..." style="flex: 1;">
                  <button type="button" class="btn btn-secondary" onclick="settings.addMistakeTag()">+ Add Mistake</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 3. Data Export Panel -->
          <div class="settings-panel">
            <div class="panel-header">
              <h4 style="display:flex; align-items:center; gap:8px;">
                <span>📊</span> Data Export (CSV)
              </h4>
            </div>
            <div class="panel-body">
              <p class="text-muted" style="margin-bottom:16px;">Export your trading data into standard CSV files for Excel, Python, or external spreadsheets.</p>
              <div class="export-actions" style="display: flex; flex-direction: column; gap: 12px;">
                <a href="/api/export/trades/csv" class="btn btn-secondary" target="_blank" download style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                  <span>📥</span> Export Trades (CSV)
                </a>
                <a href="/api/export/planned/csv" class="btn btn-secondary" target="_blank" download style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                  <span>📥</span> Export Missed / Planned Trades (CSV)
                </a>
                <a href="/api/export/levels/csv" class="btn btn-secondary" target="_blank" download style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                  <span>📥</span> Export Level Tests (CSV)
                </a>
              </div>
            </div>
          </div>
          
          <!-- 4. Backup & Restore Panel -->
          <div class="settings-panel">
            <div class="panel-header">
              <h4 style="display:flex; align-items:center; gap:8px;">
                <span>🛡️</span> Backup & Restore (JSON)
              </h4>
            </div>
            <div class="panel-body">
              <p class="text-muted" style="margin-bottom:16px;">Download a complete JSON snapshot containing all trades, planned trades, level tests, and settings.</p>
              
              <div class="backup-actions">
                <a href="/api/export/backup/all" class="btn btn-primary" target="_blank" download style="display:block; text-align:center; margin-bottom: 24px;">
                  📦 Download Full JSON Backup
                </a>
                
                <hr style="border-color: var(--border-subtle); margin-bottom: 24px;">
                
                <form id="restore-form">
                  <div class="form-group" style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 6px;">Restore from JSON Backup</label>
                    <input type="file" id="restore-file" accept=".json" class="form-control" required>
                    <small class="text-muted" style="display:block; margin-top:8px;">Restoring imports your records into the database. Existing tags and matching trades will be merged.</small>
                  </div>
                  <button type="submit" class="btn btn-danger" id="btn-restore" style="width:100%">
                    ⚠️ Upload & Restore
                  </button>
                  <div id="restore-msg" style="margin-top:12px; font-size:13px; text-align:center;"></div>
                </form>
              </div>
            </div>
          </div>

        </div>
      </div>
    `;

    await loadSettingsData();
    attachListeners();
  }

  // ── Load Settings & Populate Form ──────────────────────────────────
  async function loadSettingsData() {
    try {
      const [userSettings, setups, mistakes, kpi] = await Promise.all([
        api.getSettings(),
        api.getSetupTags(),
        api.getMistakeTags(),
        api.getDashboardKPI()
      ]);

      app.state.settings = userSettings;
      app.state.setups = setups;
      app.state.mistakes = mistakes;
      app.state.dashboardKPI = kpi;

      // Populate Account form
      const elBal = document.getElementById("set-starting-balance");
      const elCurr = document.getElementById("set-currency");
      const elRisk = document.getElementById("set-default-risk");
      const elRR = document.getElementById("set-default-rr");
      const elPair = document.getElementById("set-default-pair");

      if (elBal) elBal.value = userSettings.starting_balance;
      if (elCurr) elCurr.value = userSettings.currency || "USD";
      if (elRisk) elRisk.value = userSettings.default_risk;
      if (elRR) elRR.value = userSettings.default_rr;
      if (elPair) elPair.value = userSettings.default_pair || "XAUUSD";

      updateBalancePreview();

      // Render tags
      renderTagsList("settings-setups-list", setups, "setup");
      renderTagsList("settings-mistakes-list", mistakes, "mistake");
    } catch (err) {
      console.error("Failed to load settings data:", err);
      app.showToast("Failed to load settings data", "error");
    }
  }

  function updateBalancePreview() {
    const elBal = document.getElementById("set-starting-balance");
    const elPnl = document.getElementById("settings-preview-pnl");
    const elCurrBal = document.getElementById("settings-preview-current");

    const starting = parseFloat(elBal ? elBal.value : 0) || 0;
    const netPnl = app.state.dashboardKPI ? Number(app.state.dashboardKPI.total_pnl) || 0 : 0;
    const current = starting + netPnl;

    if (elPnl) {
      elPnl.textContent = app.formatMoney(netPnl);
      elPnl.className = netPnl >= 0 ? "text-win" : "text-loss";
    }
    if (elCurrBal) {
      elCurrBal.textContent = `$${current.toFixed(2)}`;
    }
  }

  function renderTagsList(containerId, tags, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!tags || tags.length === 0) {
      container.innerHTML = `<span class="text-muted" style="font-size: 13px;">No ${type} tags yet.</span>`;
      return;
    }

    container.innerHTML = tags.map(tag => `
      <div class="tag-chip" style="display:inline-flex; align-items:center; gap:6px; background: rgba(255,255,255,0.06); border: 1px solid var(--border-subtle); padding: 5px 10px; border-radius: 20px; font-size: 12.5px;">
        <span>${tag.name}</span>
        ${tag.is_default 
          ? `<span style="font-size: 10px; opacity: 0.6; background: rgba(255,255,255,0.1); padding: 1px 5px; border-radius: 8px;">Default</span>`
          : `<button type="button" onclick="settings.deleteTag(${tag.id}, '${type}')" style="background:none; border:none; color: var(--color-loss); cursor:pointer; font-size:12px; padding:0 2px;" title="Delete Tag">✕</button>`
        }
      </div>
    `).join("");
  }

  // ── Tag Actions ────────────────────────────────────────────────────
  async function addSetupTag() {
    const input = document.getElementById("new-setup-tag-input");
    const name = input ? input.value.trim() : "";
    if (!name) return;

    try {
      await api.createSetupTag({ name });
      input.value = "";
      app.state.setups = await api.getSetupTags();
      renderTagsList("settings-setups-list", app.state.setups, "setup");
      app.showToast(`Setup tag "${name}" added!`, "success");
    } catch (err) {
      app.showToast(err.message || "Failed to add setup tag", "error");
    }
  }

  async function addMistakeTag() {
    const input = document.getElementById("new-mistake-tag-input");
    const name = input ? input.value.trim() : "";
    if (!name) return;

    try {
      await api.createMistakeTag({ name });
      input.value = "";
      app.state.mistakes = await api.getMistakeTags();
      renderTagsList("settings-mistakes-list", app.state.mistakes, "mistake");
      app.showToast(`Mistake tag "${name}" added!`, "success");
    } catch (err) {
      app.showToast(err.message || "Failed to add mistake tag", "error");
    }
  }

  async function deleteTag(id, type) {
    if (!confirm(`Are you sure you want to remove this ${type} tag?`)) return;

    try {
      if (type === "setup") {
        await api.deleteSetupTag(id);
        app.state.setups = await api.getSetupTags();
        renderTagsList("settings-setups-list", app.state.setups, "setup");
      } else {
        await api.deleteMistakeTag(id);
        app.state.mistakes = await api.getMistakeTags();
        renderTagsList("settings-mistakes-list", app.state.mistakes, "mistake");
      }
      app.showToast("Tag removed", "info");
    } catch (err) {
      app.showToast(err.message || "Failed to delete tag", "error");
    }
  }

  // ── Listeners ──────────────────────────────────────────────────────
  function attachListeners() {
    // 1. Live preview on starting balance typing
    const elBal = document.getElementById("set-starting-balance");
    if (elBal) {
      elBal.addEventListener("input", updateBalancePreview);
    }

    // 2. Save Account settings
    const accountForm = document.getElementById("account-settings-form");
    if (accountForm) {
      accountForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = document.getElementById("btn-save-settings");
        if (btn) {
          btn.disabled = true;
          btn.textContent = "Saving...";
        }

        try {
          const starting_balance = parseFloat(document.getElementById("set-starting-balance").value);
          const currency = document.getElementById("set-currency").value;
          const default_risk = parseFloat(document.getElementById("set-default-risk").value);
          const default_rr = parseFloat(document.getElementById("set-default-rr").value);
          const default_pair = document.getElementById("set-default-pair").value.trim().toUpperCase();

          const updated = await api.updateSettings({
            starting_balance,
            currency,
            default_risk,
            default_rr,
            default_pair
          });

          app.state.settings = updated;
          await app.refreshGlobalStats();
          updateBalancePreview();

          app.showToast(`Settings saved! Starting balance set to $${starting_balance.toFixed(2)}`, "success");
        } catch (err) {
          console.error(err);
          app.showToast(err.message || "Failed to save settings", "error");
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.textContent = "💾 Save Account Settings";
          }
        }
      });
    }

    // 3. Enter key on tag inputs
    const setupInput = document.getElementById("new-setup-tag-input");
    if (setupInput) {
      setupInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          addSetupTag();
        }
      });
    }

    const mistakeInput = document.getElementById("new-mistake-tag-input");
    if (mistakeInput) {
      mistakeInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          addMistakeTag();
        }
      });
    }

    // 4. Backup & Restore
    const form = document.getElementById("restore-form");
    const fileInput = document.getElementById("restore-file");
    const msg = document.getElementById("restore-msg");
    const btn = document.getElementById("btn-restore");

    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const file = fileInput.files[0];
        if (!file) return;

        if (!confirm("Are you sure you want to restore from this backup file? Existing data will be preserved and merged.")) return;

        btn.disabled = true;
        btn.textContent = "Restoring...";
        msg.textContent = "";

        try {
          const res = await api.restoreJSON(file);
          msg.textContent = res.message || "Restore successful.";
          msg.style.color = "var(--color-win)";
          app.showToast("Backup restored successfully!", "success");
          await app.init(); // reload data globally
          loadSettingsData();
        } catch (err) {
          msg.textContent = `Error: ${err.message || "Failed to restore"}`;
          msg.style.color = "var(--color-loss)";
          app.showToast(err.message || "Failed to restore backup", "error");
        } finally {
          btn.disabled = false;
          btn.textContent = "⚠️ Upload & Restore";
          form.reset();
        }
      });
    }
  }

  return {
    render,
    addSetupTag,
    addMistakeTag,
    deleteTag
  };
})();
