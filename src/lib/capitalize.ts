const CONNECTORS = new Set(['de', 'da', 'das', 'do', 'dos', 'e'])

/** Capitaliza um nome (primeira letra maiúscula em cada palavra), mantendo
 * minúsculas as preposições de ligação comuns em nomes ("de", "da",
 * "dos"...) exceto quando são a primeira palavra. */
export function capitalizeName(input: string): string {
  return input
    .toLowerCase()
    .split(' ')
    .map((word, i) => {
      if (!word) return word
      if (i > 0 && CONNECTORS.has(word)) return word
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}
