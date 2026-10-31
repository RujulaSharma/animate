'use client'

import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { scrollToId } from '@/lib/scroll'
import { Magnetic } from './magnetic'

type Variant = 'primary' | 'ghost' | 'ink' | 'light'

const variants: Record<Variant, string> = {
  primary: 'bg-lav text-ink hover:bg-lilac',
  ghost: 'border border-white/15 text-white hover:border-white/40 hover:bg-white/5',
  ink: 'bg-ink text-white hover:bg-surface-2',
  light: 'bg-white text-ink hover:bg-lilac',
}

type Props = {
  children: React.ReactNode
  variant?: Variant
  to?: string
  onClick?: () => void
  className?: string
  magnetic?: boolean
  icon?: boolean
  type?: 'button' | 'submit'
}

export function CtaButton({
  children,
  variant = 'primary',
  to,
  onClick,
  className,
  magnetic = true,
  icon = true,
  type = 'button',
}: Props) {
  const classes = cn(
    'group/btn relative inline-flex items-center gap-2 overflow-hidden rounded-full px-6 py-3.5 text-sm font-semibold tracking-tight transition-[background-color,border-color,transform] duration-300 active:scale-[0.96]',
    variants[variant],
    className,
  )
  const inner = (
    <>
      <span>{children}</span>
      {icon && (
        <ArrowUpRight className="size-4 transition-transform duration-300 ease-[var(--ease-expo)] group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5" />
      )}
    </>
  )

  const el = to ? (
    <a
      href={`#${to}`}
      className={classes}
      onClick={(e) => {
        e.preventDefault()
        scrollToId(to)
        onClick?.()
      }}
    >
      {inner}
    </a>
  ) : (
    <button type={type} className={classes} onClick={onClick}>
      {inner}
    </button>
  )

  return magnetic ? <Magnetic>{el}</Magnetic> : el
}
