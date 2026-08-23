/** Extrai uma mensagem legível de qualquer erro — inclusive os do
 * supabase-js/PostgREST, que são objetos simples com `.message` mas não
 * são `instanceof Error` (nesse caso `String(error)` vira "[object
 * Object]" em vez do texto real). */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message
  }
  return String(error)
}
