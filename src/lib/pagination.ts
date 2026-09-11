/** Contrato comum para listagens paginadas pelo Supabase. */
export type PageRequest<TSort extends string> = {
  page: number
  pageSize: number
  search: string
  sortBy: TSort
  ascending: boolean
}

export type PageResult<T> = {
  data: T[]
  total: number
}

export const DEFAULT_PAGE_SIZE = 25

/** Remove caracteres com significado na sintaxe `or()`/`ilike` do PostgREST
 * antes de interpolar o termo em filtros. */
export function searchableTerm(value: string): string {
  return value.trim().replace(/[,_%().]/g, '')
}
