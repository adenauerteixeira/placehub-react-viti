import { randomUUID } from "node:crypto";
import type { SignedInSession } from "./clients.js";

// Todo dado criado por estes testes usa o prefixo "QA Vitest" — mesmo padrão
// de marcação já usado pelos dados de QA manual do projeto (ver
// "Notas técnicas" em CONTINUITY.md), pra entrar na limpeza periódica via
// `... where name ilike '%qa%'`. Não há função de exclusão para
// sales/reservations/commissions (só SELECT via RLS, escrita é só pelas
// funções SQL), então os testes não tentam limpar esses registros — fica
// acumulando de propósito, é o comportamento aceito pelo usuário.
export const QA_MARK = "QA Vitest";

export async function createPublishedAnnouncement(
  admin: SignedInSession,
  opts: { price?: number } = {},
): Promise<string> {
  const suffix = randomUUID().slice(0, 8);
  const price = opts.price ?? 500000;

  const { data: announcement, error: insertError } = await admin.client
    .from("announcements")
    .insert({
      tenant_id: admin.tenantId,
      title: `${QA_MARK} Anúncio ${suffix}`,
      slug: `qa-vitest-anuncio-${suffix}`,
      property_type: "house",
      transaction_type: "sale",
      status: "draft",
      price,
      description: "Anúncio criado automaticamente pelos testes de integração Vitest.",
      city: "São Paulo",
      state: "SP",
    })
    .select("id")
    .single();
  if (insertError || !announcement) {
    throw new Error(`Falha ao criar anúncio de teste: ${insertError?.message}`);
  }

  const { error: imageError } = await admin.client.from("announcement_images").insert({
    tenant_id: admin.tenantId,
    announcement_id: announcement.id,
    path: `${admin.tenantId}/qa-vitest-${suffix}.jpg`,
    is_cover: true,
  });
  if (imageError) {
    throw new Error(`Falha ao criar foto de capa do anúncio de teste: ${imageError.message}`);
  }

  const { error: publishError } = await admin.client
    .from("announcements")
    .update({ status: "published" })
    .eq("id", announcement.id);
  if (publishError) {
    throw new Error(`Falha ao publicar anúncio de teste: ${publishError.message}`);
  }

  return announcement.id as string;
}

export interface AcceptedProposalFixture {
  leadId: string;
  negotiationId: string;
  proposalId: string;
}

export async function createAcceptedProposal(
  admin: SignedInSession,
  opts: { announcementId: string; brokerId?: string | null; amount: number },
): Promise<AcceptedProposalFixture> {
  const suffix = randomUUID().slice(0, 8);

  const { data: lead, error: leadError } = await admin.client
    .from("leads")
    .insert({
      tenant_id: admin.tenantId,
      announcement_id: opts.announcementId,
      broker_id: opts.brokerId ?? null,
      name: `${QA_MARK} Cliente ${suffix}`,
      source: "manual",
    })
    .select("id")
    .single();
  if (leadError || !lead) {
    throw new Error(`Falha ao criar lead de teste: ${leadError?.message}`);
  }

  const { data: negotiation, error: negotiationError } = await admin.client
    .from("negotiations")
    .insert({
      tenant_id: admin.tenantId,
      lead_id: lead.id,
      announcement_id: opts.announcementId,
      broker_id: opts.brokerId ?? null,
    })
    .select("id")
    .single();
  if (negotiationError || !negotiation) {
    throw new Error(`Falha ao criar negociação de teste: ${negotiationError?.message}`);
  }

  const { data: proposal, error: proposalError } = await admin.client
    .from("proposals")
    .insert({
      tenant_id: admin.tenantId,
      negotiation_id: negotiation.id,
      amount: opts.amount,
      status: "accepted",
    })
    .select("id")
    .single();
  if (proposalError || !proposal) {
    throw new Error(`Falha ao criar proposta de teste: ${proposalError?.message}`);
  }

  return { leadId: lead.id as string, negotiationId: negotiation.id as string, proposalId: proposal.id as string };
}
