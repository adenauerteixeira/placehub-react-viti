import { Input } from '@/components/ui/input'

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** Campo monetário com máscara "R$ 0,00" — os dígitos entram da direita
 * pra esquerda (como em qualquer app de banco/maquininha), sem depender
 * do usuário digitar vírgula/ponto. Valor reportado sempre em reais
 * (não centavos). Padrão pra todo campo monetário do sistema. */
export function CurrencyInput({
  id,
  value,
  onChange,
  disabled,
  'aria-invalid': ariaInvalid,
}: {
  id?: string
  value: number | null
  onChange: (value: number | null) => void
  disabled?: boolean
  'aria-invalid'?: boolean
}) {
  const display = value != null ? currencyFormatter.format(value) : ''

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '')
    if (digits === '' || digits === '0') {
      onChange(null)
      return
    }
    onChange(Number(digits) / 100)
  }

  return (
    <Input
      id={id}
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      placeholder="R$ 0,00"
      disabled={disabled}
      aria-invalid={ariaInvalid}
    />
  )
}
