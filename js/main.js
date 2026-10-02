import { initIcons } from "./icons.js?v=1";
import { bootstrapLoginPage } from "./auth.js?v=3.35";
import { bootstrapJudgePage } from "./judge.js?v=3.37";
import { bootstrapAdminPage } from "./admin.js?v=3.48";
import { bootstrapResultsPdfArchivesPage } from "./results-pdf-archives.js?v=3";

async function bootstrapApp() {
  initIcons();
  const page = document.body.dataset.page;

  if (page === "login") {
    await bootstrapLoginPage();
  } else if (page === "judge") {
    await bootstrapJudgePage();
  } else if (page === "admin") {
    await bootstrapAdminPage();
  } else if (page === "results-pdf-archives") {
    await bootstrapResultsPdfArchivesPage();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapApp, { once: true });
} else {
  void bootstrapApp();
}
