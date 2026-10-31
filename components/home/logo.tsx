import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-7', className)} aria-hidden="true" fill="none">
      <g className="origin-center transition-transform duration-700 ease-[var(--ease-expo)] group-hover/logo:rotate-90">
        <path d="M16 3 27 9.5v13L16 29 5 22.5v-13L16 3Z" stroke="currentColor" strokeWidth="1.6" className="text-lav" />
        <path d="M16 3v13m0 0 11 6.5M16 16 5 22.5" stroke="currentColor" strokeWidth="1.2" className="text-white/40" />
      </g>
      <circle cx="16" cy="16" r="3" className="fill-white transition-all duration-500 group-hover/logo:fill-lav" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('group/logo inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="text-[1.05rem] font-semibold tracking-tight">
        Study<span className="font-light text-lav">Tech</span>
      </span>
    </span>
  )
}
