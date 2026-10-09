/**
 * form.js
 * Handles the Add/Edit trade form logic, live calculations, and screenshot attachments.
 */

const formManager = {
  editingId: null,
  pendingScreenshots: [],
  existingScreenshots: [],

  renderForm(tradeData = null) {
    this.editingId = tradeData ? tradeData.id : null;
    this.pendingScreenshots = [];
    this.existingScreenshots = tradeData ? tradeData.screenshots || [] : [];
    
    const isEdit = !!tradeData;
    const body = document.getElementById("trade-modal-body");
    
    // Set current date/time if new
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now - tzOffset)).toISOString().slice(0, 16);
    const dateVal = isEdit ? tradeData.date : localISOTime.split("T")[0];
    const timeVal = isEdit ? tradeData.time : localISOTime.split("T")[1];

    const setupsHtml = app.state.setups.map(s => 
      `<span class="tag-pill ${isEdit && tradeData.setup && tradeData.setup.includes(s.name) ? 'active' : ''}" data-type="setup">${s.name}</span>`
    ).join("");

    const mistakesHtml = app.state.mistakes.map(m => 
      `<span class="tag-pill danger ${isEdit && tradeData.mistake && tradeData.mistake.includes(m.name) ? 'active' : ''}" data-type="mistake">${m.name}</span>`
    ).join("");

    body.innerHTML = `
      <form id="trade-form">
        <div class="form-grid-2">
          <div class="form-group">
            <label>Date *</label>
            <input type="date" class="form-input" id="f-date" value="${dateVal}" required>
          </div>
          <div class="form-group">
            <label>Time *</label>
            <input type="time" class="form-input" id="f-time" value="${timeVal}" required>
          </div>
        </div>

        <div class="form-grid-3">
          <div class="form-group">
            <label>Pair</label>
            <input type="text" class="form-input" id="f-pair" value="${isEdit ? tradeData.pair : 'XAUUSD'}" required>
          </div>
          <div class="form-group">
            <label>Session *</label>
            <select class="form-input" id="f-session" required>
              <option value="Asia" ${isEdit && tradeData.session==='Asia'?'selected':''}>Asia</option>
              <option value="London" ${isEdit && tradeData.session==='London'?'selected':''}>London</option>
              <option value="New York" ${!isEdit || tradeData.session==='New York'?'selected':''}>New York</option>
              <option value="Other" ${isEdit && tradeData.session==='Other'?'selected':''}>Other</option>
            </select>
          </div>
          <div class="form-group">
            <label>Direction *</label>
            <select class="form-input" id="f-direction" required>
              <option value="Buy" ${isEdit && tradeData.direction==='Buy'?'selected':''}>Buy</option>
              <option value="Sell" ${isEdit && tradeData.direction==='Sell'?'selected':''}>Sell</option>
            </select>
          </div>
        </div>

        <div class="form-section-header">Execution</div>
        <div class="form-grid-3">
          <div class="form-group">
            <label>Entry Price *</label>
            <input type="number" step="0.001" class="form-input" id="f-entry" value="${isEdit ? tradeData.entry_price : ''}" required>
          </div>
          <div class="form-group">
            <label>Stop Loss *</label>
            <input type="number" step="0.001" class="form-input" id="f-sl" value="${isEdit ? tradeData.stop_loss : ''}" required>
          </div>
          <div class="form-group">
            <label>Take Profit *</label>
            <input type="number" step="0.001" class="form-input" id="f-tp" value="${isEdit ? tradeData.take_profit : ''}" required>
          </div>
        </div>
        
        <div class="calc-preview">
          Calculated Risk: <span id="f-calc-risk" class="text-gold">0.00</span> points | Target RR: <span id="f-calc-rr" class="text-gold">0.00</span>
        </div>

        <div class="form-grid-3">
          <div class="form-group">
            <label>Risk Amount ($) *</label>
            <input type="number" step="0.01" class="form-input" id="f-risk" value="${isEdit ? tradeData.risk : app.state.settings.default_risk}" required>
          </div>
          <div class="form-group">
            <label>Result *</label>
            <select class="form-input" id="f-result" required>
              <option value="Win" ${isEdit && tradeData.result==='Win'?'selected':''}>Win</option>
              <option value="Loss" ${isEdit && tradeData.result==='Loss'?'selected':''}>Loss</option>
              <option value="BE" ${isEdit && tradeData.result==='BE'?'selected':''}>Break Even</option>
            </select>
          </div>
          <div class="form-group">
            <label>P&L ($)</label>
            <input type="number" step="0.01" class="form-input" id="f-pnl" value="${isEdit ? tradeData.pnl : ''}" placeholder="Leave empty for auto">
          </div>
        </div>

        <div class="form-section-header">Setup & Mistakes</div>
        <div class="form-group">
          <label>Setup (Select multiple)</label>
          <div class="tag-picker" id="f-setup-picker">
            ${setupsHtml}
          </div>
        </div>
        <div class="form-group">
          <label>Mistakes (Select multiple)</label>
          <div class="tag-picker" id="f-mistake-picker">
            ${mistakesHtml}
          </div>
        </div>

        <div class="form-section-header">Market Context</div>
        <div class="form-grid-6">
          ${['Daily', 'Hourly', 'M30', 'M15', 'M5', 'M1'].map(tf => {
            const field = tf.toLowerCase() + '_bias';
            const val = isEdit ? tradeData[field] : '';
            return `
              <div class="form-group">
                <label>${tf}</label>
                <select class="form-input" id="f-${field}">
                  <option value="" ${!val?'selected':''}>-</option>
                  <option value="Bullish" ${val==='Bullish'?'selected':''}>Bull</option>
                  <option value="Bearish" ${val==='Bearish'?'selected':''}>Bear</option>
                  <option value="Neutral" ${val==='Neutral'?'selected':''}>Neut</option>
                </select>
              </div>
            `;
          }).join('')}
        </div>

        <div class="form-section-header">Review</div>
        <div class="form-group">
          <label>Lesson Learned</label>
          <input type="text" class="form-input" id="f-lesson" value="${isEdit && tradeData.lesson ? tradeData.lesson : ''}">
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea class="form-input" id="f-notes" rows="3">${isEdit && tradeData.notes ? tradeData.notes : ''}</textarea>
        </div>

        <div class="form-section-header">Screenshots</div>
        <div class="form-group">
          <input type="file" id="f-screenshot-input" accept="image/*" multiple style="display:none;">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('f-screenshot-input').click()">+ Add Screenshot</button>
          <div id="f-screenshot-preview" class="screenshot-grid" style="margin-top: 10px;">
            <!-- Previews render here -->
          </div>
        </div>
      </form>
    `;

    this.attachListeners();
    this.renderScreenshotPreviews();
  },

  attachListeners() {
    // Tag pickers
    document.querySelectorAll(".tag-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        pill.classList.toggle("active");
      });
    });

    // Live calculations
    const entryEl = document.getElementById("f-entry");
    const slEl = document.getElementById("f-sl");
    const tpEl = document.getElementById("f-tp");
    const dirEl = document.getElementById("f-direction");
    
    const calc = () => {
      const e = parseFloat(entryEl.value);
      const sl = parseFloat(slEl.value);
      const tp = parseFloat(tpEl.value);
      const dir = dirEl.value;

      let riskPts = 0;
      let targetPts = 0;

      if (!isNaN(e) && !isNaN(sl)) {
        riskPts = dir === "Buy" ? e - sl : sl - e;
        document.getElementById("f-calc-risk").textContent = riskPts.toFixed(2);
      }
      
      if (!isNaN(e) && !isNaN(sl) && !isNaN(tp) && riskPts > 0) {
        targetPts = dir === "Buy" ? tp - e : e - tp;
        const rr = targetPts / riskPts;
        document.getElementById("f-calc-rr").textContent = rr.toFixed(2);
      } else {
        document.getElementById("f-calc-rr").textContent = "0.00";
      }
    };

    entryEl.addEventListener("input", calc);
    slEl.addEventListener("input", calc);
    tpEl.addEventListener("input", calc);
    dirEl.addEventListener("change", calc);

    // Screenshots
    document.getElementById("f-screenshot-input").addEventListener("change", (e) => {
      const files = e.target.files;
      for (let i = 0; i < files.length; i++) {
        this.pendingScreenshots.push({
          file: files[i],
          category: "Entry", // default
          url: URL.createObjectURL(files[i])
        });
      }
      this.renderScreenshotPreviews();
      e.target.value = ""; // reset
    });
  },

  renderScreenshotPreviews() {
    const container = document.getElementById("f-screenshot-preview");
    let html = "";

    // Existing
    this.existingScreenshots.forEach((ss, idx) => {
      html += `
        <div class="screenshot-thumb-box">
          <img src="/api/screenshots/file/${ss.filename}">
          <div class="screenshot-actions">
            <span>${ss.category}</span>
            <button type="button" class="icon-btn danger" onclick="formManager.removeExistingScreenshot(${idx})" style="padding:2px;">✕</button>
          </div>
        </div>
      `;
    });

    // Pending
    this.pendingScreenshots.forEach((ps, idx) => {
      html += `
        <div class="screenshot-thumb-box" style="border: 2px dashed var(--color-gold);">
          <img src="${ps.url}">
            <select onchange="formManager.updatePendingCategory(${idx}, this.value)" style="font-size:10px; padding:2px; background:var(--bg-surface); color:var(--text-main); border:1px solid var(--border-subtle); border-radius:3px;">
              <option value="HTF" ${ps.category==='HTF'?'selected':''}>HTF</option>
              <option value="15M" ${ps.category==='15M'?'selected':''}>15M</option>
              <option value="5M" ${ps.category==='5M'?'selected':''}>5M</option>
              <option value="1M" ${ps.category==='1M'?'selected':''}>1M</option>
              <option value="Before entry" ${ps.category==='Before entry'?'selected':''}>Before entry</option>
              <option value="After entry" ${ps.category==='After entry'?'selected':''}>After entry</option>
              <option value="Result" ${ps.category==='Result'?'selected':''}>Result</option>
            </select>
            <button type="button" class="icon-btn danger" onclick="formManager.removePendingScreenshot(${idx})" style="padding:2px;">✕</button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  removeExistingScreenshot(idx) {
    if (confirm("Remove this screenshot? This is immediate and cannot be undone.")) {
      const ss = this.existingScreenshots[idx];
      api.deleteScreenshot(ss.id).then(() => {
        this.existingScreenshots.splice(idx, 1);
        this.renderScreenshotPreviews();
        app.showToast("Screenshot removed");
      }).catch(e => {});
    }
  },

  removePendingScreenshot(idx) {
    this.pendingScreenshots.splice(idx, 1);
    this.renderScreenshotPreviews();
  },

  updatePendingCategory(idx, val) {
    this.pendingScreenshots[idx].category = val;
  },

  async saveTrade() {
    const form = document.getElementById("trade-form");
    if (!form.reportValidity()) return; // Trigger browser validation

    const btn = document.getElementById("trade-modal-save");
    btn.disabled = true;
    btn.textContent = "Saving...";

    try {
      // Collect tags
      const setups = Array.from(document.querySelectorAll("#f-setup-picker .tag-pill.active")).map(el => el.textContent).join(", ");
      const mistakes = Array.from(document.querySelectorAll("#f-mistake-picker .tag-pill.active")).map(el => el.textContent).join(", ");

      const data = {
        date: document.getElementById("f-date").value,
        time: document.getElementById("f-time").value,
        pair: document.getElementById("f-pair").value,
        session: document.getElementById("f-session").value,
        direction: document.getElementById("f-direction").value,
        
        entry_price: parseFloat(document.getElementById("f-entry").value),
        stop_loss: parseFloat(document.getElementById("f-sl").value),
        take_profit: parseFloat(document.getElementById("f-tp").value),
        risk: parseFloat(document.getElementById("f-risk").value),
        
        result: document.getElementById("f-result").value,
        pnl: document.getElementById("f-pnl").value ? parseFloat(document.getElementById("f-pnl").value) : null,
        
        setup: setups || null,
        mistake: mistakes || null,
        
        daily_bias: document.getElementById("f-daily_bias").value || null,
        hourly_bias: document.getElementById("f-hourly_bias").value || null,
        m30_bias: document.getElementById("f-m30_bias").value || null,
        m15_bias: document.getElementById("f-m15_bias").value || null,
        m5_bias: document.getElementById("f-m5_bias").value || null,
        m1_bias: document.getElementById("f-m1_bias").value || null,
        
        lesson: document.getElementById("f-lesson").value || null,
        notes: document.getElementById("f-notes").value || null
      };

      // 1. Save Trade
      let savedTrade;
      if (this.editingId) {
        savedTrade = await api.updateTrade(this.editingId, data);
        app.showToast("Trade updated successfully");
      } else {
        savedTrade = await api.createTrade(data);
        app.showToast("Trade created successfully");
      }

      // 2. Upload Pending Screenshots
      for (const ps of this.pendingScreenshots) {
        const formData = new FormData();
        formData.append("file", ps.file);
        formData.append("trade_id", savedTrade.id);
        formData.append("category", ps.category);
        await api.uploadScreenshot(formData);
      }

      // 3. Cleanup & Refresh
      app.closeTradeModal();
      if (typeof journal !== "undefined") {
        journal.loadTrades(); // reload table
      }
      app.refreshGlobalStats();

    } catch (e) {
      console.error(e);
      // api.js handles toast
    } finally {
      btn.disabled = false;
      btn.textContent = "Save Trade";
    }
  }
};
