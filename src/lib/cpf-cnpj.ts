/** Validação real de CPF/CNPJ (dígitos verificadores), não só tamanho —
 * o sistema anterior tinha essa mesma checagem no back-end (App\Rules\CpfCnpj). */

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function checkDigits(digits: string, weights: number[]): number {
  const sum = digits
    .split('')
    .reduce((acc, digit, i) => acc + Number(digit) * weights[i], 0)
  const rest = sum % 11
  return rest < 2 ? 0 : 11 - rest
}

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false

  const d1 = checkDigits(cpf.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2])
  const d2 = checkDigits(cpf.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10])
}

export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value)
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false

  const d1 = checkDigits(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const d2 = checkDigits(cnpj.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13])
}

export function isValidDocument(personType: 'PF' | 'PJ', value: string): boolean {
  if (!value) return true // documento é opcional
  return personType === 'PF' ? isValidCpf(value) : isValidCnpj(value)
}

export function formatDocument(personType: 'PF' | 'PJ', value: string): string {
  const digits = onlyDigits(value)
  if (personType === 'PF') {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}
