import { Link } from 'react-router-dom'

// Borda branca contrastante em toda foto (capa e colagem, mesma espessura
// nas duas) — separa visualmente uma foto da outra quando se sobrepõem,
// tipo Polaroid.
const PHOTO_BORDER = 'border-[6px] border-white/90 rounded-2xl object-cover shadow-2xl'

// As fotos da colagem (property-type-section.tsx, collageSlotFor) ficam em
// ~0.36–0.42 do palco (média 0.4) — o pedido foi "a capa do dobro do
// tamanho de uma foto da colagem", ou seja, ~0.8 do palco (top/left 10%,
// tamanho 80%). Importante: `<img>` é elemento substituído (replaced) — só
// `inset-X%` (sem width/height explícitos) NÃO estica ele feito estica uma
// div comum; o navegador cai no algoritmo de tamanho intrínseco da imagem
// (ignora os offsets, resultado ~0). Por isso aqui é top+left (posição) +
// `size-[80%]` (tamanho explícito) em vez de só `inset`. Precisa ficar como
// classe Tailwind literal (não montada via template string) — o scanner do
// Tailwind só pega classes que aparecem como texto exato no arquivo.

/** Só estrutura — as fotos entram (foto[0] = capa, já visível; demais
 * começam com opacity 0 via CSS pra não "flashar" todas juntas antes do
 * GSAP assumir) num palco de proporção fixa, pra imagem carregando nunca
 * mudar a altura da seção (o que desalinharia a medição do ScrollTrigger).
 * Zero animação própria — a coreografia inteira vem de fora, via os refs
 * registrados em cada <img>. A capa (índice 0) ganha z-index maior de
 * propósito: fica em primeiro plano, por cima da colagem de fotos
 * secundárias espalhada ao fundo — com um inset FIXO (não responsivo por
 * breakpoint) que a mantém em ~2x o tamanho de uma foto da colagem em
 * qualquer largura de tela. Isso já "encolhe proporcionalmente" sozinho:
 * como o palco em si é `w-full max-w-2xl`, uma % fixa dele acompanha o
 * palco encolhendo continuamente enquanto a tela for mais estreita que o
 * cap de max-w-2xl — não precisa de um degrau por breakpoint (tentativa
 * anterior, descartada: parecia "grande" em telas médias mesmo reduzida).
 * GSAP anima só `transform` (scale/rotation/posição) nessas fotos, nunca
 * `inset`/tamanho — então esse tamanho via classe Tailwind nunca é
 * sobrescrito pelas tweens. */
export function PropertyGallery({
  photos,
  title,
  slug,
  registerPhotoRef,
}: {
  photos: { url: string; alt: string }[]
  title: string
  slug: string
  registerPhotoRef: (index: number, el: HTMLImageElement | null) => void
}) {
  return (
    <div className="relative aspect-video w-full max-w-2xl">
      {photos.map((photo, index) =>
        index === 0 ? (
          <Link
            key={`${photo.url}-${index}`}
            to={`/anuncios/${slug}`}
            className="absolute top-[10%] left-[10%] size-[80%] z-10 block cursor-pointer transition-transform duration-300 ease-out hover:scale-[1.2]"
          >
            <img
              ref={(el) => registerPhotoRef(index, el)}
              src={photo.url}
              alt={title}
              className={`size-full ${PHOTO_BORDER}`}
            />
          </Link>
        ) : (
          <img
            key={`${photo.url}-${index}`}
            ref={(el) => registerPhotoRef(index, el)}
            src={photo.url}
            alt=""
            className={`absolute inset-0 size-full ${PHOTO_BORDER}`}
            style={{ opacity: 0 }}
          />
        ),
      )}
    </div>
  )
}
