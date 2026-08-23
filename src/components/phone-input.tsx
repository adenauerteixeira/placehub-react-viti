import { Input } from '@/components/ui/input'
import { onlyDigits } from '@/lib/cpf-cnpj'
import { formatPhone } from '@/lib/phone'

/** Campo de telefone com máscara (XX) XXXXX-XXXX/(XX) XXXX-XXXX — o valor
 * reportado é sempre só os dígitos. Padrão pra todo campo de telefone. */
export function PhoneInput({
  id,
  value,
  onChange,
  onBlur,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
}) {
  return (
    <Input
      id={id}
      inputMode="tel"
      value={formatPhone(value)}
      onChange={(e) => onChange(onlyDigits(e.target.value).slice(0, 11))}
      onBlur={onBlur}
    />
  )
}
