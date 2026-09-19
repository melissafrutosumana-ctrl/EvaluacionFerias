import { bootstrapLoginPage } from "./auth.js?v=3.21";
import { bootstrapJudgePage } from "./judge.js?v=3.21";
import { bootstrapAdminPage } from "./admin.js?v=3.21";

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
