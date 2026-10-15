/**
 * app.js
 * Core application state, UI logic, modals, and navigation.
 */

const app = {
  state: {
    currentPage: "dashboard",
    settings: null,
    setups: [],
    mistakes: [],
    dashboardKPI: null,
  },


  async init() {
    if (typeof auth !== "undefined") auth.showLoading();
    // 1. Fetch initial data (Settings, Tags, KPI)
    try {
      const [settingsData, setups, mistakes, dashboardKPI] = await Promise.all([
        api.getSettings(),
        api.getSetupTags(),
        api.getMistakeTags(),
        api.getDashboardKPI(),
      ]);
      this.state.settings = settingsData;
      this.state.setups = setups;
      this.state.mistakes = mistakes;
      this.state.dashboardKPI = dashboardKPI;
      
      this.updateTopbarBalance();
      this.updateSidebarKPI();
    } catch (err) {
      console.error("Initialization failed:", err);
      if (err.status === 401) return;
    }

    // 2. Setup Navigation & mobile menu
    this.setupNavigation();
    this.setupMobileMenu();

    // 3. Load initial page
    this.navigateTo(this.state.currentPage);
    document.getElementById("startup-screen").hidden = true;
    document.getElementById("auth-screen").hidden = true;
    document.getElementById("application-shell").hidden = false;
  },

  setupMobileMenu() {
    const hamburger = document.getElementById("hamburger-btn");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    const closeBtn = document.getElementById("sidebar-close-btn");

    const openSidebar = () => {
      sidebar.classList.add("open");
      overlay.classList.add("active");
      document.body.style.overflow = "hidden";
    };

    const closeSidebar = () => {
      sidebar.classList.remove("open");
      overlay.classList.remove("active");
      document.body.style.overflow = "";
    };

    if (hamburger) hamburger.addEventListener("click", openSidebar);
    if (closeBtn) closeBtn.addEventListener("click", closeSidebar);
    if (overlay) overlay.addEventListener("click", closeSidebar);

    // Store closeSidebar for use in navigation
    this._closeSidebar = closeSidebar;
  },

  setupNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(item => {
      item.addEventListener("click", (e) => {
        // Close mobile sidebar when navigating
        if (this._closeSidebar) this._closeSidebar();
        // Only prevent default and navigate if it's not a modal trigger like Add Trade
        if (!item.hasAttribute("onclick")) {
          e.preventDefault();
          const page = item.getAttribute("data-page");
          if (page) this.navigateTo(page);
        }
      });
    });
  },

  navigateTo(pageId) {
    this.state.currentPage = pageId;
    
    // Update active class in sidebar
    document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
    const activeNav = document.querySelector(`.nav-item[data-page="${pageId}"]`);
    if (activeNav) activeNav.classList.add("active");

    // Update title
    const titleEl = document.getElementById("page-title");
    if (titleEl) {
      titleEl.textContent = activeNav ? activeNav.textContent.trim() : "Dashboard";
    }

    // Load page content
    const contentBody = document.getElementById("content-body");
    contentBody.innerHTML = ""; // clear current

    switch (pageId) {
      case "dashboard":
        if (typeof dashboard !== "undefined") {
          dashboard.render(contentBody);
        } else {
          contentBody.innerHTML = `<div class="empty-state">Loading Dashboard...</div>`;
        }
        break;
      case "journal":
        if (typeof journal !== "undefined") {
          journal.render(contentBody);
        } else {
          contentBody.innerHTML = `<div class="empty-state">Loading Journal...</div>`;
        }
        break;
      case "missed":
        if (typeof missedTrades !== "undefined") {
          missedTrades.render(contentBody);
        } else {
          contentBody.innerHTML = `<div class="empty-state">Loading Missed Trades...</div>`;
        }
        break;
      case "levels":
        if (typeof levelTests !== "undefined") {
          levelTests.render(contentBody);
        } else {
          contentBody.innerHTML = `<div class="empty-state">Loading Level Tests...</div>`;
        }
        break;
      case "performance":
        if (typeof performance !== "undefined") {
          performance.render(contentBody);
        } else {
          contentBody.innerHTML = `<div class="empty-state">Loading Performance…</div>`;
        }
        break;
      case "analytics":
        if (typeof analytics !== "undefined") {
          analytics.render(contentBody);
        } else {
          contentBody.innerHTML = `<div class="empty-state">Loading Analytics…</div>`;
        }
        break;
      case "gallery":
        if (typeof gallery !== "undefined") {
          gallery.render(contentBody);
        } else {
          contentBody.innerHTML = `<div class="empty-state">Loading Trade Gallery…</div>`;
        }
        break;
      case "setup-analysis":
        if (typeof setupAnalysis !== "undefined") {
          setupAnalysis.render(contentBody);
        } else {
          contentBody.innerHTML = `<div class="empty-state">Loading Setup Analysis…</div>`;
        }
        break;
      case "settings":
        if (typeof settings !== "undefined") {
          settings.render(contentBody);
        } else {
          contentBody.innerHTML = `<div class="empty-state">Loading Settings…</div>`;
        }
        break;
      default:
        contentBody.innerHTML = `<div class="empty-state">Page not found</div>`;
    }
  },


  // ── Modals ──
  openAddTradeModal() {
    const overlay = document.getElementById("trade-modal-overlay");
    const title = document.getElementById("trade-modal-title");
    title.textContent = "Add Trade";
    if (typeof formManager !== "undefined") {
      formManager.renderForm();
    }
    overlay.classList.add("active");
  },

  openEditTradeModal(tradeData) {
    const overlay = document.getElementById("trade-modal-overlay");
    const title = document.getElementById("trade-modal-title");
    title.textContent = "Edit Trade";
    if (typeof formManager !== "undefined") {
      formManager.renderForm(tradeData);
    }
    overlay.classList.add("active");
  },

  closeTradeModal() {
    const overlay = document.getElementById("trade-modal-overlay");
    overlay.classList.remove("active");
  },

  openTradeDetails(trade) {
    const overlay = document.getElementById("trade-details-overlay");
    if (typeof journal !== "undefined") {
      journal.renderTradeDetails(trade);
    }
    overlay.classList.add("active");
  },

  closeTradeDetails() {
    const overlay = document.getElementById("trade-details-overlay");
    overlay.classList.remove("active");
  },

  // ── Global UI Updates ──
  async refreshGlobalStats() {
    try {
      this.state.dashboardKPI = await api.getDashboardKPI();
      this.updateTopbarBalance();
      this.updateSidebarKPI();
      if (this.state.currentPage === "dashboard" && typeof dashboard !== "undefined") {
        dashboard.render(document.getElementById("content-body"));
      }
    } catch (e) {
      console.error(e);
    }
  },


  updateTopbarBalance() {
    const balEl = document.getElementById("topbar-balance");
    if (balEl && this.state.dashboardKPI) {
      const bal = this.state.dashboardKPI.current_balance;
      balEl.textContent = `$${bal.toFixed(2)}`;
    }
  },

  updateSidebarKPI() {
    const wrEl = document.getElementById("sidebar-win-rate");
    if (wrEl && this.state.dashboardKPI) {
      wrEl.textContent = `${this.state.dashboardKPI.win_rate}%`;
    }
  },

  // ── Toast Notifications ──
  showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    let icon = "✅";
    if (type === "error") icon = "❌";
    if (type === "info") icon = "ℹ️";

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 200);
    }, 3000);
  },
  
  // ── Balance Modal ──
  async openEditBalanceModal() {
    const overlay = document.getElementById("balance-modal-overlay");
    if (!overlay) return;

    if (!this.state.settings) {
      this.state.settings = await api.getSettings().catch(() => ({ starting_balance: 0 }));
    }
    if (!this.state.dashboardKPI) {
      this.state.dashboardKPI = await api.getDashboardKPI().catch(() => ({ total_pnl: 0, current_balance: 0 }));
    }

    const currentStarting = this.state.settings ? Number(this.state.settings.starting_balance) || 0 : 0;
    const netPnl = this.state.dashboardKPI ? Number(this.state.dashboardKPI.total_pnl) || 0 : 0;

    const input = document.getElementById("input-starting-balance");
    const netPnlEl = document.getElementById("balance-modal-net-pnl");
    const projectedEl = document.getElementById("balance-modal-projected");

    if (input) input.value = currentStarting;
    if (netPnlEl) {
      netPnlEl.textContent = this.formatMoney(netPnl);
      netPnlEl.className = netPnl >= 0 ? "text-win" : "text-loss";
    }
    if (projectedEl) {
      const proj = currentStarting + netPnl;
      projectedEl.textContent = `$${proj.toFixed(2)}`;
    }

    overlay.classList.add("active");
    if (input) {
      setTimeout(() => { input.focus(); input.select(); }, 100);
    }
  },

  closeEditBalanceModal() {
    const overlay = document.getElementById("balance-modal-overlay");
    if (overlay) overlay.classList.remove("active");
  },

  onStartingBalanceInput(val) {
    const num = parseFloat(val) || 0;
    const netPnl = this.state.dashboardKPI ? Number(this.state.dashboardKPI.total_pnl) || 0 : 0;
    const projectedEl = document.getElementById("balance-modal-projected");
    if (projectedEl) {
      const proj = num + netPnl;
      projectedEl.textContent = `$${proj.toFixed(2)}`;
    }
  },

  async saveAccountBalance() {
    const input = document.getElementById("input-starting-balance");
    const btn = document.getElementById("btn-save-balance");
    if (!input) return;

    const val = parseFloat(input.value);
    if (isNaN(val) || val < 0) {
      this.showToast("Please enter a valid starting balance (0 or higher)", "error");
      return;
    }

    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Updating...";
      }

      const updated = await api.updateSettings({ starting_balance: val });
      this.state.settings = updated;
      await this.refreshGlobalStats();

      // If user is currently on settings page, refresh it too
      if (this.state.currentPage === "settings" && typeof settings !== "undefined") {
        settings.render(document.getElementById("content-body"));
      }

      this.closeEditBalanceModal();
      this.showToast(`Account balance updated! Starting: $${val.toFixed(2)} | Current: $${this.state.dashboardKPI.current_balance.toFixed(2)}`, "success");
    } catch (err) {
      console.error(err);
      this.showToast(err.message || "Failed to update balance", "error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Update Balance";
      }
    }
  },

  // ── Formatting Helpers ──
  formatMoney(amount) {
    const prefix = amount > 0 ? "+" : amount < 0 ? "-" : "";
    return `${prefix}$${Math.abs(amount).toFixed(2)}`;
  },
  
  formatR(rValue) {
    const prefix = rValue > 0 ? "+" : "";
    return `${prefix}${rValue.toFixed(2)}R`;
  }
};
