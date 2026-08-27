import { expect, test, type Page } from "@playwright/test";

// Fluxo principal completo (Fase 6, ROADMAP.md): login → criar lead →
// negociação → proposta → aceitar proposta → fechar venda. Dirigido pela UI
// de verdade (não pelas funções SQL direto, ao contrário dos testes de
// integração Vitest em tests/integration/) — cobre o caminho que um usuário
// real percorre. Marcador "QA Playwright" no nome do lead pra entrar na
// limpeza manual periódica de dados de teste (mesmo padrão do resto do
// projeto — ver CONTINUITY.md "Notas técnicas").

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} — configure .env.test.local before running e2e tests.`);
  }
  return value;
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(requireEnv("TEST_TENANT_ADMIN_EMAIL"));
  await page.getByLabel("Senha", { exact: true }).fill(requireEnv("TEST_TENANT_ADMIN_PASSWORD"));
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/dashboard");
}

test("login → criar lead → negociação → proposta aceita → venda fechada", async ({ page }) => {
  const suffix = Date.now().toString(36);
  const leadName = `QA Playwright Cliente ${suffix}`;

  await login(page);

  // ---- criar lead ----
  await page.goto("/leads");
  await page.getByRole("button", { name: "Novo lead" }).click();
  await page.getByRole("dialog").getByLabel("Nome").fill(leadName);
  await page.getByRole("dialog").getByRole("button", { name: "Criar lead" }).click();
  await expect(page.getByText("Lead criado.")).toBeVisible();
  await expect(page.getByRole("dialog")).toBeHidden();

  // ---- criar negociação a partir do lead ----
  await page.goto("/negotiations");
  await page.getByRole("button", { name: "Nova negociação" }).click();
  // O trigger do Select (shadcn/Radix) não expõe um nome acessível
  // confiável — o primeiro combobox do diálogo é sempre o campo "Lead"
  // (Anúncio/Corretor vêm depois, cada Select também renderiza um
  // <select> nativo oculto logo após o trigger visível, ver
  // CONTINUITY.md "Notas técnicas" sobre esse componente).
  await page.getByRole("dialog").getByRole("combobox").first().click();
  await page.getByRole("option", { name: leadName }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Criar negociação" }).click();
  await expect(page.getByText("Negociação criada.")).toBeVisible();
  await expect(page.getByRole("dialog")).toBeHidden();

  const negotiationRow = page.getByRole("row", { name: leadName });
  await negotiationRow.getByLabel("Ver detalhes").click();
  await page.waitForURL(/\/negotiations\/[0-9a-f-]+$/);

  // ---- criar proposta ----
  await page.getByRole("button", { name: "Nova proposta" }).click();
  await page.getByRole("dialog").getByLabel("Valor").fill("30000000"); // R$ 300.000,00
  await page.getByRole("dialog").getByRole("button", { name: "Criar proposta" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  // ---- aceitar a proposta (editar status) ----
  await page.getByLabel("Editar").click();
  await page.getByRole("dialog").getByRole("combobox").first().click();
  await page.getByRole("option", { name: "Aceita" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  // ---- fechar venda (valores padrão do formulário) ----
  await page.getByRole("button", { name: "Fechar venda" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Fechar venda" })
    .click();
  await expect(page.getByText("Venda registrada.")).toBeVisible();
  await expect(page.getByRole("dialog")).toBeHidden();

  // ---- confirmações ----
  await expect(page.getByRole("button", { name: "Fechar venda" })).toHaveCount(0);
  await expect(page.getByText("Ganha").first()).toBeVisible();
});
