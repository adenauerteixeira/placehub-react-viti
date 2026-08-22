// Mesmos valores-padrão do sistema anterior (tela identidade-visual), pro
// botão "Restaurar cores padrão" de cada tema.
export const LIGHT_COLOR_FIELDS: { key: LightColorKey; label: string; default: string }[] = [
  { key: 'primary_color', label: 'Primária', default: '#2563eb' },
  { key: 'secondary_color', label: 'Secundária', default: '#475569' },
  { key: 'accent_color', label: 'Destaque', default: '#16a34a' },
  { key: 'light_background_color', label: 'Fundo da página', default: '#f8fafc' },
  { key: 'light_surface_color', label: 'Fundo dos cartões', default: '#ffffff' },
  { key: 'light_text_color', label: 'Texto principal', default: '#0f172a' },
  { key: 'light_muted_text_color', label: 'Texto secundário', default: '#64748b' },
  { key: 'light_border_color', label: 'Bordas', default: '#e2e8f0' },
]

export const DARK_COLOR_FIELDS: { key: DarkColorKey; label: string; default: string }[] = [
  { key: 'dark_primary_color', label: 'Primária', default: '#60a5fa' },
  { key: 'dark_accent_color', label: 'Destaque', default: '#4ade80' },
  { key: 'dark_background_color', label: 'Fundo da página', default: '#1e1e1e' },
  { key: 'dark_surface_color', label: 'Fundo dos cartões', default: '#252526' },
  { key: 'dark_text_color', label: 'Texto principal', default: '#f1f5f9' },
  { key: 'dark_muted_text_color', label: 'Texto secundário', default: '#94a3b8' },
  { key: 'dark_border_color', label: 'Bordas', default: '#3c3c3c' },
]

export type LightColorKey =
  | 'primary_color'
  | 'secondary_color'
  | 'accent_color'
  | 'light_background_color'
  | 'light_surface_color'
  | 'light_text_color'
  | 'light_muted_text_color'
  | 'light_border_color'

export type DarkColorKey =
  | 'dark_primary_color'
  | 'dark_accent_color'
  | 'dark_background_color'
  | 'dark_surface_color'
  | 'dark_text_color'
  | 'dark_muted_text_color'
  | 'dark_border_color'
