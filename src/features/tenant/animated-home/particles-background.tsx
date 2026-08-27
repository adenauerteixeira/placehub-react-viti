import { useEffect, useRef } from 'react'

// Mesmo algoritmo da referência que o usuário mandou (login do sistema
// Laravel antigo, canvas 2D "à mão", sem lib externa) — rede de partículas
// conectadas por linhas quando próximas, reagindo ao mouse.
const CONFIG = {
  particleCount: 150,
  connectionDistance: 100,
  mouseDistance: 250,
  baseSpeed: 0.5,
  colors: ['rgba(66, 135, 245, ', 'rgba(166, 77, 255, ', 'rgba(255, 255, 255, '],
}

type ParticleState = {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  colorPrefix: string
  opacity: number
}

function makeParticle(width: number, height: number): ParticleState {
  const z = Math.random() * 2 + 0.5
  const speed = CONFIG.baseSpeed / z
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * speed,
    vy: (Math.random() - 0.5) * speed,
    radius: (Math.random() * 2 + 1) / z,
    colorPrefix: CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)],
    opacity: Math.random() * 0.5 + 0.2,
  }
}

/** Fundo de partículas conectadas (canvas 2D), alternativa à imagem no hero
 * animado (Identidade Visual > Página pública). Com `prefers-reduced-motion`
 * desenha só um quadro estático (rede parada), em vez de animar — nunca
 * fica em branco, mas também não força movimento contínuo em quem pediu
 * pra evitar. */
export function ParticlesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvasEl = canvasRef.current
    const ctx2d = canvasEl?.getContext('2d')
    if (!canvasEl || !ctx2d) return
    // TS não propaga o narrowing acima pras closures abaixo (resize/frame/
    // handleMouseMove só rodam depois, via listener/rAF) — re-vincula em
    // consts já tipados como não-nulos.
    const canvas: HTMLCanvasElement = canvasEl
    const ctx: CanvasRenderingContext2D = ctx2d

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mouse = { x: -1000, y: -1000 }
    let width = 0
    let height = 0
    let particles: ParticleState[] = []
    let frameId = 0

    function resize() {
      width = canvas.width = canvas.clientWidth
      height = canvas.height = canvas.clientHeight
      particles = Array.from({ length: CONFIG.particleCount }, () => makeParticle(width, height))
    }

    function handleMouseMove(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }

    function frame() {
      ctx.clearRect(0, 0, width, height)

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        const dx = mouse.x - p.x
        const dy = mouse.y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < CONFIG.mouseDistance) {
          const force = (CONFIG.mouseDistance - dist) / CONFIG.mouseDistance
          const angle = Math.atan2(dy, dx)
          const push = force * 2
          p.x -= Math.cos(angle) * push
          p.y -= Math.sin(angle) * push
        }
        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0
        if (p.y < 0) p.y = height
        if (p.y > height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `${p.colorPrefix}${p.opacity})`
        ctx.fill()
      }

      ctx.lineWidth = 0.5
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i]
          const p2 = particles[j]
          const dx = p1.x - p2.x
          const dy = p1.y - p2.y
          if (Math.abs(dx) > CONFIG.connectionDistance || Math.abs(dy) > CONFIG.connectionDistance) {
            continue
          }
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONFIG.connectionDistance) {
            const alpha = 1 - dist / CONFIG.connectionDistance
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y)
            gradient.addColorStop(0, `${p1.colorPrefix}${alpha * 0.2})`)
            gradient.addColorStop(1, `${p2.colorPrefix}${alpha * 0.2})`)
            ctx.strokeStyle = gradient
            ctx.stroke()
          }
        }
      }

      if (!reducedMotion) {
        frameId = requestAnimationFrame(frame)
      }
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', handleMouseMove)
    frame()

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
      if (frameId) cancelAnimationFrame(frameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 size-full"
      style={{ background: 'radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)' }}
    />
  )
}
