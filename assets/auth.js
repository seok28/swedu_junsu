(() => {
  const app = window.SeokApp;

  function initAuth() {
    const loginForm = document.querySelector("#loginForm");
    const passwordInput = document.querySelector("#passwordInput");
    const loginError = document.querySelector("#loginError");

    function getAuthUntil() {
      return Number(localStorage.getItem(app.authStorageKey) || 0);
    }

    function unlockPage() {
      const expiresAt = Date.now() + app.authMinutes * 60 * 1000;
      localStorage.setItem(app.authStorageKey, String(expiresAt));
      document.body.classList.remove("is-locked");
      app.showView("home");
    }

    function lockPage() {
      localStorage.removeItem(app.authStorageKey);
      document.body.classList.add("is-locked");
      passwordInput.value = "";
      loginError.textContent = "";
      setTimeout(() => passwordInput.focus(), 0);
    }

    app.lockPage = lockPage;

    if (getAuthUntil() > Date.now()) {
      document.body.classList.remove("is-locked");
      app.showView("home");
    } else {
      lockPage();
    }

    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (passwordInput.value === app.accessPassword) {
        unlockPage();
        return;
      }
      loginError.textContent = "비밀번호가 맞지 않습니다.";
      passwordInput.select();
    });
  }

  app.initAuth = initAuth;
})();
