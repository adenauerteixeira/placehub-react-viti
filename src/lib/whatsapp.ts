import { onlyDigits } from './cpf-cnpj'

/** Monta o link direto de WhatsApp (wa.me) a partir de um telefone livre —
 * mesmo padrão do sistema anterior: só dígitos, prefixa 55 (Brasil) se o
 * número não tiver DDI (10-11 dígitos = DDD+número). */
export function whatsappUrl(phone: string, message: string): string {
  let digits = onlyDigits(phone)
  if (digits.length <= 11) digits = `55${digits}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
