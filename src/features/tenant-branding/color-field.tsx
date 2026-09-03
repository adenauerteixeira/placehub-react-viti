import { Pipette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

/** API experimental (Chrome/Edge) — sem tipos no lib.dom.d.ts padrão do TS
 * ainda, então declaramos só o que usamos. */
type EyeDropperResult = { sRGBHex: string }
type EyeDropperConstructor = new () => { open(): Promise<EyeDropperResult> }

export function ColorField({
  label,
  value,
  onChange,
  disabled = false,
  compact = false,
  eyedropper = false,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  compact?: boolean
  /** Botão extra pra copiar cor de qualquer ponto da tela (não só de dentro
   * do seletor nativo) — só aparece em navegadores com suporte (Chrome/Edge). */
  eyedropper?: boolean
}) {
  const isValid = HEX_PATTERN.test(value)
  const EyeDropperApi = (globalThis as { EyeDropper?: EyeDropperConstructor }).EyeDropper

  async function handleEyedropper() {
    if (!EyeDropperApi) return
    try {
      const result = await new EyeDropperApi().open()
      onChange(result.sRGBHex)
    } catch {
      // usuário cancelou (Esc/clique fora) — sem toast, não é um erro real
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={isValid ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="border-input size-9 shrink-0 cursor-pointer rounded-md border p-0.5 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={label}
        />
        {eyedropper && EyeDropperApi && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            onClick={handleEyedropper}
            aria-label="Copiar cor da tela (conta-gotas)"
          >
            <Pipette className="size-4" />
          </Button>
        )}
        {!compact && (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="font-mono"
          />
        )}
      </div>
      {!compact && !isValid && (
        <p className="text-destructive text-sm">Use um hex válido, ex: #2563eb.</p>
      )}
    </div>
  )
}
