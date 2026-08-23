import { Input } from '@/components/ui/input'
import { formatDocument, onlyDigits } from '@/lib/cpf-cnpj'

/** Campo de CPF/CNPJ com máscara progressiva (XXX.XXX.XXX-XX /
 * XX.XXX.XXX/XXXX-XX) — o valor reportado é sempre só os dígitos. Padrão
 * pra todo campo de documento. */
export function DocumentInput({
  id,
  personType,
  value,
  onChange,
  'aria-invalid': ariaInvalid,
}: {
  id?: string
  personType: 'PF' | 'PJ'
  value: string
  onChange: (value: string) => void
  'aria-invalid'?: boolean
}) {
  const maxLength = personType === 'PF' ? 11 : 14

  return (
    <Input
      id={id}
      inputMode="numeric"
      value={formatDocument(personType, value)}
      onChange={(e) => onChange(onlyDigits(e.target.value).slice(0, maxLength))}
      aria-invalid={ariaInvalid}
    />
  )
}
