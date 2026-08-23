export type VideoEmbed = { kind: 'youtube' | 'vimeo'; url: string } | { kind: 'file'; url: string } | { kind: 'link'; url: string }

/** Normaliza um link de vídeo livre (YouTube/Vimeo/arquivo direto) pra
 * decidir como exibir — mesma lógica do sistema anterior. */
export function normalizeVideoUrl(raw: string): VideoEmbed {
  const url = raw.trim()

  const youtube =
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/.exec(url)
  if (youtube) {
    return { kind: 'youtube', url: `https://www.youtube.com/embed/${youtube[1]}` }
  }

  const vimeo = /vimeo\.com\/(\d+)/.exec(url)
  if (vimeo) {
    return { kind: 'vimeo', url: `https://player.vimeo.com/video/${vimeo[1]}` }
  }

  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) {
    return { kind: 'file', url }
  }

  return { kind: 'link', url }
}
