import { ChevronDown } from 'lucide-react'

/** "Role para explorar" — mesmo selo já usado na home Animada. Fica dentro
 * de um contêiner `min-h-screen flex-col` junto com o hero e a grade de
 * categorias (ver `premium-home-page.tsx`); a grade usa `flex-1` e absorve
 * sozinha todo o espaço sobrando ali no meio, então esse selo, sendo o
 * último item, sempre "gruda" no fim da primeira tela — não importa quanto
 * espaço o hero/busca ocupem ali em cima (varia por tenant e por largura de
 * tela) nem quantas categorias existam. */
export function PremiumScrollCue() {
  return (
    <div className="motion-safe:animate-bounce text-muted-foreground flex flex-col items-center gap-1 pb-14">
      <span className="text-xs tracking-wide uppercase">Role para explorar</span>
      <ChevronDown className="size-6" />
    </div>
  )
}
