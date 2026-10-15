/**
 * setup_analysis.js
 * Setup Analysis page — per-setup performance stats + screenshot gallery.
 */

const setupAnalysis = (() => {
  let _data = null;
  let _selectedSetup = null;
  let _container = null;

  // ── Public entry point ────────────────────────────────────────────────────
  async function render(container) {
    _container = container;
    container.innerHTML = buildSkeleton();
    await load();
  }

  // ── Page structure ─────────────────────────────────────────────────────────
  function buildSkeleton() {
    return `
    <div class="setup-analysis-page">

      <div class="gallery-header">
        <div>
          <h1 class="gallery-title">Setup analysis</h1>
          <p class="gallery-subtitle text-secondary">Performance breakdown and screenshot gallery per setup</p>
        </div>
      </div>

      <!-- Setup selector -->
      <div class="card-surface sa-filter-bar">
        <div class="filter-group" style="max-width:320px;">
          <label class="filter-label" for="sa-setup-select">Select setup</label>
          <select class="form-control" id="sa-setup-select" onchange="setupAnalysis.onSetupChange()">
            <option value="">-- Choose a Setup --</option>
          </select>
        </div>
      </div>

      <!-- Stats panel -->
      <div id="sa-stats-panel" class="hidden"></div>

      <!-- Screenshots for selected setup -->
      <div id="sa-screenshots-panel" class="hidden">
        <div class="sa-section-title">Screenshots for this Setup</div>
        <div class="gallery-grid gallery-grid-mode" id="sa-gallery-grid"></div>
        <div class="gallery-empty hidden" id="sa-gallery-empty">
          <div class="empty-icon">🖼️</div>
          <p class="text-muted">No screenshots tagged with this setup.</p>
        </div>
      </div>

      <!-- Placeholder when no setup chosen -->
      <div id="sa-placeholder" class="gallery-empty" style="margin-top:48px;">
        <div class="empty-icon">🧩</div>
        <h3>Select a setup above</h3>
        <p class="text-muted">Choose a setup from the dropdown to see its performance and screenshot gallery.</p>
      </div>

    </div>`;
  }

  // ── Load setup list ────────────────────────────────────────────────────────
  async function load() {
    const select = document.getElementById("sa-setup-select");
    if (!select) return;

    try {
      // Populate from app state setups
      const setups = app.state.setups || [];
      if (setups.length === 0) {
        select.innerHTML = `<option value="">No setups configured — add them in Settings</option>`;
        return;
      }

      setups.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.name;
        opt.textContent = s.name;
        select.appendChild(opt);
      });
    } catch (err) {
      app.showToast("Failed to load setups: " + err.message, "error");
    }
  }

  // ── On setup selection change ──────────────────────────────────────────────
  async function onSetupChange() {
    const select = document.getElementById("sa-setup-select");
    if (!select) return;

    const chosen = select.value;
    _selectedSetup = chosen;

    const statsPanel = document.getElementById("sa-stats-panel");
    const ssPanel = document.getElementById("sa-screenshots-panel");
    const placeholder = document.getElementById("sa-placeholder");

    if (!chosen) {
      statsPanel?.classList.add("hidden");
      ssPanel?.classList.add("hidden");
      placeholder?.classList.remove("hidden");
      return;
    }

    placeholder?.classList.add("hidden");
    statsPanel?.classList.remove("hidden");
    statsPanel.innerHTML = `<div class="gallery-loading"><div class="gallery-spinner"></div><p>Loading analysis...</p></div>`;
    ssPanel?.classList.add("hidden");

    try {
      _data = await api.getSetupAnalysis({ setup: chosen });
      renderStats(_data);
      await renderScreenshots(chosen);
    } catch (err) {
      statsPanel.innerHTML = `<div class="gallery-error"><p>Failed to load: ${err.message}</p></div>`;
    }
  }

  // ── Render stats cards + table ─────────────────────────────────────────────
  function renderStats(data) {
    const panel = document.getElementById("sa-stats-panel");
    if (!panel || !data) return;

    const wr = data.win_rate !== null && data.win_rate !== undefined
      ? `${Number(data.win_rate).toFixed(1)}%` : "--%";

    const pnl = data.total_pnl !== null && data.total_pnl !== undefined
      ? `${data.total_pnl >= 0 ? "+" : ""}$${Math.abs(Number(data.total_pnl)).toFixed(2)}` : "--";

    const pnlClass = data.total_pnl >= 0 ? "text-win" : "text-loss";

    const totalR = data.total_r !== null && data.total_r !== undefined
      ? `${data.total_r >= 0 ? "+" : ""}${Number(data.total_r).toFixed(2)}R` : "--";

    const totalRClass = data.total_r >= 0 ? "text-win" : "text-loss";

    const avgR = data.avg_r !== null && data.avg_r !== undefined
      ? `${data.avg_r >= 0 ? "+" : ""}${Number(data.avg_r).toFixed(2)}R` : "--";

    const avgRClass = (data.avg_r || 0) >= 0 ? "text-win" : "text-loss";

    panel.innerHTML = `
    <div class="sa-stats-section">
      <div class="sa-kpi-grid">
        <div class="sa-kpi-card">
          <div class="sa-kpi-label">Total Trades</div>
          <div class="sa-kpi-value">${data.number_of_trades ?? data.total_trades ?? 0}</div>
        </div>
        <div class="sa-kpi-card thumb-win">
          <div class="sa-kpi-label">Wins</div>
          <div class="sa-kpi-value text-win">${data.wins || 0}</div>
        </div>
        <div class="sa-kpi-card thumb-loss">
          <div class="sa-kpi-label">Losses</div>
          <div class="sa-kpi-value text-loss">${data.losses || 0}</div>
        </div>
        <div class="sa-kpi-card">
          <div class="sa-kpi-label">Breakeven</div>
          <div class="sa-kpi-value text-be">${data.breakeven ?? data.be ?? 0}</div>
        </div>
        <div class="sa-kpi-card">
          <div class="sa-kpi-label">Win Rate</div>
          <div class="sa-kpi-value ${Number(data.win_rate) >= 50 ? 'text-win' : 'text-loss'}">${wr}</div>
        </div>
        <div class="sa-kpi-card">
          <div class="sa-kpi-label">Total P&amp;L</div>
          <div class="sa-kpi-value ${pnlClass}">${pnl}</div>
        </div>
        <div class="sa-kpi-card">
          <div class="sa-kpi-label">Total R</div>
          <div class="sa-kpi-value ${totalRClass}">${totalR}</div>
        </div>
        <div class="sa-kpi-card">
          <div class="sa-kpi-label">Avg R / Trade</div>
          <div class="sa-kpi-value ${avgRClass}">${avgR}</div>
        </div>
      </div>

      <!-- Win / Loss / BE bar -->
      <div class="sa-bar-section">
        <div class="sa-bar-label">
          <span class="text-win">W ${data.wins || 0}</span>
          <span class="text-muted" style="margin:0 8px;">|</span>
          <span class="text-loss">Loss ${data.losses || 0}</span>
          <span class="text-muted" style="margin:0 8px;">|</span>
          <span class="text-be">BE ${data.breakeven ?? data.be ?? 0}</span>
        </div>
        <div class="sa-progress-bar">
          ${buildBar(data)}
        </div>
      </div>
    </div>`;
  }

  function buildBar(data) {
    const total = (data.number_of_trades ?? data.total_trades ?? 0);
    if (total === 0) return `<div class="sa-bar-seg" style="width:100%;background:var(--border-default);"></div>`;

    const beCount = data.breakeven ?? data.be ?? 0;
    const wPct = (((data.wins || 0) / total) * 100).toFixed(1);
    const lPct = (((data.losses || 0) / total) * 100).toFixed(1);
    const bePct = ((beCount / total) * 100).toFixed(1);

    return `
      <div class="sa-bar-seg" style="width:${wPct}%;background:var(--color-win);" title="Win ${wPct}%"></div>
      <div class="sa-bar-seg" style="width:${lPct}%;background:var(--color-loss);" title="Loss ${lPct}%"></div>
      <div class="sa-bar-seg" style="width:${bePct}%;background:var(--color-be);" title="BE ${bePct}%"></div>
    `;
  }

  // ── Render screenshot gallery for selected setup ───────────────────────────
  async function renderScreenshots(setup) {
    const ssPanel = document.getElementById("sa-screenshots-panel");
    const grid    = document.getElementById("sa-gallery-grid");
    const emptyEl = document.getElementById("sa-gallery-empty");

    if (!ssPanel || !grid) return;
    ssPanel.classList.remove("hidden");
    grid.innerHTML = `<div class="gallery-loading"><div class="gallery-spinner"></div><p>Loading screenshots...</p></div>`;

    try {
      const shots = await api.getGallery({ setup });

      if (!shots || shots.length === 0) {
        grid.innerHTML = "";
        emptyEl?.classList.remove("hidden");
        return;
      }
      emptyEl?.classList.add("hidden");

      grid.innerHTML = shots.map((item, idx) => buildSsThumb(item, idx, shots)).join("");

      // Lazy load
      grid.querySelectorAll("img[data-src]").forEach(img => {
        if ("IntersectionObserver" in window) {
          const obs = new IntersectionObserver(entries => {
            entries.forEach(e => {
              if (e.isIntersecting) { img.src = img.dataset.src; img.removeAttribute("data-src"); obs.unobserve(img); }
            });
          }, { rootMargin: "200px" });
          obs.observe(img);
        } else {
          img.src = img.dataset.src;
        }
      });

    } catch (err) {
      grid.innerHTML = `<div class="gallery-error"><p>Failed to load screenshots: ${err.message}</p></div>`;
    }
  }

  function buildSsThumb(item, idx, allShots) {
    const resultClass = item.result === "Win" ? "thumb-win" : item.result === "Loss" ? "thumb-loss" : item.result === "BE" ? "thumb-be" : "";
    const rVal = item.r_multiple;
    const rText = rVal !== null && rVal !== undefined ? `${rVal > 0 ? "+" : ""}${Number(rVal).toFixed(2)}R` : "";

    return `
    <div class="gallery-thumb ${resultClass}" role="button" tabindex="0" aria-label="Open setup screenshot ${idx + 1} in lightbox" onclick="setupAnalysis.openLightbox(${idx})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();setupAnalysis.openLightbox(${idx})}">
      <div class="thumb-img-wrap">
        <img data-src="/api/screenshots/file/${item.filename}" alt="${item.category || 'Screenshot'}"
          onerror="this.parentElement.innerHTML='<div class=\\'thumb-no-img\\'>No Image</div>'">
        <div class="thumb-overlay"><div class="thumb-open-btn">🔍 View Full</div></div>
      </div>
      <div class="thumb-footer">
        <div class="thumb-row">
          <span class="thumb-category">${item.category || "General"}</span>
          ${item.result ? `<span class="${item.result === 'Win' ? 'text-win' : item.result === 'Loss' ? 'text-loss' : 'text-be'}">${item.result}</span>` : ""}
        </div>
        <div class="thumb-row">
          <span class="thumb-date text-muted">${item.trade_date || ""}</span>
          ${rText ? `<span class="thumb-r ${(rVal >= 0 ? 'text-win' : 'text-loss')}">${rText}</span>` : ""}
        </div>
      </div>
    </div>`;
  }

  // ── Open lightbox (setup screenshots) ────────────────────────────────────
  let _currentShots = [];
  async function openLightbox(idx) {
    // Re-fetch for the current setup to pass to lightbox
    if (!_selectedSetup) return;
    if (_currentShots.length === 0) {
      _currentShots = await api.getGallery({ setup: _selectedSetup });
    }
    if (typeof lightbox !== "undefined") {
      lightbox.open(_currentShots, idx);
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    render,
    onSetupChange,
    openLightbox,
  };
})();
