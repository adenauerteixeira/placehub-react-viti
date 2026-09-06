import { useState } from 'react'
import { Pipette } from 'lucide-react'
import { HexAlphaColorPicker } from 'react-colorful'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// Aceita hex de 6 dígitos (cor sólida, valor legado antes deste seletor
// existir) ou de 8 (com alfa, formato que o picker abaixo passa a gravar
// assim que o usuário mexe no slider de transparência).
const HEX_PATTERN = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/

/** API experimental (Chrome/Edge) — sem tipos no lib.dom.d.ts padrão do TS
 * ainda, então declaramos só o que usamos. */
type EyeDropperResult = { sRGBHex: string }
type EyeDropperConstructor = new () => { open(): Promise<EyeDropperResult> }

/** Seletor de cor padrão do projeto — troca o `<input type="color">` nativo
 * (sem suporte a transparência em nenhum navegador) por um popover com
 * slider de matiz + slider de alfa via react-colorful, no estilo do color
 * picker do VS Code. Todo campo de cor do sistema usa este componente, com
 * a barra de transparência sempre disponível (padrão pedido pelo usuário),
 * mesmo em cores que normalmente ficam 100% opacas. */
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
  const [open, setOpen] = useState(false)
  const isValid = HEX_PATTERN.test(value)
  const swatchColor = isValid ? value : '#000000'
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
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-label={label}
              className="border-input relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-md border bg-[repeating-conic-gradient(#8884_0_25%,transparent_0_25%_50%)] bg-[length:8px_8px] p-0.5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="block size-full rounded-sm" style={{ backgroundColor: swatchColor }} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <HexAlphaColorPicker color={swatchColor} onChange={onChange} />
          </PopoverContent>
        </Popover>
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
        <p className="text-destructive text-sm">Use um hex válido, ex: #2563eb ou #2563eb80.</p>
      )}
    </div>
  )
}
