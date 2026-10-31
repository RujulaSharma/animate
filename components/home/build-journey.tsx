'use client'

import { useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react'
import { Check, Rocket } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WordReveal } from './reveal'

const EASE = [0.16, 1, 0.3, 1] as const

const stages = [
  { id: 'idea', label: 'Idea', title: 'A spark on a blank canvas', copy: 'Every project starts as a sentence. Write it down, circle what matters, and name the one thing it must do.' },
  { id: 'plan', label: 'Plan', title: 'Break it into real tasks', copy: 'Turn the sentence into a structure: screens, data and a short list of tasks you can finish in an evening.' },
  { id: 'code', label: 'Code', title: 'Write the first honest version', copy: 'Open the editor and build the smallest thing that works. Guided hints are there when you get stuck.' },
  { id: 'test', label: 'Test', title: 'Check it before anyone else does', copy: 'Automated checks catch regressions and accessibility gaps while the change is still fresh in your head.' },
  { id: 'ship', label: 'Ship', title: 'Put a real link in the world', copy: 'Publish to a public URL, share it with the community, and start collecting feedback on something real.' },
] as const

function scrollToY(y: number) {
  const lenis = window.__lenis
  if (lenis) lenis.scrollTo(y, { duration: 1.4 })
  else window.scrollTo({ top: y, behavior: 'smooth' })
}

export function BuildJourney() {
  const ref = useRef<HTMLElement>(null)
  const [stage, setStage] = useState(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const fill = useTransform(scrollYProgress, [0, 0.92], [0, 1])

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setStage(Math.max(0, Math.min(stages.length - 1, Math.floor(v * stages.length))))
  })

  const jump = (i: number) => {
    const el = ref.current
    if (!el) return
    const range = el.offsetHeight - window.innerHeight
    scrollToY(el.offsetTop + (i / stages.length + 0.04) * range)
  }

  const s = stages[stage]

  return (
    <section ref={ref} id="build" className="relative h-[460svh] bg-deep">
      <div className="sticky top-0 h-svh overflow-hidden">
        <div aria-hidden className="dot-grid absolute inset-0 opacity-25 [mask-image:radial-gradient(ellipse_at_70%_50%,black,transparent_75%)]" />
        <div className="relative mx-auto flex h-full max-w-[1440px] flex-col justify-center gap-5 px-6 pb-6 pt-20 sm:px-10 lg:grid lg:grid-cols-[0.8fr_1.25fr] lg:items-center lg:gap-14 lg:py-24">
          <div>
            <p className="eyebrow mb-4 text-lav lg:mb-6">( 05 · Build )</p>
            <WordReveal
              text="Start with nothing. Finish with something real."
              accent={[5, 6]}
              soft={[0, 1, 2]}
              className="text-[clamp(2rem,4.4vw,4.6rem)]"
            />

            <ol className="relative mt-6 flex gap-1 lg:mt-12 lg:block lg:space-y-0.5" aria-label="Build stages">
              <div aria-hidden className="absolute bottom-3 left-[0.62rem] top-3 hidden w-px bg-line lg:block">
                <motion.div style={{ scaleY: fill }} className="h-full origin-top bg-lav" />
              </div>
              {stages.map((st, i) => (
                <li key={st.id} className="flex-1 lg:flex-none">
                  <button
                    type="button"
                    onClick={() => jump(i)}
                    aria-current={i === stage ? 'step' : undefined}
                    className={cn(
                      'relative flex w-full items-center gap-3 py-1.5 text-left transition-colors lg:py-2',
                      i === stage ? 'text-white' : i < stage ? 'text-white/60' : 'text-white/30',
                      'hover:text-white',
                    )}
                  >
                    <span
                      className={cn(
                        'relative z-10 hidden size-[1.35rem] shrink-0 place-items-center rounded-full border text-[0.55rem] font-mono transition-colors duration-500 lg:grid',
                        i <= stage ? 'border-lav bg-lav text-ink' : 'border-line bg-deep',
                      )}
                    >
                      {i < stage ? <Check className="size-3" /> : i + 1}
                    </span>
                    <span className="eyebrow text-[0.62rem] tracking-[0.2em] lg:text-[0.72rem]">{st.label}</span>
                    <span className={cn('absolute inset-x-0 -bottom-0.5 h-px lg:hidden', i <= stage ? 'bg-lav' : 'bg-line')} />
                  </button>
                </li>
              ))}
            </ol>

            <div className="relative mt-5 min-h-[7.5rem] lg:mt-10 lg:min-h-[9rem]" aria-live="polite">
              <AnimatePresence mode="wait">
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  <h3 className="text-xl font-medium tracking-[-0.03em] lg:text-3xl">{s.title}</h3>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-muted lg:text-base">{s.copy}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <Workbench stage={stage} />
        </div>
      </div>
    </section>
  )
}

const titles = ['untitled.canvas', 'study-streak / plan', 'study-streak / src', 'study-streak / checks', 'study-streak · live']

function Workbench({ stage }: { stage: number }) {
  return (
    <div className="relative flex h-[44svh] min-h-[300px] flex-col overflow-hidden rounded-2xl border border-line bg-ink shadow-[0_40px_120px_-30px_rgba(118,85,216,0.5)] lg:h-[600px]">
      <div className="flex shrink-0 items-center justify-between border-b border-line bg-surface px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
        </div>
        <AnimatePresence mode="wait">
          <motion.span
            key={stage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="font-mono text-xs text-white/50"
          >
            {titles[stage]}
          </motion.span>
        </AnimatePresence>
        <span className="eyebrow w-12 text-right text-[0.58rem] text-lav">0{stage + 1}/05</span>
      </div>

      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait">
          {stage === 0 && (
            <motion.div key="idea" exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.3 }} className="absolute inset-0">
              <IdeaScene />
            </motion.div>
          )}
          {stage >= 1 && (
            <motion.div key="work" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="absolute inset-0 grid grid-cols-1 gap-3 p-3 sm:p-4 lg:grid-cols-[0.8fr_1.2fr] lg:gap-4">
              <PlanBoard stage={stage} />
              <div className="relative min-h-0">
                <AnimatePresence mode="wait">
                  {stage < 4 ? (
                    <motion.div key="dev" className="flex h-full flex-col gap-3" exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
                      {stage >= 2 && <CodePanel compact={stage >= 3} />}
                      {stage >= 3 && <TestPanel />}
                    </motion.div>
                  ) : (
                    <motion.div key="ship" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, ease: EASE }} className="h-full">
                      <ShipScene />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function IdeaScene() {
  return (
    <div className="relative grid h-full place-items-center overflow-hidden p-6">
      <svg aria-hidden viewBox="0 0 400 300" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <motion.path
          d="M40 230 C 90 140, 150 260, 210 170 S 320 80, 370 130"
          fill="none"
          stroke="#A78BFA"
          strokeWidth="1.4"
          strokeDasharray="4 6"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.8, ease: EASE }}
        />
        {[
          [60, 70],
          [330, 60],
          [340, 240],
          [70, 240],
        ].map(([x, y], i) => (
          <motion.circle key={i} cx={x} cy={y} r="4" fill="#DDD0FF" initial={{ scale: 0 }} animate={{ scale: [0, 1.4, 1] }} transition={{ delay: 0.3 + i * 0.2, duration: 0.6 }} style={{ transformOrigin: `${x}px ${y}px` }} />
        ))}
      </svg>
      <motion.div
        initial={{ opacity: 0, y: 20, rotate: -3 }}
        animate={{ opacity: 1, y: 0, rotate: -2 }}
        transition={{ duration: 0.9, ease: EASE }}
        className="relative max-w-[17rem] rounded-xl bg-lilac p-5 text-paper-ink shadow-2xl"
      >
        <p className="eyebrow text-[0.58rem] text-violet">Idea</p>
        <p className="mt-2 text-xl font-medium leading-tight tracking-tight">A tiny tracker that keeps my study streak alive.</p>
        <p className="mt-3 text-xs text-paper-muted">One button. One number. Zero guilt.</p>
        <span aria-hidden className="absolute -right-2 -top-2 size-5 animate-pulse rounded-full bg-lav" />
      </motion.div>
    </div>
  )
}

const tasks = ['Design the streak card', 'Count days in state', 'Log a session on click', 'Persist between visits', 'Deploy to a public URL']

function PlanBoard({ stage }: { stage: number }) {
  const done = stage === 1 ? 0 : stage === 2 ? 2 : tasks.length
  return (
    <div className="hidden min-h-0 flex-col rounded-xl border border-line bg-surface/60 p-4 lg:flex">
      <p className="eyebrow flex items-center justify-between text-[0.6rem] text-white/40">
        Plan <span className="text-lav">{done}/{tasks.length}</span>
      </p>
      <ul className="mt-4 space-y-2">
        {tasks.map((t, i) => {
          const ok = i < done
          return (
            <motion.li
              key={t}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.6, ease: EASE }}
              className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-sm"
            >
              <span className={cn('grid size-4 shrink-0 place-items-center rounded-full border transition-colors duration-500', ok ? 'border-lav bg-lav text-ink' : 'border-white/25')}>
                {ok && <Check className="size-2.5" />}
              </span>
              <span className={cn('transition-colors duration-500', ok ? 'text-white/45 line-through' : 'text-white/85')}>{t}</span>
            </motion.li>
          )
        })}
      </ul>
      <div className="mt-auto pt-4">
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full bg-lav" animate={{ width: `${(done / tasks.length) * 100}%` }} transition={{ duration: 0.8, ease: EASE }} />
        </div>
      </div>
    </div>
  )
}

const codeLines = [
  <><i className="t-kw">const</i> [streak, setStreak] = <i className="t-fn">useState</i>(<i className="t-num">7</i>)</>,
  <></>,
  <><i className="t-kw">function</i> <i className="t-fn">logSession</i>() {'{'}</>,
  <>&nbsp;&nbsp;<i className="t-fn">setStreak</i>((n) =&gt; n + <i className="t-num">1</i>)</>,
  <>&nbsp;&nbsp;<i className="t-fn">save</i>(<i className="t-str">&apos;streak&apos;</i>, streak + <i className="t-num">1</i>)</>,
  <>{'}'}</>,
]

function CodePanel({ compact }: { compact: boolean }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE }}
      className={cn('code overflow-hidden rounded-xl border border-line bg-surface/60 p-4 font-mono text-[0.7rem] leading-[1.75] text-white/85', compact ? 'shrink-0' : 'flex-1')}
    >
      <p className="eyebrow mb-3 text-[0.58rem] text-white/35">src/streak.tsx</p>
      {codeLines.slice(0, compact ? 4 : 6).map((l, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.09, duration: 0.5 }} className="whitespace-pre">
          {l}
          {'\u00A0'}
        </motion.div>
      ))}
    </motion.div>
  )
}

const checks = ['Renders the streak card', 'Increments on click', 'Persists between visits', 'Passes accessibility audit']

function TestPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE }}
      className="flex-1 rounded-xl border border-line bg-surface/60 p-4"
    >
      <p className="eyebrow mb-3 flex items-center justify-between text-[0.58rem] text-white/35">
        Checks <span className="text-lav">4 passed</span>
      </p>
      <ul className="space-y-2">
        {checks.map((c, i) => (
          <li key={c} className="flex items-center gap-3 text-sm text-white/80">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.35 + i * 0.35, type: 'spring', stiffness: 500, damping: 18 }}
              className="grid size-5 shrink-0 place-items-center rounded-full bg-lav/20 text-lav"
            >
              <Check className="size-3" />
            </motion.span>
            <motion.span initial={{ opacity: 0.2 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.35 }}>
              {c}
            </motion.span>
          </li>
        ))}
      </ul>
    </motion.div>
  )
}

function ShipScene() {
  const [n, setN] = useState(7)
  return (
    <div className="relative grid h-full place-items-center overflow-hidden rounded-xl bg-[radial-gradient(circle_at_50%_40%,rgba(118,85,216,0.15),var(--theme-ink)_70%)] p-4">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute size-40 rounded-full border border-lav/40"
          initial={{ scale: 0.4, opacity: 0.8 }}
          animate={{ scale: 2.4, opacity: 0 }}
          transition={{ duration: 3, delay: i * 1, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
      <div className="relative w-[15rem] rounded-[1.3rem] border border-white/10 bg-gradient-to-b from-surface-2 to-surface p-6 text-center shadow-2xl">
        <p className="eyebrow text-[0.6rem] text-lav">Study streak</p>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.p
            key={n}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -24, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="text-7xl font-medium tracking-[-0.06em]"
          >
            {n}
          </motion.p>
        </AnimatePresence>
        <p className="mb-5 text-xs text-muted">days in a row</p>
        <button
          type="button"
          onClick={() => setN((v) => v + 1)}
          className="rounded-full bg-lav px-4 py-2.5 text-xs font-semibold text-ink transition hover:bg-lilac active:scale-95"
        >
          Log today&apos;s session
        </button>
      </div>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-lav/30 bg-ink/80 px-3.5 py-1.5 font-mono text-[0.62rem] text-lilac backdrop-blur"
      >
        <Rocket className="size-3" /> Deployed · study-streak.demo.studytech.dev
      </motion.p>
    </div>
  )
}


