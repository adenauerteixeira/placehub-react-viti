import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type ReservationStatus = 'active' | 'expired' | 'cancelled' | 'converted'

export type Reservation = {
  id: string
  tenant_id: string
  announcement_id: string
  lead_id: string | null
  broker_id: string | null
  customer_name: string
  customer_phone: string | null
  customer_email: string | null
  reserved_at: string
  expires_at: string
  status: ReservationStatus
  notes: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  sale_id: string | null
  converted_at: string | null
  created_at: string
}

const RESERVATION_COLUMNS =
  'id, tenant_id, announcement_id, lead_id, broker_id, customer_name, customer_phone, customer_email, reserved_at, expires_at, status, notes, cancelled_at, cancellation_reason, sale_id, converted_at, created_at'

export function useReservations(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['reservations', tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<Reservation[]> => {
      const { data, error } = await supabase
        .from('reservations')
        .select(RESERVATION_COLUMNS)
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
  })
}

export function useActiveReservationForAnnouncement(announcementId: string | null | undefined) {
  return useQuery({
    queryKey: ['active-reservation', announcementId],
    enabled: !!announcementId,
    queryFn: async (): Promise<Reservation | null> => {
      const { data, error } = await supabase
        .from('reservations')
        .select(RESERVATION_COLUMNS)
        .eq('announcement_id', announcementId!)
        .eq('status', 'active')
        .maybeSingle()

      if (error) throw error
      return data
    },
  })
}

export type ReserveAnnouncementInput = {
  announcement_id: string
  customer_name: string
  customer_phone: string
  customer_email: string
  expires_at: string
  lead_id: string
  broker_id: string
  notes: string
}

export function useReserveAnnouncement(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ReserveAnnouncementInput): Promise<Reservation> => {
      const { data, error } = await supabase.rpc('reserve_announcement', {
        p_announcement_id: input.announcement_id,
        p_customer_name: input.customer_name,
        p_customer_phone: input.customer_phone || null,
        p_customer_email: input.customer_email || null,
        p_expires_at: new Date(input.expires_at).toISOString(),
        p_lead_id: input.lead_id || null,
        p_broker_id: input.broker_id || null,
        p_notes: input.notes || null,
      })

      if (error) throw error
      return data
    },
    onSuccess: (reservation) => {
      queryClient.invalidateQueries({ queryKey: ['reservations', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['active-reservation', reservation.announcement_id] })
      queryClient.invalidateQueries({ queryKey: ['announcements', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['announcement', reservation.announcement_id] })
      // Best-effort — falha no e-mail de confirmação não deve incomodar quem
      // acabou de reservar com sucesso.
      supabase.functions
        .invoke('send-notification-email', { body: { type: 'new_reservation', reservation_id: reservation.id } })
        .catch(() => {})
    },
  })
}

export function useCancelReservation(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }): Promise<Reservation> => {
      const { data, error } = await supabase.rpc('cancel_reservation', {
        p_id: id,
        p_reason: reason || null,
      })

      if (error) throw error
      return data
    },
    onSuccess: (reservation) => {
      queryClient.invalidateQueries({ queryKey: ['reservations', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['active-reservation', reservation.announcement_id] })
      queryClient.invalidateQueries({ queryKey: ['announcements', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['announcement', reservation.announcement_id] })
    },
  })
}
