'use client'

import { scrollToId } from '@/lib/scroll'
import { Logo } from './logo'

const platform = [
  ['Courses', 'courses'],
  ['Projects', 'projects'],
  ['CodeSpace', 'codespace'],
  ['Hackathons', 'hackathons'],
  ['Build', 'build'],
] as const

const explore = [
  ['Explore', 'explore'],
  ['Community', 'community'],
  ['Join StudyTech', 'join'],
  ['Back to top', 'top'],
] as const

const socials = [
  { label: 'GitHub', short: 'GH' },
  { label: 'X', short: 'X' },
  { label: 'LinkedIn', short: 'in' },
  { label: 'YouTube', short: 'YT' },
]

function ScrollLink({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <a
      href={`#${id}`}
      onClick={(e) => {
        e.preventDefault()
        scrollToId(id)
      }}
      className="group relative inline-block text-white/70 transition-colors hover:text-white"
    >
      {children}
      <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-lav transition-transform duration-500 ease-[var(--ease-expo)] group-hover:scale-x-100" />
    </a>
  )
}

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-line bg-deep">
      <div className="mx-auto max-w-[1440px] px-6 pt-20 sm:px-10">
        <div className="grid gap-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted">Learn. Build. Compete. Connect.</p>
            <ul className="mt-8 flex gap-2">
              {socials.map(({ label, short }) => (
                <li key={label}>
                  <button
                    type="button"
                    aria-label={`${label} (placeholder)`}
                    className="grid size-10 place-items-center rounded-full border border-line font-mono text-[0.68rem] text-white/60 transition hover:border-lav hover:text-lav"
                  >
                    {short}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label="Platform">
            <p className="eyebrow mb-5 text-[0.62rem] text-white/40">Platform</p>
            <ul className="space-y-3 text-sm">
              {platform.map(([l, id]) => (
                <li key={id}>
                  <ScrollLink id={id}>{l}</ScrollLink>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Explore">
            <p className="eyebrow mb-5 text-[0.62rem] text-white/40">Explore</p>
            <ul className="space-y-3 text-sm">
              {explore.map(([l, id]) => (
                <li key={id}>
                  <ScrollLink id={id}>{l}</ScrollLink>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="eyebrow mb-5 text-[0.62rem] text-white/40">Legal</p>
            <ul className="space-y-3 text-sm text-white/45">
              {['Privacy (placeholder)', 'Terms (placeholder)', 'Cookies (placeholder)'].map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col justify-between gap-3 border-t border-line py-6 text-xs text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} StudyTech. All rights reserved.</p>
          <p>A concept homepage. Events, projects and conversations are sample data.</p>
        </div>
      </div>

      <div aria-hidden className="group/word relative select-none overflow-hidden pb-4">
        <p className="whitespace-nowrap text-center text-[clamp(5rem,23vw,22rem)] font-semibold leading-[0.8] tracking-[-0.07em] text-transparent transition-all duration-700 [-webkit-text-stroke:1px_rgba(221,208,255,0.22)] group-hover/word:[-webkit-text-stroke:1px_rgba(167,139,250,0.9)]">
          StudyTech
        </p>
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-deep to-transparent" />
        <span className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-lav transition-transform duration-[1400ms] ease-[var(--ease-expo)] group-hover/word:scale-x-100" />
      </div>
    </footer>
  )
}
