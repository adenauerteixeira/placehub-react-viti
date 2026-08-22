export function BrandingPreviewCard({
  background,
  surface,
  border,
  text,
  mutedText,
  accent,
}: {
  background: string
  surface: string
  border: string
  text: string
  mutedText: string
  accent: string
}) {
  return (
    <div
      className="rounded-2xl border p-5 text-sm"
      style={{ background, borderColor: border, color: text }}
    >
      <strong>Exemplo do portal</strong>
      <div className="mt-4 rounded-xl border p-5" style={{ background: surface, borderColor: border }}>
        <h3 className="font-bold">Casa térrea em excelente localização</h3>
        <p className="mt-2 text-sm" style={{ color: mutedText }}>
          3 quartos · 2 vagas · Goiânia/GO
        </p>
        <button
          type="button"
          className="mt-5 rounded-lg px-4 py-2 text-sm text-white"
          style={{ background: accent }}
        >
          Tenho interesse
        </button>
      </div>
    </div>
  )
}
