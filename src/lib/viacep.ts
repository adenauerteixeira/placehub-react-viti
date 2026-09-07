import { onlyDigits } from './cpf-cnpj'

export type ViaCepResult = {
  street: string
  neighborhood: string
  city: string
  state: string
}

/** Formata progressivamente como 99999-999. */
export function formatZipCode(value: string): string {
  const digits = onlyDigits(value).slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

/** ViaCEP (viacep.com.br) — API pública gratuita, sem chave, pra
 * preencher endereço a partir do CEP. Retorna null se o CEP não existir
 * ou a consulta falhar (a UI deve deixar o preenchimento manual). */
export async function lookupCep(rawCep: string): Promise<ViaCepResult | null> {
  const cep = onlyDigits(rawCep)
  if (cep.length !== 8) return null

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
    if (!res.ok) return null
    const data = await res.json()
    if (data.erro) return null

    return {
      street: data.logradouro ?? '',
      neighborhood: data.bairro ?? '',
      city: data.localidade ?? '',
      state: data.uf ?? '',
    }
  } catch {
    return null
  }
}
