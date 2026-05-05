(() => {
  const appConfig = window.manualAppConfig || {};

  window.SeokApp = {
    accessUserId: appConfig.accessUserId || "sw",
    accessPassword: appConfig.accessPassword || "8206747",
    authStorageKey: "seok-page-auth-until",
    authMinutes: Number(appConfig.authTtlMinutes) || 60,
    lockPage: null,
    manual: null,
    ladder: null,

    escapeHtml(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    },

    showView(view) {
      document.querySelector("#homeView").classList.toggle("is-hidden", view !== "home");
      document.querySelector("#manualPage").classList.toggle("is-hidden", view !== "manual");
      document.querySelector("#ladderPage").classList.toggle("is-hidden", view !== "ladder");
      if (view === "manual") {
        this.manual.render();
        this.manual.loadRemote();
      }
    },

    init() {
      this.manual.init();
      this.ladder.init();
      this.initAuth();

      document.querySelector("#logoutButton").addEventListener("click", this.lockPage);
      document.querySelector("#homeLogoutButton").addEventListener("click", this.lockPage);
      document.querySelector("#manualLogoutButton").addEventListener("click", this.lockPage);
      document.querySelector("#openManualButton").addEventListener("click", () => this.showView("manual"));
      document.querySelector("#openLadderButton").addEventListener("click", () => this.showView("ladder"));
      document.querySelector("#manualHomeButton").addEventListener("click", () => this.showView("home"));
      document.querySelector("#ladderHomeButton").addEventListener("click", () => this.showView("home"));
    },
  };

  document.addEventListener("DOMContentLoaded", () => {
    window.SeokApp.init();
  });
})();
