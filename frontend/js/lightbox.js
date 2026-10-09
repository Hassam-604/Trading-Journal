/**
 * lightbox.js
 * Full-screen image viewer with Zoom In, Zoom Out, Fit to Screen,
 * Original Size, Fullscreen, Previous, Next, Drag-to-Pan, and Trade Info overlay.
 */

const lightbox = (() => {
  let images = [];
  let currentIndex = 0;
  let zoomLevel = 1.0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let panX = 0;
  let panY = 0;
  let naturalWidth = 0;
  let naturalHeight = 0;

  function init() {
    if (document.getElementById("lightbox-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "lightbox-overlay";
    overlay.className = "lightbox-overlay";
    overlay.innerHTML = `
      <div class="lightbox-toolbar">
        <div class="lightbox-info" id="lightbox-info">
          <span class="lightbox-counter" id="lb-counter">1 / 1</span>
          <span class="lightbox-meta" id="lb-meta">Trade Details</span>
        </div>
        
        <div class="lightbox-controls">
          <button type="button" class="lb-btn" id="lb-zoom-in" title="Zoom In (+)">🔍+</button>
          <button type="button" class="lb-btn" id="lb-zoom-out" title="Zoom Out (-)">🔍-</button>
          <button type="button" class="lb-btn" id="lb-fit" title="Fit to Screen (0)">🖥️ Fit</button>
          <button type="button" class="lb-btn" id="lb-orig" title="Original Size (1)">📏 1:1</button>
          <button type="button" class="lb-btn" id="lb-fullscreen" title="Fullscreen (F)">⛶</button>
          <button type="button" class="lb-btn lb-btn-close" id="lb-close" title="Close (Esc)">✕</button>
        </div>
      </div>

      <button type="button" class="lb-nav-btn lb-prev" id="lb-prev" title="Previous (Left Arrow)">❮</button>
      <button type="button" class="lb-nav-btn lb-next" id="lb-next" title="Next (Right Arrow)">❯</button>

      <div class="lightbox-viewport" id="lb-viewport">
        <div class="lightbox-canvas" id="lb-canvas">
          <img id="lb-image" src="" alt="Trade Screenshot" draggable="false">
        </div>
      </div>

      <div class="lightbox-footer" id="lb-footer">
        <!-- Trade summary tags -->
      </div>
    `;

    document.body.appendChild(overlay);
    attachEvents();
  }

  function attachEvents() {
    const overlay = document.getElementById("lightbox-overlay");
    const viewport = document.getElementById("lb-viewport");
    const img = document.getElementById("lb-image");

    document.getElementById("lb-close").addEventListener("click", close);
    document.getElementById("lb-prev").addEventListener("click", prev);
    document.getElementById("lb-next").addEventListener("click", next);

    document.getElementById("lb-zoom-in").addEventListener("click", () => zoom(0.25));
    document.getElementById("lb-zoom-out").addEventListener("click", () => zoom(-0.25));
    document.getElementById("lb-fit").addEventListener("click", fitToScreen);
    document.getElementById("lb-orig").addEventListener("click", originalSize);
    document.getElementById("lb-fullscreen").addEventListener("click", toggleFullscreen);

    // Mouse wheel zoom
    viewport.addEventListener("wheel", (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.2 : -0.2;
      zoom(delta);
    }, { passive: false });

    // Drag to pan
    viewport.addEventListener("mousedown", (e) => {
      if (e.target.tagName.toLowerCase() === "button") return;
      isDragging = true;
      dragStartX = e.clientX - panX;
      dragStartY = e.clientY - panY;
      viewport.style.cursor = "grabbing";
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      panX = e.clientX - dragStartX;
      panY = e.clientY - dragStartY;
      updateTransform();
    });

    window.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        if (viewport) viewport.style.cursor = zoomLevel > 1 ? "grab" : "default";
      }
    });

    // Keyboard navigation
    window.addEventListener("keydown", (e) => {
      const overlay = document.getElementById("lightbox-overlay");
      if (!overlay || !overlay.classList.contains("active")) return;

      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "+" || e.key === "=") zoom(0.25);
      else if (e.key === "-" || e.key === "_") zoom(-0.25);
      else if (e.key === "0") fitToScreen();
      else if (e.key === "1") originalSize();
      else if (e.key.toLowerCase() === "f") toggleFullscreen();
    });

    img.onload = () => {
      naturalWidth = img.naturalWidth;
      naturalHeight = img.naturalHeight;
      fitToScreen();
    };
  }

  function open(items, index = 0) {
    if (!items || items.length === 0) return;
    init();

    images = items;
    currentIndex = Math.max(0, Math.min(index, items.length - 1));

    const overlay = document.getElementById("lightbox-overlay");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";

    loadImage(currentIndex);
  }

  function close() {
    const overlay = document.getElementById("lightbox-overlay");
    if (overlay) overlay.classList.remove("active");
    document.body.style.overflow = "";

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  function loadImage(idx) {
    const item = images[idx];
    if (!item) return;

    const img = document.getElementById("lb-image");
    const counter = document.getElementById("lb-counter");
    const meta = document.getElementById("lb-meta");
    const footer = document.getElementById("lb-footer");

    // Reset pan
    panX = 0;
    panY = 0;
    zoomLevel = 1.0;
    updateTransform();

    // Source URL
    img.src = `/api/screenshots/file/${item.filename}`;

    // Counter
    if (counter) counter.textContent = `${idx + 1} / ${images.length}`;

    // Meta details
    if (meta) {
      const category = item.category || "Screenshot";
      const pair = item.pair || "XAUUSD";
      const direction = item.direction || "";
      const result = item.result ? `• ${item.result}` : "";
      const r = item.r_multiple !== null && item.r_multiple !== undefined ? `(${item.r_multiple > 0 ? '+' : ''}${item.r_multiple}R)` : "";
      meta.textContent = `${pair} ${direction} ${result} ${r} — [${category}]`;
    }

    // Footer info
    if (footer) {
      const resultClass = item.result === "Win" ? "text-win" : item.result === "Loss" ? "text-loss" : "text-be";
      const reviewBadge = item.is_reviewed 
        ? `<span class="lb-tag" style="background:rgba(16,185,129,0.2); color:#34d399; border:1px solid rgba(16,185,129,0.3);">Reviewed ✅</span>`
        : `<span class="lb-tag" style="background:rgba(239,68,68,0.15); color:#fca5a5; border:1px solid rgba(239,68,68,0.3);">Unreviewed</span>`;

      footer.innerHTML = `
        <div class="lb-footer-content">
          <div class="lb-footer-left">
            <span class="lb-tag lb-category-tag">${item.category || "General"}</span>
            ${item.trade_date ? `<span class="lb-tag">${item.trade_date}</span>` : ""}
            ${item.session ? `<span class="lb-tag">${item.session} Session</span>` : ""}
            ${item.setup ? `<span class="lb-tag" style="color:var(--color-gold);">${item.setup}</span>` : ""}
            ${item.result ? `<span class="lb-tag ${resultClass}" style="font-weight:700;">${item.result}</span>` : ""}
            ${reviewBadge}
          </div>
          <div class="lb-footer-right">
            ${item.mistake ? `<span class="lb-note text-loss">Mistake: ${item.mistake}</span>` : ""}
            ${item.lesson ? `<span class="lb-note text-muted">Lesson: ${item.lesson}</span>` : ""}
          </div>
        </div>
      `;
    }

    // Nav visibility
    const prevBtn = document.getElementById("lb-prev");
    const nextBtn = document.getElementById("lb-next");
    if (prevBtn) prevBtn.style.display = images.length > 1 ? "flex" : "none";
    if (nextBtn) nextBtn.style.display = images.length > 1 ? "flex" : "none";
  }

  function prev() {
    if (images.length <= 1) return;
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    loadImage(currentIndex);
  }

  function next() {
    if (images.length <= 1) return;
    currentIndex = (currentIndex + 1) % images.length;
    loadImage(currentIndex);
  }

  function zoom(delta) {
    zoomLevel = Math.max(0.2, Math.min(zoomLevel + delta, 5.0));
    updateTransform();
  }

  function fitToScreen() {
    zoomLevel = 1.0;
    panX = 0;
    panY = 0;
    updateTransform();
  }

  function originalSize() {
    const viewport = document.getElementById("lb-viewport");
    if (!viewport || !naturalWidth) {
      zoomLevel = 1.0;
    } else {
      // 1:1 pixel rendering
      const viewW = viewport.clientWidth;
      zoomLevel = naturalWidth / (viewW * 0.9);
    }
    panX = 0;
    panY = 0;
    updateTransform();
  }

  function updateTransform() {
    const canvas = document.getElementById("lb-canvas");
    const viewport = document.getElementById("lb-viewport");
    if (!canvas) return;

    canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
    if (viewport) {
      viewport.style.cursor = zoomLevel > 1.0 ? (isDragging ? "grabbing" : "grab") : "default";
    }
  }

  function toggleFullscreen() {
    const overlay = document.getElementById("lightbox-overlay");
    if (!overlay) return;

    if (!document.fullscreenElement) {
      overlay.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  return {
    open,
    close,
    prev,
    next
  };
})();
