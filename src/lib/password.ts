import { z } from 'zod'

export type PasswordRule = {
  key: string
  label: string
  test: (value: string) => boolean
}

export const PASSWORD_RULES: PasswordRule[] = [
  { key: 'length', label: 'Pelo menos 8 caracteres', test: (v) => v.length >= 8 },
  { key: 'lowercase', label: 'Uma letra minúscula', test: (v) => /[a-z]/.test(v) },
  { key: 'uppercase', label: 'Uma letra maiúscula', test: (v) => /[A-Z]/.test(v) },
  { key: 'number', label: 'Um número', test: (v) => /[0-9]/.test(v) },
  { key: 'special', label: 'Um caractere especial', test: (v) => /[^A-Za-z0-9]/.test(v) },
]

export function isStrongPassword(value: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(value))
}

export const strongPasswordSchema = z
  .string()
  .refine(isStrongPassword, { message: 'A senha não atende aos requisitos mínimos.' })
