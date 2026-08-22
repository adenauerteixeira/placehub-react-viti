import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

export function ColorField({
  label,
  value,
  onChange,
  disabled = false,
  compact = false,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  compact?: boolean
}) {
  const isValid = HEX_PATTERN.test(value)

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
