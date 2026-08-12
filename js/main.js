import { bootstrapLoginPage } from "./auth.js";
import { bootstrapJudgePage } from "./judge.js";
import { bootstrapAdminPage } from "./admin.js";

document.addEventListener("DOMContentLoaded", async () => {
  const page = document.body.dataset.page;

  if (page === "login") {
    await bootstrapLoginPage();
  } else if (page === "judge") {
    await bootstrapJudgePage();
  } else if (page === "admin") {
    await bootstrapAdminPage();
  }
});
