/** Só estrutura — as fotos entram (foto[0] = capa, já visível; demais
 * começam com opacity 0 via CSS pra não "flashar" todas juntas antes do
 * GSAP assumir) num palco de proporção fixa, pra imagem carregando nunca
 * mudar a altura da seção (o que desalinharia a medição do ScrollTrigger).
 * Zero animação própria — a coreografia inteira vem de fora, via os refs
 * registrados em cada <img>. */
export function PropertyGallery({
  photos,
  title,
  registerPhotoRef,
}: {
  photos: { url: string; alt: string }[]
  title: string
  registerPhotoRef: (index: number, el: HTMLImageElement | null) => void
}) {
  return (
    <div className="relative aspect-video w-full max-w-2xl">
      {photos.map((photo, index) => (
        <img
          key={`${photo.url}-${index}`}
          ref={(el) => registerPhotoRef(index, el)}
          src={photo.url}
          alt={index === 0 ? title : ''}
          className="absolute inset-0 size-full rounded-2xl object-cover shadow-2xl"
          style={index === 0 ? undefined : { opacity: 0 }}
        />
      ))}
    </div>
  )
}
