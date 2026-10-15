/**
 * settings.js
 * Stage 8: Data Export, Backup, Account Settings, and Tag Management
 */

const settings = (() => {
  // ── Render ─────────────────────────────────────────────────────────
  async function render(container) {
    container.innerHTML = `
      <div class="settings-page">
        <header class="settings-heading">
          <div>
            <p class="dashboard-eyebrow">PREFERENCES</p>
            <h1>Settings</h1>
            <p class="dashboard-intro-copy">Manage account defaults, journal tags, and data backups.</p>
          </div>
        </header>
        
        <div class="settings-grid">
          
          <!-- 1. Account & Balance Configuration -->
          <section class="settings-panel">
            <div class="panel-header">
              <div>
                <h2>Account &amp; balance</h2>
                <p>Defaults used when you record trades.</p>
              </div>
            </div>
            <div class="panel-body">
              <form id="account-settings-form">
                <div class="form-grid-2 settings-form-grid">
                  <div class="form-group">
                    <label for="set-starting-balance">Starting / Base Balance</label>
                    <div class="settings-currency-input">
                      <span aria-hidden="true">$</span>
                      <input type="number" step="0.01" min="0" id="set-starting-balance" class="form-control" required>
                    </div>
                    <small class="text-muted settings-help-copy">Your initial or funded account capital.</small>
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

                  <div class="form-group settings-form-wide">
                    <label for="set-default-pair">Default Trading Pair</label>
                    <input type="text" id="set-default-pair" class="form-control" placeholder="XAUUSD" required>
                  </div>
                </div>

                <!-- Live Balance Preview Box -->
                <div class="settings-balance-preview">
                  <div class="settings-preview-row">
                    <span class="text-muted">Total Net Journal P&amp;L:</span>
                    <span id="settings-preview-pnl">$0.00</span>
                  </div>
                  <div class="settings-preview-row settings-preview-total">
                    <span>Calculated Current Balance:</span>
                    <span id="settings-preview-current" class="text-gold">$0.00</span>
                  </div>
                </div>

                <button type="submit" class="btn btn-primary settings-save-btn" id="btn-save-settings">
                  Save account settings
                </button>
              </form>
            </div>
          </section>

          <section class="settings-panel">
            <div class="panel-header">
              <div>
                <h2>Journal security</h2>
                <p>Change the password used to access this journal.</p>
              </div>
            </div>
            <div class="panel-body">
              <form id="password-change-form" class="security-form">
                <div class="form-group">
                  <label for="security-current-password">Current password</label>
                  <input id="security-current-password" name="current_password" class="form-control" type="password" autocomplete="current-password" maxlength="128" required>
                </div>
                <div class="form-grid-2">
                  <div class="form-group">
                    <label for="security-new-password">New password</label>
                    <input id="security-new-password" name="new_password" class="form-control" type="password" autocomplete="new-password" minlength="12" maxlength="128" required>
                    <small class="text-muted settings-help-copy">Use at least 12 characters.</small>
                  </div>
                  <div class="form-group">
                    <label for="security-confirm-password">Confirm new password</label>
                    <input id="security-confirm-password" name="confirm_password" class="form-control" type="password" autocomplete="new-password" minlength="12" maxlength="128" required>
                  </div>
                </div>
                <p id="security-password-message" class="security-password-message" role="status"></p>
                <button type="submit" id="btn-change-password" class="btn btn-secondary">Update password</button>
              </form>
            </div>
          </section>

          <!-- 2. Tag Management (Setups & Mistakes) -->
          <section class="settings-panel">
            <div class="panel-header">
              <div>
                <h2>Setup &amp; mistake tags</h2>
                <p>Keep labels consistent across your journal.</p>
              </div>
            </div>
            <div class="panel-body">
              <div class="settings-tag-group">
                <h3>Trading setups</h3>
                <div id="settings-setups-list" class="tags-container settings-tags-container" aria-live="polite">
                  <span class="text-muted settings-tag-state">Loading tags…</span>
                </div>
                <div class="tag-input-row settings-tag-input-row">
                  <input type="text" id="new-setup-tag-input" class="form-control" placeholder="e.g. Breaker Block, SFP">
                  <button type="button" class="btn btn-secondary" onclick="settings.addSetupTag()">Add setup</button>
                </div>
              </div>

              <hr class="settings-divider">

              <div class="settings-tag-group">
                <h3>Mistake tags</h3>
                <div id="settings-mistakes-list" class="tags-container settings-tags-container" aria-live="polite">
                  <span class="text-muted settings-tag-state">Loading tags…</span>
                </div>
                <div class="tag-input-row settings-tag-input-row">
                  <input type="text" id="new-mistake-tag-input" class="form-control" placeholder="e.g. FOMO, Moving SL">
                  <button type="button" class="btn btn-secondary" onclick="settings.addMistakeTag()">Add mistake</button>
                </div>
              </div>
            </div>
          </section>

          <!-- 3. Data Export Panel -->
          <section class="settings-panel">
            <div class="panel-header">
              <div>
                <h2>Data export</h2>
                <p>Download records as CSV files.</p>
              </div>
            </div>
            <div class="panel-body">
              <p class="text-muted settings-panel-copy">Export your trading data for spreadsheets and external analysis.</p>
              <div class="export-actions settings-export-actions">
                <a href="/api/export/trades/csv" class="btn btn-secondary" target="_blank" rel="noopener" download>
                  Export trades (CSV)
                </a>
                <a href="/api/export/planned/csv" class="btn btn-secondary" target="_blank" rel="noopener" download>
                  Export planned trades (CSV)
                </a>
                <a href="/api/export/levels/csv" class="btn btn-secondary" target="_blank" rel="noopener" download>
                  Export level tests (CSV)
                </a>
              </div>
            </div>
          </section>
          
          <!-- 4. Backup & Restore Panel -->
          <section class="settings-panel">
            <div class="panel-header">
              <div>
                <h2>Backup &amp; restore</h2>
                <p>Protect and recover your journal data.</p>
              </div>
            </div>
            <div class="panel-body">
              <p class="text-muted settings-panel-copy">Download a complete JSON snapshot containing trades, planned levels, level tests, and settings.</p>
              
              <div class="backup-actions settings-backup-actions">
                <a href="/api/export/backup/all" class="btn btn-primary" target="_blank" rel="noopener" download>
                  Download full JSON backup
                </a>
                
                <hr class="settings-divider">
                
                <form id="restore-form">
                  <div class="form-group settings-restore-group">
                    <label for="restore-file">Restore from JSON backup</label>
                    <input type="file" id="restore-file" accept=".json,application/json" class="form-control" required>
                    <small class="text-muted settings-help-copy">Restoring imports records into the database. Existing tags and matching trades will be merged.</small>
                  </div>
                  <button type="submit" class="btn btn-danger settings-restore-btn" id="btn-restore">
                    Upload &amp; restore
                  </button>
                  <div id="restore-msg" class="settings-restore-message" role="status" aria-live="polite"></div>
                </form>
              </div>
            </div>
          </section>

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
      ["settings-setups-list", "settings-mistakes-list"].forEach(containerId => {
        const tagContainer = document.getElementById(containerId);
        if (tagContainer) {
          tagContainer.replaceChildren();
          const message = document.createElement("span");
          message.className = "text-muted settings-tag-state";
          message.textContent = "Unable to load tags. Check your connection and refresh.";
          tagContainer.appendChild(message);
        }
      });
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

    container.replaceChildren();
    if (!tags || tags.length === 0) {
      const message = document.createElement("span");
      message.className = "text-muted settings-tag-state";
      message.textContent = `No ${type} tags yet.`;
      container.appendChild(message);
      return;
    }

    tags.forEach(tag => {
      const chip = document.createElement("div");
      chip.className = "tag-chip settings-tag-chip";

      const name = document.createElement("span");
      name.textContent = tag.name;
      chip.appendChild(name);

      if (tag.is_default) {
        const badge = document.createElement("span");
        badge.className = "settings-default-tag";
        badge.textContent = "Default";
        chip.appendChild(badge);
      } else {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "settings-tag-delete";
        remove.textContent = "×";
        remove.title = `Delete ${type} tag`;
        remove.setAttribute("aria-label", `Delete ${tag.name} ${type} tag`);
        remove.addEventListener("click", () => deleteTag(tag.id, type));
        chip.appendChild(remove);
      }

      container.appendChild(chip);
    });
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
    const passwordForm = document.getElementById("password-change-form");
    if (passwordForm) {
      passwordForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const currentPassword = passwordForm.elements.current_password.value;
        const newPassword = passwordForm.elements.new_password.value;
        const confirmation = passwordForm.elements.confirm_password.value;
        const message = document.getElementById("security-password-message");
        const button = document.getElementById("btn-change-password");

        if (newPassword !== confirmation) {
          message.textContent = "The new passwords do not match.";
          message.classList.add("is-error");
          return;
        }

        button.disabled = true;
        message.textContent = "";
        message.classList.remove("is-error");
        try {
          await api.changePassword({
            current_password: currentPassword,
            new_password: newPassword,
          });
          passwordForm.reset();
          message.textContent = "Password updated. Other active sessions have been signed out.";
          app.showToast("Password updated successfully.", "success");
        } catch (error) {
          message.textContent = error.message;
          message.classList.add("is-error");
        } finally {
          button.disabled = false;
        }
      });
    }

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
            btn.textContent = "Save account settings";
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
          btn.textContent = "Upload & restore";
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
