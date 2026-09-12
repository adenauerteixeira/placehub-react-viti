import { afterAll, describe, it } from 'vitest'
import { signInTenantAdmin, type SignedInSession } from './setup/clients.js'
import { createAcceptedProposal, createPublishedAnnouncement } from './setup/fixtures.js'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitForExpiration(
  admin: SignedInSession,
  reservationId: string,
  announcementId: string,
  proposalId: string,
) {
  const deadline = Date.now() + 90_000
  while (Date.now() < deadline) {
    const [reservationResult, announcementResult, proposalResult] = await Promise.all([
      admin.client.from('reservations').select('status, expired_at').eq('id', reservationId).single(),
      admin.client.from('announcements').select('status').eq('id', announcementId).single(),
      admin.client.from('proposals').select('status').eq('id', proposalId).single(),
    ])
    if (reservationResult.error || announcementResult.error || proposalResult.error) {
      throw new Error(`Falha ao consultar expiração: ${reservationResult.error?.message ?? announcementResult.error?.message ?? proposalResult.error?.message}`)
    }
    if (
      reservationResult.data.status === 'expired'
      && reservationResult.data.expired_at
      && announcementResult.data.status === 'published'
      && proposalResult.data.status === 'expired'
    ) return
    await wait(3_000)
  }
  throw new Error('O job funnel-expirations não expirou a reserva em até 90 segundos.')
}

describe('funnel-expirations (pg_cron)', () => {
  let admin: SignedInSession

  afterAll(async () => {
    await admin?.client.auth.signOut()
  })

  it('expires past-due reservations and proposals without client intervention', async () => {
    admin = await signInTenantAdmin()
    const announcementId = await createPublishedAnnouncement(admin)
    const proposalAnnouncementId = await createPublishedAnnouncement(admin)
    const proposal = await createAcceptedProposal(admin, { announcementId: proposalAnnouncementId, amount: 500_000 })
    const { error: proposalError } = await admin.client
      .from('proposals')
      .update({ status: 'sent', valid_until: new Date(Date.now() - 86_400_000).toISOString().slice(0, 10) })
      .eq('id', proposal.proposalId)
    if (proposalError) throw new Error(`Falha ao criar proposta vencida: ${proposalError.message}`)
    const { data: reservation, error } = await admin.client.rpc('reserve_announcement', {
      p_announcement_id: announcementId,
      p_customer_name: 'QA Vitest Expiração Automática',
      p_customer_phone: '11999999999',
      p_customer_email: null,
      p_expires_at: new Date(Date.now() - 60_000).toISOString(),
      p_lead_id: null,
      p_broker_id: null,
      p_notes: 'Reserva criada vencida para validar o pg_cron.',
    })
    if (error || !reservation) throw new Error(`Falha ao criar reserva vencida: ${error?.message}`)

    await waitForExpiration(admin, reservation.id, announcementId, proposal.proposalId)
  }, 100_000)
})
