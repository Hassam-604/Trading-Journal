/**
 * gallery.js
 * Trade Gallery & Visual Review — screenshot grid with filters and lightbox.
 */

const gallery = (() => {
  let _allScreenshots = [];
  let _filtered = [];
  let _container = null;

  // ── Public render entry point ──────────────────────────────────────────────
  async function render(container) {
    _container = container;
    container.innerHTML = buildSkeleton();
    attachFilterListeners();
    await load();
  }

  // ── Skeleton HTML ──────────────────────────────────────────────────────────
  function buildSkeleton() {
    return `
    <div class="gallery-page">

      <!-- Header bar -->
      <div class="gallery-header">
        <div>
          <h1 class="gallery-title">📸 Trade Gallery</h1>
          <p class="gallery-subtitle text-secondary">Visual review of all trade screenshots</p>
        </div>
        <div class="gallery-header-actions">
          <span class="gallery-count-badge" id="gallery-count-badge">Loading...</span>
          <button class="btn btn-primary" id="btn-review-mode" onclick="gallery.openReviewMode()">▶ Review Mode</button>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="gallery-filter-bar card-surface">
        <div class="gallery-filters-grid">

          <div class="filter-group">
            <label class="filter-label" for="gf-result">Result</label>
            <select class="form-control filter-ctrl" id="gf-result">
              <option value="">All Results</option>
              <option value="Win">Win</option>
              <option value="Loss">Loss</option>
              <option value="BE">BE</option>
            </select>
          </div>

          <div class="filter-group">
            <label class="filter-label" for="gf-category">Category</label>
            <select class="form-control filter-ctrl" id="gf-category">
              <option value="">All Categories</option>
              <option value="HTF">HTF</option>
              <option value="15M">15M</option>
              <option value="5M">5M</option>
              <option value="1M">1M</option>
              <option value="Before Entry">Before Entry</option>
              <option value="After Entry">After Entry</option>
              <option value="Result">Result</option>
              <option value="general">General</option>
            </select>
          </div>

          <div class="filter-group">
            <label class="filter-label" for="gf-direction">Direction</label>
            <select class="form-control filter-ctrl" id="gf-direction">
              <option value="">Any Direction</option>
              <option value="Buy">Buy</option>
              <option value="Sell">Sell</option>
            </select>
          </div>

          <div class="filter-group">
            <label class="filter-label" for="gf-setup">Setup</label>
            <select class="form-control filter-ctrl" id="gf-setup">
              <option value="">All Setups</option>
            </select>
          </div>

          <div class="filter-group">
            <label class="filter-label" for="gf-session">Session</label>
            <select class="form-control filter-ctrl" id="gf-session">
              <option value="">All Sessions</option>
              <option value="London">London</option>
              <option value="New York">New York</option>
              <option value="Asia">Asia</option>
              <option value="Pre-London">Pre-London</option>
            </select>
          </div>

          <div class="filter-group">
            <label class="filter-label" for="gf-reviewed">Review State</label>
            <select class="form-control filter-ctrl" id="gf-reviewed">
              <option value="">All</option>
              <option value="false">Unreviewed</option>
              <option value="true">Reviewed</option>
            </select>
          </div>

          <div class="filter-group">
            <label class="filter-label" for="gf-date-from">Date From</label>
            <input type="date" class="form-control filter-ctrl" id="gf-date-from">
          </div>

          <div class="filter-group">
            <label class="filter-label" for="gf-date-to">Date To</label>
            <input type="date" class="form-control filter-ctrl" id="gf-date-to">
          </div>

          <div class="filter-group">
            <label class="filter-label" for="gf-min-r">Min R</label>
            <input type="number" class="form-control filter-ctrl" id="gf-min-r" step="0.1" placeholder="e.g. 1.5">
          </div>

        </div>

        <div class="gallery-filter-actions">
          <button class="btn btn-secondary btn-sm" id="btn-gallery-reset" onclick="gallery.resetFilters()">Reset Filters</button>
          <button class="btn btn-gold btn-sm" id="btn-gallery-apply" onclick="gallery.applyFilters()">Apply Filters</button>
        </div>
      </div>

      <!-- Sort & view toggle row -->
      <div class="gallery-toolbar">
        <div class="gallery-view-btns">
          <button class="view-toggle-btn active" id="view-grid" type="button" aria-pressed="true" onclick="gallery.setView('grid')">⊞ Grid</button>
          <button class="view-toggle-btn" id="view-masonry" type="button" aria-pressed="false" onclick="gallery.setView('masonry')">⧉ Masonry</button>
        </div>
        <div class="gallery-sort-group">
          <label class="filter-label" for="gf-sort">Sort by</label>
          <select class="form-control filter-ctrl" id="gf-sort" onchange="gallery.applySort()">
            <option value="date_desc">Date (Newest First)</option>
            <option value="date_asc">Date (Oldest First)</option>
            <option value="r_desc">R Multiple (High to Low)</option>
            <option value="r_asc">R Multiple (Low to High)</option>
          </select>
        </div>
      </div>

      <!-- Gallery Grid -->
      <div class="gallery-grid gallery-grid-mode" id="gallery-grid"></div>

      <!-- Empty state -->
      <div class="gallery-empty hidden" id="gallery-empty">
        <div class="empty-icon">📷</div>
        <h3>No screenshots found</h3>
        <p class="text-muted">Upload screenshots when logging trades, or try adjusting your filters.</p>
      </div>

    </div>
    `;
  }

  // ── Load data ──────────────────────────────────────────────────────────────
  async function load() {
    const grid = document.getElementById("gallery-grid");
    if (grid) grid.innerHTML = `<div class="gallery-loading"><div class="gallery-spinner"></div><p>Loading screenshots...</p></div>`;

    try {
      // Populate setup dropdown from app state
      const setupSel = document.getElementById("gf-setup");
      if (setupSel && app.state.setups && app.state.setups.length > 0) {
        app.state.setups.forEach(s => {
          const opt = document.createElement("option");
          opt.value = s.name;
          opt.textContent = s.name;
          setupSel.appendChild(opt);
        });
      }

      const params = buildParams();
      _allScreenshots = await api.getGallery(params);
      _filtered = [..._allScreenshots];
      applySort(false);
      renderGrid();
    } catch (err) {
      const grid = document.getElementById("gallery-grid");
      if (grid) grid.innerHTML = `<div class="gallery-error"><p>Failed to load screenshots: ${err.message}</p></div>`;
    }
  }

  // ── Build API params from filters ──────────────────────────────────────────
  function buildParams() {
    const result     = document.getElementById("gf-result")?.value || "";
    const category   = document.getElementById("gf-category")?.value || "";
    const direction  = document.getElementById("gf-direction")?.value || "";
    const setup      = document.getElementById("gf-setup")?.value || "";
    const session    = document.getElementById("gf-session")?.value || "";
    const reviewed   = document.getElementById("gf-reviewed")?.value;
    const dateFrom   = document.getElementById("gf-date-from")?.value || "";
    const dateTo     = document.getElementById("gf-date-to")?.value || "";
    const minR       = document.getElementById("gf-min-r")?.value || "";

    const params = {};
    if (result)    params.result = result;
    if (category)  params.category = category;
    if (direction) params.direction = direction;
    if (setup)     params.setup = setup;
    if (session)   params.session = session;
    if (reviewed !== "" && reviewed !== undefined && reviewed !== null) params.is_reviewed = reviewed;
    if (dateFrom)  params.date_from = dateFrom;
    if (dateTo)    params.date_to = dateTo;
    if (minR)      params.min_r = minR;
    return params;
  }

  // ── Apply filters (re-fetch) ───────────────────────────────────────────────
  async function applyFilters() {
    const grid = document.getElementById("gallery-grid");
    if (grid) grid.innerHTML = `<div class="gallery-loading"><div class="gallery-spinner"></div><p>Filtering...</p></div>`;

    try {
      const params = buildParams();
      _allScreenshots = await api.getGallery(params);
      _filtered = [..._allScreenshots];
      applySort(false);
      renderGrid();
    } catch (err) {
      app.showToast("Filter failed: " + err.message, "error");
    }
  }

  // ── Reset filters ─────────────────────────────────────────────────────────
  async function resetFilters() {
    ["gf-result", "gf-category", "gf-direction", "gf-setup", "gf-session", "gf-reviewed", "gf-min-r"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    ["gf-date-from", "gf-date-to"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    await applyFilters();
  }

  // ── Sort ───────────────────────────────────────────────────────────────────
  function applySort(rerender) {
    if (rerender === undefined) rerender = true;
    const sortVal = document.getElementById("gf-sort")?.value || "date_desc";
    _filtered.sort((a, b) => {
      switch (sortVal) {
        case "date_asc":  return (a.trade_date || "").localeCompare(b.trade_date || "");
        case "r_desc":    return (b.r_multiple || 0) - (a.r_multiple || 0);
        case "r_asc":     return (a.r_multiple || 0) - (b.r_multiple || 0);
        default:          return (b.trade_date || "").localeCompare(a.trade_date || "");
      }
    });
    if (rerender) renderGrid();
  }

  // ── Render grid ────────────────────────────────────────────────────────────
  function renderGrid() {
    const grid = document.getElementById("gallery-grid");
    const emptyEl = document.getElementById("gallery-empty");
    const badge = document.getElementById("gallery-count-badge");

    if (badge) badge.textContent = `${_filtered.length} screenshot${_filtered.length !== 1 ? "s" : ""}`;

    if (!grid) return;

    if (_filtered.length === 0) {
      grid.innerHTML = "";
      if (emptyEl) emptyEl.classList.remove("hidden");
      return;
    }
    if (emptyEl) emptyEl.classList.add("hidden");

    grid.innerHTML = _filtered.map((item, idx) => buildThumb(item, idx)).join("");

    // Lazy load images
    const imgs = grid.querySelectorAll("img[data-src]");
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const img = e.target;
            img.src = img.dataset.src;
            img.removeAttribute("data-src");
            observer.unobserve(img);
          }
        });
      }, { rootMargin: "200px" });
      imgs.forEach(img => observer.observe(img));
    } else {
      imgs.forEach(img => { img.src = img.dataset.src; });
    }
  }

  // ── Build thumbnail card ──────────────────────────────────────────────────
  function buildThumb(item, idx) {
    const resultClass = item.result === "Win"  ? "thumb-win"
                      : item.result === "Loss" ? "thumb-loss"
                      : item.result === "BE"   ? "thumb-be" : "";

    const rVal = item.r_multiple;
    const rText = rVal !== null && rVal !== undefined
      ? `${rVal > 0 ? "+" : ""}${Number(rVal).toFixed(2)}R`
      : "";

    const reviewedBadge = item.is_reviewed
      ? `<span class="thumb-reviewed-badge" title="Reviewed">✓</span>`
      : `<span class="thumb-unreviewed-badge" title="Not reviewed">●</span>`;

    const dirClass = item.direction === "Buy" ? "dir-buy" : item.direction === "Sell" ? "dir-sell" : "";

    return `
    <div class="gallery-thumb ${resultClass}" role="button" tabindex="0" aria-label="Open screenshot ${idx + 1} in lightbox" onclick="gallery.openLightbox(${idx})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();gallery.openLightbox(${idx})}">
      <div class="thumb-img-wrap">
        <img
          data-src="/api/screenshots/file/${item.filename}"
          alt="${(item.category || 'Screenshot').replace(/"/g, '')}"
          onerror="this.parentElement.innerHTML='<div class=\\'thumb-no-img\\'>No Image</div>'"
        >
        <div class="thumb-overlay">
          <div class="thumb-open-btn">🔍 View Full</div>
        </div>
      </div>
      <div class="thumb-footer">
        <div class="thumb-row">
          <span class="thumb-category">${item.category || "General"}</span>
          ${reviewedBadge}
        </div>
        <div class="thumb-row">
          <span class="thumb-date text-muted">${item.trade_date || ""}</span>
          ${rText ? `<span class="thumb-r ${rVal >= 0 ? 'text-win' : 'text-loss'}">${rText}</span>` : ""}
        </div>
        <div class="thumb-row">
          ${item.direction ? `<span class="thumb-dir ${dirClass}">${item.direction}</span>` : ""}
          ${item.result ? `<span class="thumb-result ${item.result === 'Win' ? 'text-win' : item.result === 'Loss' ? 'text-loss' : 'text-be'}">${item.result}</span>` : ""}
        </div>
        ${item.setup ? `<div class="thumb-setup text-gold">${item.setup}</div>` : ""}
      </div>
    </div>`;
  }

  // ── Open lightbox ─────────────────────────────────────────────────────────
  function openLightbox(idx) {
    if (typeof lightbox !== "undefined") {
      lightbox.open(_filtered, idx);
    }
  }

  // ── Review Mode (sequential walkthrough of unreviewed trades) ─────────────
  async function openReviewMode() {
    try {
      const queue = await api.getReviewQueue();
      if (!queue || queue.length === 0) {
        app.showToast("All trades reviewed! Great work.", "success");
        return;
      }
      // Flatten all screenshots from trades in the queue
      const items = [];
      queue.forEach(trade => {
        if (trade.screenshots && trade.screenshots.length > 0) {
          trade.screenshots.forEach(ss => {
            items.push({
              ...ss,
              trade_id: trade.id,
              trade_date: trade.trade_date,
              pair: trade.pair,
              direction: trade.direction,
              result: trade.result,
              r_multiple: trade.r_multiple,
              setup: trade.setup,
              session: trade.session,
              is_reviewed: trade.is_reviewed,
            });
          });
        }
      });

      if (items.length === 0) {
        app.showToast("No screenshots in unreviewed trades.", "info");
        return;
      }
      lightbox.open(items, 0);
    } catch (err) {
      app.showToast("Failed to load review queue: " + err.message, "error");
    }
  }

  // ── View toggle (grid / masonry) ──────────────────────────────────────────
  function setView(mode) {
    const grid = document.getElementById("gallery-grid");
    document.querySelectorAll(".view-toggle-btn").forEach(button => {
      button.classList.remove("active");
      button.setAttribute("aria-pressed", "false");
    });

    if (mode === "masonry") {
      document.getElementById("view-masonry")?.classList.add("active");
      document.getElementById("view-masonry")?.setAttribute("aria-pressed", "true");
      if (grid) {
        grid.classList.add("gallery-masonry");
        grid.classList.remove("gallery-grid-mode");
      }
    } else {
      document.getElementById("view-grid")?.classList.add("active");
      document.getElementById("view-grid")?.setAttribute("aria-pressed", "true");
      if (grid) {
        grid.classList.remove("gallery-masonry");
        grid.classList.add("gallery-grid-mode");
      }
    }
  }

  // ── Attach filter listeners (Enter key triggers apply) ────────────────────
  function attachFilterListeners() {
    setTimeout(() => {
      document.querySelectorAll(".filter-ctrl").forEach(el => {
        el.addEventListener("keydown", e => {
          if (e.key === "Enter") applyFilters();
        });
      });
    }, 150);
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    render,
    applyFilters,
    resetFilters,
    applySort: function() { applySort(true); },
    openLightbox,
    openReviewMode,
    setView,
  };
})();
