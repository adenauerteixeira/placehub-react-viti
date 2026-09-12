import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { CheckCircle2, CircleAlert, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/field'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/phone-input'
import { errorMessage } from '@/lib/errors'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { rootDomain } from '@/lib/hostname'
import { isReservedSlug, slugify, SLUG_PATTERN } from '@/lib/slugify'
import { useCreateTenant, useManageTenantDomain, useUpdateTenant, type Tenant } from '@/features/tenants/api'

const schema = z.object({
  name: z.string().min(2, 'Informe o nome.'),
  slug: z
    .string()
    .regex(SLUG_PATTERN, 'Use letras minúsculas, números e hífen, sem começar/terminar com hífen.')
    .refine((s) => !isReservedSlug(s), 'Esse identificador é reservado pela plataforma.'),
  email: z.union([z.literal(''), z.email('E-mail inválido.')]),
  phone: z.string(),
})

type FormValues = z.infer<typeof schema>

const domainSchema = z
  .string()
  .regex(
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/,
    'Informe somente o domínio, sem protocolo, porta ou caminho.',
  )

const emptyValues: FormValues = { name: '', slug: '', email: '', phone: '' }

export function TenantFormDialog({
  open,
  onOpenChange,
  tenant,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenant?: Tenant
  onCreated?: (tenant: Tenant) => void
}) {
  const isEdit = !!tenant
  const [slugEdited, setSlugEdited] = useState(isEdit)
  const domain = rootDomain() ?? 'placehubapp.com.br'
  const createTenant = useCreateTenant()
  const updateTenant = useUpdateTenant()
  const manageDomain = useManageTenantDomain()
  const submitting = createTenant.isPending || updateTenant.isPending
  const [domainValue, setDomainValue] = useState('')
  const [domainError, setDomainError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyValues })

  useEffect(() => {
    if (!open) return
    setSlugEdited(isEdit)
    reset(
      tenant
        ? { name: tenant.name, slug: tenant.slug, email: tenant.email ?? '', phone: tenant.phone ?? '' }
        : emptyValues,
    )
    setDomainValue('')
    setDomainError(null)
  }, [open, tenant, isEdit, reset])

  const name = watch('name')
  useEffect(() => {
    if (!isEdit && !slugEdited) setValue('slug', slugify(name))
  }, [name, isEdit, slugEdited, setValue])

  function friendlyError(error: unknown): string {
    const message = errorMessage(error)
    if (message.includes('duplicate key') || message.includes('tenants_slug_key')) {
      return 'Esse identificador já está em uso por outra imobiliária.'
    }
    return message
  }

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit) {
        await updateTenant.mutateAsync({ id: tenant.id, ...values })
        toast.success('Imobiliária atualizada.')
      } else {
        const created = await createTenant.mutateAsync(values)
        toast.success('Imobiliária criada.')
        onCreated?.(created)
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(isEdit ? 'Não foi possível salvar' : 'Não foi possível criar', {
        description: friendlyError(error),
      })
    }
  }

  async function configureDomain() {
    if (!tenant) return
    const domain = (tenant.custom_domain ?? domainValue).trim().toLowerCase()
    const validation = domainSchema.safeParse(domain)
    if (!validation.success) {
      setDomainError(validation.error.issues[0]?.message ?? 'Informe um domínio válido.')
      return
    }
    setDomainError(null)
    try {
      const result = await manageDomain.mutateAsync({
        tenantId: tenant.id,
        action: tenant.custom_domain ? 'refresh' : 'provision',
        domain: validation.data,
      })
      toast.success(result.status === 'verified' ? 'Domínio verificado e ativo.' : 'Domínio cadastrado. Configure o DNS e verifique novamente.')
    } catch (error) {
      toast.error('Não foi possível configurar o domínio', { description: errorMessage(error) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar imobiliária' : 'Nova imobiliária'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Dados básicos e configurações de domínio. O subdomínio não pode ser alterado.'
              : 'Cadastre os dados essenciais primeiro. O domínio próprio pode ser configurado depois, ao editar a imobiliária.'}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label="Nome" htmlFor="tenant-name" error={errors.name?.message}>
            <Input id="tenant-name" {...register('name')} aria-invalid={!!errors.name} />
          </Field>

          <Field
            label="Subdomínio"
            htmlFor="tenant-slug"
            hint={`Endereço público da imobiliária ({subdomínio}.${domain}). Não pode ser alterado depois de criado.`}
            error={errors.slug?.message}
          >
            <div className="flex items-center gap-1.5">
              <Input
                id="tenant-slug"
                disabled={isEdit}
                {...register('slug', { onChange: () => setSlugEdited(true) })}
                aria-invalid={!!errors.slug}
              />
              <span className="text-muted-foreground text-sm whitespace-nowrap">.{domain}</span>
            </div>
          </Field>

          <Field label="E-mail de contato" htmlFor="tenant-email" error={errors.email?.message}>
            <Input id="tenant-email" type="email" {...register('email')} aria-invalid={!!errors.email} />
          </Field>

          <Field label="Telefone" htmlFor="tenant-phone">
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <PhoneInput id="tenant-phone" value={field.value} onChange={field.onChange} />
              )}
            />
          </Field>

          {isEdit && (
            <DomainSetup
              tenant={tenant}
              domainValue={domainValue}
              domainError={domainError}
              pending={manageDomain.isPending}
              onDomainChange={(value) => {
                setDomainValue(value)
                setDomainError(null)
              }}
              onConfigure={configureDomain}
            />
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {isEdit ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DomainSetup({
  tenant,
  domainValue,
  domainError,
  pending,
  onDomainChange,
  onConfigure,
}: {
  tenant: Tenant
  domainValue: string
  domainError: string | null
  pending: boolean
  onDomainChange: (value: string) => void
  onConfigure: () => void
}) {
  const configured = !!tenant.custom_domain
  const verified = tenant.custom_domain_status === 'verified'
  const config = tenant.custom_domain_config
  // A Vercel pode devolver alternativas por ordem de preferência. Mostrar
  // somente a primeira evita induzir a criação de CNAMEs concorrentes.
  const preferredCname = config?.recommendedCNAME?.find((entry) => entry.rank === 1) ?? config?.recommendedCNAME?.[0]
  const preferredIpv4 = config?.recommendedIPv4?.find((entry) => entry.rank === 1) ?? config?.recommendedIPv4?.[0]
  const cnames = preferredCname?.value ? [preferredCname.value] : []
  const ipv4 = preferredIpv4?.value ?? []

  return (
    <section className="rounded-lg border bg-muted/30 p-3.5" aria-label="Configuração de domínio próprio">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Domínio próprio</p>
          <p className="text-xs text-muted-foreground">A Vercel é configurada automaticamente; informe o DNS no provedor do domínio.</p>
        </div>
        {configured && (
          <span className={verified ? 'inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400' : 'inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400'}>
            {verified ? <CheckCircle2 className="size-3.5" /> : <CircleAlert className="size-3.5" />}
            {verified ? 'Verificado' : 'DNS pendente'}
          </span>
        )}
      </div>

      {configured ? (
        <p className="mt-3 rounded-md bg-background px-3 py-2 text-sm font-medium">{tenant.custom_domain}</p>
      ) : (
        <div className="mt-3">
          <Input
            id="tenant-custom-domain"
            placeholder="imobiliaria.com.br"
            value={domainValue}
            onChange={(event) => onDomainChange(event.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={!!domainError}
          />
          {domainError && <p className="mt-1.5 text-xs text-destructive">{domainError}</p>}
        </div>
      )}

      {configured && (cnames.length > 0 || ipv4.length > 0) && (
        <div className="mt-3 space-y-2 text-xs">
          <p className="font-medium text-muted-foreground">Registros sugeridos pela Vercel</p>
          {cnames.map((value) => <DnsRecord key={`cname-${value}`} type="CNAME" value={value} />)}
          {ipv4.map((value) => <DnsRecord key={`a-${value}`} type="A" value={value} />)}
        </div>
      )}

      {tenant.custom_domain_error && !verified && (
        <p className="mt-3 text-xs text-muted-foreground">{tenant.custom_domain_error}</p>
      )}

      <Button type="button" className="mt-3" size="sm" variant={configured ? 'outline' : 'default'} onClick={onConfigure} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : configured ? <RefreshCw /> : null}
        {configured ? 'Verificar DNS' : 'Configurar domínio'}
      </Button>
    </section>
  )
}

function DnsRecord({ type, value }: { type: 'A' | 'CNAME'; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-background px-2.5 py-2 font-mono">
      <span className="text-muted-foreground">{type}</span>
      <span className="truncate text-right">{value}</span>
    </div>
  )
}
