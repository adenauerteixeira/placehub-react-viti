import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { signInTenantAdmin, type SignedInSession } from "./setup/clients.js";
import { createAcceptedProposal, createPublishedAnnouncement } from "./setup/fixtures.js";

// Cobre a regra crítica "trava de venda concluída". A trava de verdade é o
// trigger guard_sale_financial_lock (bloqueia qualquer UPDATE em coluna
// financeira de uma venda completed) — mas a tabela sales não tem policy de
// UPDATE pra client nenhum (só as funções security definer escrevem nela),
// então o client anônimo nunca alcança esse trigger via UPDATE direto: a
// única porta de mutação pós-venda é cancel_sale, que já tem sua própria
// checagem de status. Testar essa checagem (o que o app de fato usa e pode
// violar por engano, ex.: cancelar duas vezes) é a cobertura possível sem
// a service_role key; o trigger em si é uma segunda barreira redundante
// para quem tentasse burlar por fora do client.
describe("trava de venda concluída (cancel_sale)", () => {
  let admin: SignedInSession;

  beforeAll(async () => {
    admin = await signInTenantAdmin();
  });

  afterAll(async () => {
    await admin.client.auth.signOut();
  });

  async function createCompletedSale(amount: number) {
    const announcementId = await createPublishedAnnouncement(admin, { price: amount });
    const { proposalId } = await createAcceptedProposal(admin, { announcementId, amount });
    const { data: sale, error } = await admin.client.rpc("create_sale_from_proposal", {
      p_proposal_id: proposalId,
      p_down_payment_amount: 0,
      p_entry_installments: [],
      p_payment_assets: [],
    });
    if (error || !sale) {
      throw new Error(`Falha ao criar venda de teste: ${error?.message}`);
    }
    return { sale, announcementId };
  }

  it("uma venda concluída nasce com status completed e pode ser cancelada uma vez", async () => {
    const { sale, announcementId } = await createCompletedSale(400000);
    expect(sale.status).toBe("completed");

    const { data: cancelled, error } = await admin.client.rpc("cancel_sale", {
      p_id: sale.id,
      p_reason: "QA Vitest cancelamento",
    });

    expect(error).toBeNull();
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancelled_at).not.toBeNull();

    const { data: announcementAfter } = await admin.client
      .from("announcements")
      .select("status")
      .eq("id", announcementId)
      .single();
    expect(announcementAfter?.status).toBe("published");
  });

  it("não é possível cancelar uma venda que já foi cancelada", async () => {
    const { sale } = await createCompletedSale(410000);

    const first = await admin.client.rpc("cancel_sale", { p_id: sale.id, p_reason: "QA Vitest" });
    expect(first.error).toBeNull();

    const second = await admin.client.rpc("cancel_sale", { p_id: sale.id, p_reason: "QA Vitest" });
    expect(second.error).not.toBeNull();
    expect(second.error?.message).toMatch(/só é possível cancelar uma venda concluída/);
  });

  it("cancelar a venda cancela a comissão junto", async () => {
    const { sale } = await createCompletedSale(420000);

    await admin.client.rpc("cancel_sale", { p_id: sale.id, p_reason: "QA Vitest" });

    const { data: commission } = await admin.client
      .from("commissions")
      .select("status")
      .eq("sale_id", sale.id)
      .single();
    expect(commission?.status).toBe("cancelled");
  });
});
