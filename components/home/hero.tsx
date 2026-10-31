'use client'

import dynamic from 'next/dynamic'
import { motion } from 'motion/react'

const ParticleUniverse = dynamic(() => import('./particle-universe'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center" role="status">
      <span className="sr-only">Loading interactive universe</span>
      <div className="size-48 animate-pulse rounded-full bg-[radial-gradient(circle,rgba(118,85,216,0.35),transparent_65%)]" />
    </div>
  ),
})

const EASE = [0.16, 1, 0.3, 1] as const

export function Hero() {
  return (
    <section id="top" aria-label="Interactive particle universe" className="relative h-[100svh] overflow-hidden bg-ink">
      {/* Deep cosmic purple corona glow around the globe */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_48%,rgba(124,58,237,0.20)_0%,rgba(76,29,149,0.08)_36%,transparent_65%)]" />
      {/* Soft atmospheric platform horizon glow at bottom */}
      <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 right-0 h-[32%] bg-[radial-gradient(ellipse_at_50%_100%,rgba(109,40,217,0.18)_0%,transparent_70%)]" />
      <div aria-hidden className="cosmic-aura pointer-events-none absolute inset-0" />
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.6, ease: EASE, delay: 0.2 }}
        className="absolute inset-x-0 inset-y-6 mx-auto w-full max-w-[1680px] sm:inset-y-10"
      >
        <ParticleUniverse variant="hero" className="absolute inset-0" />
      </motion.div>
    </section>
  )
}
