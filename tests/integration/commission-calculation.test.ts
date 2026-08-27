import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { signInBroker, signInTenantAdmin, type SignedInSession } from "./setup/clients.js";
import { createAcceptedProposal, createPublishedAnnouncement } from "./setup/fixtures.js";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// Cobre a regra crítica "cálculo de comissão", implementada dentro de
// create_sale_from_proposal (Fase 4): corte do corretor = min(broker.
// commission_percentage, percentual total da venda), pro-rateado nas
// parcelas de entrada com a última parcela absorvendo o resto do
// arredondamento. Usa o corretor real de QA (login fornecido pelo usuário)
// pra ler o commission_percentage configurado — os percentuais totais dos
// cenários (50% e 0,01%) são escolhidos bem longe do valor real do corretor
// pra garantir os dois ramos do min() (não-clampado e clampado) sem
// depender de saber esse valor de antemão.
describe("cálculo de comissão", () => {
  let admin: SignedInSession;
  let brokerId: string;
  let brokerPercentage: number;

  beforeAll(async () => {
    admin = await signInTenantAdmin();
    const broker = await signInBroker();
    if (!broker.brokerId) {
      throw new Error("O login de corretor de teste não está vinculado a um registro em brokers.");
    }
    brokerId = broker.brokerId;
    await broker.client.auth.signOut();

    const { data, error } = await admin.client
      .from("brokers")
      .select("commission_percentage")
      .eq("id", brokerId)
      .single();
    if (error || !data) {
      throw new Error(`Falha ao ler commission_percentage do corretor de teste: ${error?.message}`);
    }
    brokerPercentage = Number(data.commission_percentage);
    expect(brokerPercentage).toBeGreaterThan(0);
    expect(brokerPercentage).toBeLessThan(50);
  });

  afterAll(async () => {
    await admin.client.auth.signOut();
  });

  async function createSaleWithCommission(opts: {
    amount: number;
    commissionPercentage: number;
    brokerId?: string | null;
    downPaymentAmount?: number;
    entryInstallments?: { number: number; amount: number; due_date: string }[];
  }) {
    const announcementId = await createPublishedAnnouncement(admin, { price: opts.amount });
    const { proposalId } = await createAcceptedProposal(admin, {
      announcementId,
      amount: opts.amount,
      brokerId: opts.brokerId,
    });
    const { data: sale, error } = await admin.client.rpc("create_sale_from_proposal", {
      p_proposal_id: proposalId,
      p_down_payment_amount: opts.downPaymentAmount ?? 0,
      p_entry_installments: opts.entryInstallments ?? [],
      p_payment_assets: [],
      p_commission_percentage: opts.commissionPercentage,
    });
    if (error || !sale) {
      throw new Error(`Falha ao criar venda de teste: ${error?.message}`);
    }
    const { data: commission, error: commissionError } = await admin.client
      .from("commissions")
      .select("*")
      .eq("sale_id", sale.id)
      .single();
    if (commissionError || !commission) {
      throw new Error(`Falha ao ler comissão da venda de teste: ${commissionError?.message}`);
    }
    return { sale, commission };
  }

  it("corte do corretor não é clampado quando o percentual total da venda é bem maior", async () => {
    const totalPct = 50;
    const amount = 1000000;
    const { commission } = await createSaleWithCommission({
      amount,
      commissionPercentage: totalPct,
      brokerId,
    });

    expect(commission.broker_percentage).toBeCloseTo(brokerPercentage, 4);
    expect(commission.agency_percentage).toBeCloseTo(totalPct - brokerPercentage, 4);
    expect(commission.gross_amount).toBeCloseTo(round2((amount * totalPct) / 100), 2);
    expect(commission.broker_amount).toBeCloseTo(round2((amount * brokerPercentage) / 100), 2);
    expect(commission.agency_amount).toBeCloseTo(
      round2(commission.gross_amount - commission.broker_amount),
      2,
    );
  });

  it("corte do corretor é clampado ao percentual total quando o dele é maior", async () => {
    const totalPct = 0.01;
    const amount = 1000000;
    const { commission } = await createSaleWithCommission({
      amount,
      commissionPercentage: totalPct,
      brokerId,
    });

    expect(commission.broker_percentage).toBeCloseTo(totalPct, 4);
    expect(commission.agency_percentage).toBeCloseTo(0, 4);
    expect(commission.broker_amount).toBeCloseTo(commission.gross_amount, 2);
    expect(commission.agency_amount).toBeCloseTo(0, 2);
  });

  it("sem corretor vinculado, toda a comissão fica com a imobiliária", async () => {
    const { commission } = await createSaleWithCommission({
      amount: 800000,
      commissionPercentage: 6,
      brokerId: null,
    });

    expect(commission.broker_id).toBeNull();
    expect(commission.broker_amount).toBeCloseTo(0, 2);
    expect(commission.agency_amount).toBeCloseTo(commission.gross_amount, 2);
  });

  it("distribui a comissão nas parcelas de entrada e a última parcela absorve o arredondamento", async () => {
    const amount = 777777;
    const totalPct = 7;
    const downPaymentAmount = 90000;
    const entryInstallments = [
      { number: 1, amount: 30001, due_date: "2027-01-10" },
      { number: 2, amount: 29999, due_date: "2027-02-10" },
      { number: 3, amount: 30000, due_date: "2027-03-10" },
    ];

    const { commission } = await createSaleWithCommission({
      amount,
      commissionPercentage: totalPct,
      brokerId,
      downPaymentAmount,
      entryInstallments,
    });

    const { data: installments, error } = await admin.client
      .from("commission_installments")
      .select("gross_amount, broker_amount, agency_amount")
      .eq("commission_id", commission.id)
      .order("number");
    if (error || !installments) {
      throw new Error(`Falha ao ler parcelas de comissão: ${error?.message}`);
    }

    expect(installments).toHaveLength(3);

    const sum = (key: "gross_amount" | "broker_amount" | "agency_amount") =>
      round2(
        installments.reduce(
          (acc: number, row: Record<string, unknown>) => acc + Number(row[key]),
          0,
        ),
      );

    expect(sum("gross_amount")).toBeCloseTo(commission.gross_amount, 2);
    expect(sum("broker_amount")).toBeCloseTo(commission.broker_amount, 2);
    expect(sum("agency_amount")).toBeCloseTo(commission.agency_amount, 2);
  });
});
