import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { onlyDigits } from '@/lib/cpf-cnpj'

const BUCKET = 'catalog-media'

export type Broker = {
  id: string
  tenant_id: string
  profile_id: string | null
  name: string
  slug: string
  photo_path: string | null
  phone: string | null
  email: string | null
  cpf: string | null
  creci: string | null
  creci_state: string | null
  commission_percentage: number
  bio: string | null
  active: boolean
  created_at: string
  updated_at: string
}

const BROKER_COLUMNS =
  'id, tenant_id, profile_id, name, slug, photo_path, phone, email, cpf, creci, creci_state, commission_percentage, bio, active, created_at, updated_at'

export function brokerPhotoUrl(path: string | null, updatedAt: string): string | null {
  if (!path) return null
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return `${data.publicUrl}?v=${new Date(updatedAt).getTime()}`
}

export function useBrokers(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['brokers', tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<Broker[]> => {
      const { data, error } = await supabase
        .from('brokers')
        .select(BROKER_COLUMNS)
        .eq('tenant_id', tenantId!)
        .order('name')

      if (error) throw error
      return data
    },
  })
}

/** Portal público — só corretores ativos (garantido por RLS). */
export function usePublicBrokers(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['public-brokers', tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<Broker[]> => {
      const { data, error } = await supabase
        .from('brokers')
        .select(BROKER_COLUMNS)
        .eq('tenant_id', tenantId!)
        .eq('active', true)
        .order('name')

      if (error) throw error
      return data
    },
  })
}

export function usePublicBroker(tenantId: string | null | undefined, slug: string | null | undefined) {
  return useQuery({
    queryKey: ['public-broker', tenantId, slug],
    enabled: !!tenantId && !!slug,
    queryFn: async (): Promise<Broker | null> => {
      const { data, error } = await supabase
        .from('brokers')
        .select(BROKER_COLUMNS)
        .eq('tenant_id', tenantId!)
        .eq('slug', slug!)
        .eq('active', true)
        .maybeSingle()

      if (error) throw error
      return data
    },
  })
}

/** Profiles com role "broker", ativos, que ainda não estão vinculados a
 * nenhum corretor (ou são o próprio vínculo atual, na edição). */
export function useEligibleBrokerProfiles(tenantId: string | null, currentBrokerProfileId: string | null) {
  return useQuery({
    queryKey: ['eligible-broker-profiles', tenantId, currentBrokerProfileId],
    enabled: !!tenantId,
    queryFn: async (): Promise<{ id: string; full_name: string | null; email: string }[]> => {
      const [{ data: profiles, error: profilesError }, { data: linked, error: linkedError }] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('tenant_id', tenantId!)
            .eq('role', 'broker')
            .eq('is_active', true),
          supabase.from('brokers').select('profile_id').eq('tenant_id', tenantId!).not('profile_id', 'is', null),
        ])

      if (profilesError) throw profilesError
      if (linkedError) throw linkedError

      const linkedIds = new Set(linked.map((b) => b.profile_id as string))
      linkedIds.delete(currentBrokerProfileId ?? '')
      return profiles.filter((p) => !linkedIds.has(p.id))
    },
  })
}

export type BrokerInput = {
  name: string
  profile_id: string | null
  phone: string
  email: string
  cpf: string
  creci: string
  creci_state: string
  commission_percentage: number
  bio: string
}

function toRow(input: BrokerInput) {
  return {
    name: input.name,
    profile_id: input.profile_id,
    phone: input.phone || null,
    email: input.email || null,
    cpf: input.cpf ? onlyDigits(input.cpf) : null,
    creci: input.creci || null,
    creci_state: input.creci_state || null,
    commission_percentage: input.commission_percentage,
    bio: input.bio || null,
  }
}

export function useCreateBroker(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: BrokerInput & { slug: string }): Promise<Broker> => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('brokers')
        .insert({
          tenant_id: tenantId,
          slug: input.slug,
          ...toRow(input),
          created_by: userData.user?.id ?? null,
        })
        .select(BROKER_COLUMNS)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokers', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['eligible-broker-profiles', tenantId] })
    },
  })
}

export function useUpdateBroker(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & BrokerInput): Promise<Broker> => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('brokers')
        .update({ ...toRow(input), updated_by: userData.user?.id ?? null })
        .eq('id', id)
        .select(BROKER_COLUMNS)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokers', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['eligible-broker-profiles', tenantId] })
    },
  })
}

export function useToggleBrokerActive(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }): Promise<Broker> => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('brokers')
        .update({ active, updated_by: userData.user?.id ?? null })
        .eq('id', id)
        .select(BROKER_COLUMNS)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokers', tenantId] })
    },
  })
}

export function useUploadBrokerPhoto(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ brokerId, file }: { brokerId: string; file: File }): Promise<string> => {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${tenantId}/brokers/${brokerId}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError

      const { error: updateError } = await supabase
        .from('brokers')
        .update({ photo_path: path })
        .eq('id', brokerId)
      if (updateError) throw updateError

      return path
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokers', tenantId] })
    },
  })
}
