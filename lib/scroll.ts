import type Lenis from 'lenis'

declare global {
  interface Window {
    __lenis?: Lenis
  }
}

export function scrollToId(id: string) {
  if (typeof window === 'undefined') return
  const el = document.getElementById(id)
  if (!el) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const lenis = window.__lenis
  if (lenis && !reduced) {
    lenis.scrollTo(el, { duration: 1.6, easing: (t: number) => 1 - Math.pow(1 - t, 4) })
  } else {
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }
}

