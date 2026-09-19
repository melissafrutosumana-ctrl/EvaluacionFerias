import { bootstrapLoginPage } from "./auth.js?v=3.26";
import { bootstrapJudgePage } from "./judge.js?v=3.26";
import { bootstrapAdminPage } from "./admin.js?v=3.26";

async function bootstrapApp() {
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
