// Escolhe branco ou um texto escuro conforme a luminância da cor de fundo,
// pra usar como *-foreground de uma cor de marca configurável (não dá pra
// supor de antemão se o hex escolhido pelo tenant é claro ou escuro).
function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex)
  if (!match) return null
  const int = parseInt(match[1], 16)
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 }
}

export function contrastForeground(hex: string, light = '#ffffff', dark = '#0b0b0c'): string {
  const rgb = parseHex(hex)
  if (!rgb) return dark

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const s = channel / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b

  return luminance > 0.45 ? dark : light
}
