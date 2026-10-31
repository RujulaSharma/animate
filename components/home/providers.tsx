'use client'

import { useEffect } from 'react'
import { MotionConfig } from 'motion/react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ThemeToggle } from './theme-toggle'

gsap.registerPlugin(ScrollTrigger)

export function Providers({ children }: { children: React.ReactNode }) {

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    const lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 0.95 })
    window.__lenis = lenis

    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
      window.__lenis = undefined
    }
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <ThemeToggle />
      {children}
    </MotionConfig>
  )
}
