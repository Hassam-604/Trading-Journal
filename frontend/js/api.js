/**
 * api.js
 * Handles all REST API communication with the FastAPI backend.
 */

const API_BASE = "/api";

const api = {
  async request(endpoint, options = {}) {
    try {
      const url = `${API_BASE}${endpoint}`;
      const res = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!res.ok) {
        if (typeof auth !== "undefined") auth.handleUnauthorized(res);
        const errData = await res.json().catch(() => ({}));
        const error = new Error(errData.detail || `API Error: ${res.status} ${res.statusText}`);
        error.status = res.status;
        throw error;
      }

      // If response is empty or 204
      if (res.status === 204) return null;
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await res.json();
      }
      return await res.text();
    } catch (err) {
      console.error("API Request Failed:", err);
      if (err.status !== 401) app.showToast(err.message, "error");
      throw err;
    }
  },

  // ── Health ──
  async getHealth() {
    return this.request("/health");
  },

  // ── Dashboard / Analytics ──
  async getDashboardKPI() {
    return this.request("/analytics/dashboard");
  },
  async getEquityCurve() {
    return this.request("/analytics/equity-curve");
  },
  async getMonthlyPnl() {
    return this.request("/analytics/monthly-pnl");
  },
  async getSessionPerformance() {
    return this.request("/analytics/sessions");
  },
  async getSetupPerformance() {
    return this.request("/analytics/setups");
  },
  async getDirectionPerformance() {
    return this.request("/analytics/directions");
  },
  async getMistakeReport() {
    return this.request("/analytics/mistakes");
  },
  async getLevelValidity() {
    return this.request("/analytics/level-validity");
  },
  async getYearlyPerformance() {
    return this.request("/analytics/performance");
  },
  async getCalendar(year, month) {
    return this.request(`/analytics/calendar?year=${year}&month=${month}`);
  },
  async getAdvancedAnalytics(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        query.append(key, value);
      }
    });
    return this.request(`/analytics/advanced?${query.toString()}`);
  },

  // ── Settings & Tags ──
  async getSettings() {
    return this.request("/settings/");
  },
  async updateSettings(data) {
    return this.request("/settings/", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async changePassword(data) {
    return this.request("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async restoreJSON(file) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/export/restore/json`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      if (typeof auth !== "undefined") auth.handleUnauthorized(res);
      const error = new Error(await res.text());
      error.status = res.status;
      throw error;
    }
    return res.json();
  },
  async getSetupTags() {
    return this.request("/settings/setups");
  },
  async createSetupTag(data) {
    return this.request("/settings/setups", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async deleteSetupTag(id) {
    return this.request(`/settings/setups/${id}`, {
      method: "DELETE",
    });
  },
  async getMistakeTags() {
    return this.request("/settings/mistakes");
  },
  async createMistakeTag(data) {
    return this.request("/settings/mistakes", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async deleteMistakeTag(id) {
    return this.request(`/settings/mistakes/${id}`, {
      method: "DELETE",
    });
  },

  // ── Trades ──
  async getTrades(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        query.append(key, value);
      }
    });
    return this.request(`/trades/?${query.toString()}`);
  },
  async getTradeCount(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        query.append(key, value);
      }
    });
    return this.request(`/trades/count?${query.toString()}`);
  },
  async getTrade(id) {
    return this.request(`/trades/${id}`);
  },
  async createTrade(data) {
    return this.request("/trades/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async updateTrade(id, data) {
    return this.request(`/trades/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async deleteTrade(id) {
    return this.request(`/trades/${id}`, {
      method: "DELETE",
    });
  },

  // ── Planned / Missed Trades ──
  async getPlannedTrades(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        query.append(key, value);
      }
    });
    return this.request(`/planned/?${query.toString()}`);
  },
  async getPlannedTradeCount(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        query.append(key, value);
      }
    });
    return this.request(`/planned/count?${query.toString()}`);
  },
  async getPlannedTrade(id) {
    return this.request(`/planned/${id}`);
  },
  async createPlannedTrade(data) {
    return this.request("/planned/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async updatePlannedTrade(id, data) {
    return this.request(`/planned/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async deletePlannedTrade(id) {
    return this.request(`/planned/${id}`, {
      method: "DELETE",
    });
  },

  // ── Level Tests ──
  async getLevelTests(skip = 0, limit = 100) {
    return this.request(`/level-tests/?skip=${skip}&limit=${limit}`);
  },
  async getLevelTestsForPlanned(plannedTradeId) {
    return this.request(`/level-tests/planned/${plannedTradeId}`);
  },
  async getLevelTest(id) {
    return this.request(`/level-tests/${id}`);
  },
  async createLevelTest(data) {
    return this.request("/level-tests/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async updateLevelTest(id, data) {
    return this.request(`/level-tests/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async deleteLevelTest(id) {
    return this.request(`/level-tests/${id}`, {
      method: "DELETE",
    });
  },



  // ── Screenshots & Gallery ──
  async uploadScreenshot(formData) {
    try {
      const res = await fetch(`${API_BASE}/screenshots/upload`, {
        method: "POST",
        body: formData, // Do not set Content-Type, browser sets it with boundary for FormData
      });
      if (!res.ok) {
        if (typeof auth !== "undefined") auth.handleUnauthorized(res);
        const errData = await res.json().catch(() => ({}));
        const error = new Error(errData.detail || "Upload failed");
        error.status = res.status;
        throw error;
      }
      return await res.json();
    } catch (err) {
      console.error("Upload Failed:", err);
      if (err.status !== 401) app.showToast(err.message, "error");
      throw err;
    }
  },
  async deleteScreenshot(id) {
    return this.request(`/screenshots/${id}`, {
      method: "DELETE",
    });
  },
  async getGallery(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "" && value !== "all") {
        query.append(key, value);
      }
    });
    return this.request(`/screenshots/gallery?${query.toString()}`);
  },
  async getSetupAnalysis(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        query.append(key, value);
      }
    });
    return this.request(`/analytics/setup-analysis?${query.toString()}`);
  },
  async toggleTradeReview(tradeId, isReviewed = null) {
    const query = isReviewed !== null ? `?is_reviewed=${isReviewed}` : "";
    return this.request(`/trades/${tradeId}/review${query}`, {
      method: "POST",
    });
  },
  async getReviewQueue(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        query.append(key, value);
      }
    });
    return this.request(`/trades/review-queue?${query.toString()}`);
  }
};
