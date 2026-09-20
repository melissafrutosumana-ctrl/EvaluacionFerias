import { initIcons } from "./icons.js?v=1";
import { bootstrapLoginPage } from "./auth.js?v=3.32";
import { bootstrapJudgePage } from "./judge.js?v=3.32";
import { bootstrapAdminPage } from "./admin.js?v=3.33";

async function bootstrapApp() {
  initIcons();
  const page = document.body.dataset.page;

  if (page === "login") {
    await bootstrapLoginPage();
  } else if (page === "judge") {
    await bootstrapJudgePage();
  } else if (page === "admin") {
    await bootstrapAdminPage();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapApp, { once: true });
} else {
  void bootstrapApp();
}
