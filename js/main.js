import { bootstrapLoginPage } from "./auth.js?v=3.22";
import { bootstrapJudgePage } from "./judge.js?v=3.22";
import { bootstrapAdminPage } from "./admin.js?v=3.22";

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
