import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { signInTenantAdmin, type SignedInSession } from "./setup/clients.js";
import { createAcceptedProposal, createPublishedAnnouncement } from "./setup/fixtures.js";

// Cobre a regra crítica "conversão reserva→venda": reserve_announcement e
// create_sale_from_proposal(p_reservation_id) são as únicas portas de
// escrita dessas tabelas (RLS só dá select) — testar via RPC real contra o
// Supabase é a única forma de validar essa regra de verdade.
describe("conversão reserva → venda", () => {
  let admin: SignedInSession;

  beforeAll(async () => {
    admin = await signInTenantAdmin();
  });

  afterAll(async () => {
    await admin.client.auth.signOut();
  });

  it("reservar um anúncio publicado marca o anúncio como reservado", async () => {
    const announcementId = await createPublishedAnnouncement(admin);

    const { data: reservation, error } = await admin.client.rpc("reserve_announcement", {
      p_announcement_id: announcementId,
      p_customer_name: "QA Vitest Cliente Reserva",
      p_customer_phone: "11999999999",
      p_customer_email: "qa-vitest@example.com",
      p_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    expect(error).toBeNull();
    expect(reservation.status).toBe("active");

    const { data: announcement } = await admin.client
      .from("announcements")
      .select("status")
      .eq("id", announcementId)
      .single();
    expect(announcement?.status).toBe("reserved");
  });

  it("não é possível reservar um anúncio que já está reservado", async () => {
    const announcementId = await createPublishedAnnouncement(admin);

    await admin.client.rpc("reserve_announcement", {
      p_announcement_id: announcementId,
      p_customer_name: "QA Vitest Cliente Reserva 1",
      p_customer_phone: "11999999999",
      p_customer_email: "qa-vitest@example.com",
      p_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    const { error } = await admin.client.rpc("reserve_announcement", {
      p_announcement_id: announcementId,
      p_customer_name: "QA Vitest Cliente Reserva 2",
      p_customer_phone: "11999999999",
      p_customer_email: "qa-vitest@example.com",
      p_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/só é possível reservar um anúncio publicado/);
  });

  it("fechar a venda a partir da reserva converte a reserva e marca o anúncio como vendido", async () => {
    const announcementId = await createPublishedAnnouncement(admin, { price: 300000 });

    const { data: reservation } = await admin.client.rpc("reserve_announcement", {
      p_announcement_id: announcementId,
      p_customer_name: "QA Vitest Cliente Conversão",
      p_customer_phone: "11999999999",
      p_customer_email: "qa-vitest@example.com",
      p_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    const { proposalId } = await createAcceptedProposal(admin, {
      announcementId,
      amount: 300000,
    });

    const { data: sale, error: saleError } = await admin.client.rpc("create_sale_from_proposal", {
      p_proposal_id: proposalId,
      p_down_payment_amount: 0,
      p_entry_installments: [],
      p_payment_assets: [],
      p_reservation_id: reservation.id,
    });

    expect(saleError).toBeNull();
    expect(sale).toBeTruthy();

    const { data: reservationAfter } = await admin.client
      .from("reservations")
      .select("status, sale_id, converted_at")
      .eq("id", reservation.id)
      .single();
    expect(reservationAfter?.status).toBe("converted");
    expect(reservationAfter?.sale_id).toBe(sale.id);
    expect(reservationAfter?.converted_at).not.toBeNull();

    const { data: announcementAfter } = await admin.client
      .from("announcements")
      .select("status")
      .eq("id", announcementId)
      .single();
    expect(announcementAfter?.status).toBe("sold");
  });
});
