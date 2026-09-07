import { onlyDigits } from './cpf-cnpj'

/** Formata progressivamente como (XX) XXXX-XXXX (fixo) ou (XX) X XXXX-XXXX
 * (celular, 9º dígito) conforme a quantidade de dígitos digitados. */
export function formatPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length === 0) return ''
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`
}

/** Formata como (XX) X-XXXX-XXXX (celular) ou (XX) XXXX-XXXX (fixo) — usado
 * em exibições estáticas (ex: rodapé institucional), diferente da máscara
 * progressiva de `formatPhone` usada em campos de digitação. */
export function formatPhoneDisplay(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 10) return formatPhone(digits)
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}
