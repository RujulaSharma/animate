'use client'

import { motion, type Variants } from 'motion/react'
import { cn } from '@/lib/utils'

const EASE = [0.16, 1, 0.3, 1] as const

const wordVariants: Variants = {
  hidden: { y: '112%', rotate: 3 },
  show: (i: number) => ({
    y: '0%',
    rotate: 0,
    transition: { duration: 1.05, ease: EASE, delay: i * 0.055 },
  }),
}

/** Masked word-by-word headline reveal. Accepts plain strings; wrap emphasis via `accent` indexes. */
export function WordReveal({
  text,
  className,
  accent = [],
  accentClass = 'text-lav',
  soft = [],
  softClass = 'text-white/45 font-light',
  delay = 0,
  as: Tag = 'h2',
  immediate = false,
}: {
  text: string
  className?: string
  accent?: number[]
  accentClass?: string
  soft?: number[]
  softClass?: string
  delay?: number
  as?: 'h1' | 'h2' | 'h3' | 'p'
  immediate?: boolean
}) {
  const words = text.split(' ')
  const MotionTag = motion[Tag]
  return (
    <MotionTag
      className={cn('display', className)}
      initial="hidden"
      whileInView={immediate ? undefined : 'show'}
      animate={immediate ? 'show' : undefined}
      viewport={{ once: true, margin: '-12% 0px' }}
      transition={{ delayChildren: delay }}
    >
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            custom={i + delay * 18}
            variants={wordVariants}
            className={cn(
              'inline-block origin-left will-change-transform',
              accent.includes(i) && accentClass,
              soft.includes(i) && softClass,
            )}
          >
            {w}
            {i < words.length - 1 ? '\u00A0' : ''}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  )
}
