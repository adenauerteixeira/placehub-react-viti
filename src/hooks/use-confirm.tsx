import { createContext, useCallback, useContext, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type ConfirmOptions = {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
}

type ReasonOptions = ConfirmOptions & {
  reasonLabel?: string
  reasonPlaceholder?: string
  reasonRequired?: boolean
}

type Pending =
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: 'reason'; options: ReasonOptions; resolve: (value: string | null) => void }

type ConfirmContextValue = {
  /** Substitui window.confirm — resolve `true` só se o botão de ação for clicado. */
  confirm: (options: ConfirmOptions) => Promise<boolean>
  /** Substitui window.prompt — resolve `null` se cancelado, ou o texto (podendo ser
   * vazio quando o motivo não é obrigatório) se o botão de ação for clicado. */
  confirmWithReason: (options: ReasonOptions) => Promise<string | null>
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)
  const [reasonValue, setReasonValue] = useState('')

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ kind: 'confirm', options, resolve })
    })
  }, [])

  const confirmWithReason = useCallback((options: ReasonOptions) => {
    return new Promise<string | null>((resolve) => {
      setReasonValue('')
      setPending({ kind: 'reason', options, resolve })
    })
  }, [])

  const isReason = pending?.kind === 'reason'
  const reasonOptions = isReason ? pending.options : undefined
  const reasonRequired = !!reasonOptions?.reasonRequired
  const confirmDisabled = isReason && reasonRequired && !reasonValue.trim()

  function settle(result: boolean | string | null) {
    if (!pending) return
    if (pending.kind === 'confirm') pending.resolve(result as boolean)
    else pending.resolve(result as string | null)
    setPending(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm, confirmWithReason }}>
      {children}
      <AlertDialog
        open={!!pending}
        onOpenChange={(next) => !next && settle(isReason ? null : false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.options.title}</AlertDialogTitle>
            {pending?.options.description && (
              <AlertDialogDescription>{pending.options.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          {isReason && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-reason">{reasonOptions?.reasonLabel ?? 'Motivo'}</Label>
              <Textarea
                id="confirm-reason"
                autoFocus
                rows={3}
                value={reasonValue}
                onChange={(e) => setReasonValue(e.target.value)}
                placeholder={reasonOptions?.reasonPlaceholder}
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => settle(isReason ? null : false)}>
              {pending?.options.cancelLabel ?? 'Cancelar'}
            </AlertDialogCancel>
            <AlertDialogAction
              variant={pending?.options.variant === 'destructive' ? 'destructive' : 'default'}
              disabled={confirmDisabled}
              onClick={() => settle(isReason ? reasonValue.trim() : true)}
            >
              {pending?.options.confirmLabel ?? 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) throw new Error('useConfirm must be used within a ConfirmProvider')
  return context
}
