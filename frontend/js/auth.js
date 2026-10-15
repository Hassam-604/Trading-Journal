/**
 * auth.js
 * First-run password setup and single-user session UI.
 */

const auth = {
  expiredNoticeShown: false,

  async start() {
    this.showLoading();
    this.bindLogout();
    await this.checkSession();
  },

  async checkSession() {
    const retryButton = document.getElementById("startup-retry");
    try {
      const response = await fetch("/api/auth/status", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`The server returned ${response.status}.`);
      }
      const status = await response.json();
      if (status.setup_required) {
        this.showPasswordSetup();
      } else if (status.authenticated) {
        await app.init();
      } else {
        this.showLogin();
      }
    } catch (error) {
      console.error("Authentication check failed:", error);
      const title = document.getElementById("startup-title");
      const message = document.getElementById("startup-message");
      if (title) title.textContent = "Journal unavailable";
      if (message) message.textContent = "Could not connect to the local journal. Check that the app is running, then try again.";
      const spinner = document.querySelector(".startup-screen .auth-spinner");
      if (spinner) spinner.hidden = true;
      if (retryButton) {
        retryButton.classList.remove("hidden");
        retryButton.onclick = () => this.checkSession();
      }
    }
  },

  showLoading() {
    document.getElementById("application-shell").hidden = true;
    document.getElementById("auth-screen").hidden = true;
    document.getElementById("startup-screen").hidden = false;
    const title = document.getElementById("startup-title");
    const message = document.getElementById("startup-message");
    const spinner = document.querySelector(".startup-screen .auth-spinner");
    const retryButton = document.getElementById("startup-retry");
    if (title) title.textContent = "Preparing your journal";
    if (message) message.textContent = "Connecting securely to your local journal…";
    if (spinner) spinner.hidden = false;
    if (retryButton) retryButton.classList.add("hidden");
  },

  showPasswordSetup() {
    this.showAuthForm("setup");
  },

  showLogin() {
    this.showAuthForm("login");
  },

  showAuthForm(mode, message = "") {
    const screen = document.getElementById("auth-screen");
    document.getElementById("startup-screen").hidden = true;
    document.getElementById("application-shell").hidden = true;
    screen.hidden = false;

    const isSetup = mode === "setup";
    screen.innerHTML = `
      <div class="auth-card">
        <div class="auth-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 22.5h5.5l3.2-6.3 3.1 3.8 3.2-7.2H26" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M22 9.5h4v4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <p class="auth-eyebrow">TRADING JOURNAL</p>
        <h1>${isSetup ? "Secure your journal" : "Welcome back"}</h1>
        <p class="auth-copy">${isSetup ? "Create a password to protect your local trading data." : "Sign in to continue to your private trading journal."}</p>
        <form id="auth-form" class="auth-form">
          ${isSetup ? `
            <label for="auth-password">Create password</label>
            <input id="auth-password" name="password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required>
            <small>Use at least 12 characters.</small>
            <label for="auth-confirm-password">Confirm password</label>
            <input id="auth-confirm-password" name="confirm_password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required>
          ` : `
            <label for="auth-password">Password</label>
            <input id="auth-password" name="password" type="password" autocomplete="current-password" maxlength="128" required autofocus>
          `}
          <p id="auth-error" class="auth-error" role="alert">${this.escapeHtml(message)}</p>
          <button type="submit" class="btn btn-primary auth-submit">${isSetup ? "Create password" : "Sign in"}</button>
        </form>
        <p class="auth-footnote">Your data stays in your local journal database.</p>
      </div>
    `;

    screen.querySelector("#auth-form").addEventListener("submit", event => {
      event.preventDefault();
      this.submitCredentials(mode);
    });
    screen.querySelector("#auth-password").focus();
    this.expiredNoticeShown = false;
  },

  async submitCredentials(mode) {
    const form = document.getElementById("auth-form");
    const button = form.querySelector(".auth-submit");
    const error = document.getElementById("auth-error");
    const password = form.elements.password.value;
    if (mode === "setup" && password !== form.elements.confirm_password.value) {
      error.textContent = "The passwords do not match.";
      return;
    }

    button.disabled = true;
    button.textContent = mode === "setup" ? "Securing journal…" : "Signing in…";
    error.textContent = "";
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || "Could not sign in.");
      }
      this.expiredNoticeShown = false;
      await app.init();
    } catch (requestError) {
      error.textContent = requestError.message;
      button.disabled = false;
      button.textContent = mode === "setup" ? "Create password" : "Sign in";
    }
  },

  async signOut() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      this.showLogin();
    } catch (error) {
      console.error("Sign out failed:", error);
      app.showToast("Could not sign out. Please try again.", "error");
    }
  },

  bindLogout() {
    const button = document.getElementById("auth-logout");
    if (button) button.addEventListener("click", () => this.signOut());
  },

  handleUnauthorized(response) {
    if (response.status === 401 && !this.expiredNoticeShown) {
      this.expiredNoticeShown = true;
      this.showAuthForm("login", "Your session expired. Sign in again.");
    }
  },

  escapeHtml(value) {
    const element = document.createElement("span");
    element.textContent = value;
    return element.innerHTML;
  },
};
