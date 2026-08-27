import { expect, test } from "@playwright/test";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} — configure .env.test.local before running e2e tests.`);
  }
  return value;
}

test.describe("login", () => {
  test("credenciais válidas de tenant_admin redirecionam para o dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(requireEnv("TEST_TENANT_ADMIN_EMAIL"));
    await page.getByLabel("Senha", { exact: true }).fill(requireEnv("TEST_TENANT_ADMIN_PASSWORD"));
    await page.getByRole("button", { name: "Entrar" }).click();

    await page.waitForURL("**/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("credenciais inválidas mostram erro e permanecem na tela de login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(requireEnv("TEST_TENANT_ADMIN_EMAIL"));
    await page.getByLabel("Senha", { exact: true }).fill("senha-errada-de-propósito");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByText("Não foi possível entrar")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
