'use client'

import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { BookOpen, Hammer, LayoutGrid, Terminal, Trophy, Users, ArrowUpRight } from 'lucide-react'
import { destinations } from '@/lib/data'
import { scrollToId } from '@/lib/scroll'
import { CENTERS, buildClusters, buildCore, buildLines, buildRings, type PointCloud } from '@/lib/universe'
import { cn } from '@/lib/utils'
import { StandaloneOrb } from './standalone-orb'
import { SaturnOrbit } from './saturn-orbit'
import { useLightTheme } from './theme-toggle'

const ICONS = [BookOpen, LayoutGrid, Users, Terminal, Trophy, Hammer]
const CAMERA_Z = 10
const FOV = 40

type Projection = { x: number; y: number; depth: number }

type Control = {
  pointer: { nx: number; ny: number; px: number; py: number; inside: boolean; type: string }
  drag: { active: boolean; lastX: number; lastY: number; dist: number }
  vel: { x: number; y: number }
  rot: { x: number; y: number }
  hoverId: number | null
  forced: number | null
  reduced: boolean
  width: number
  height: number
}

const vertexShader = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aSeed;
  attribute float aCluster;
  uniform float uTime;
  uniform float uPx;
  uniform float uScale;
  uniform float uAny;
  uniform float uAlpha;
  uniform float uLight;
  uniform float uHot[6];
  uniform vec3 uCenters[6];
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    float hot = 0.0;
    float t = uTime * 0.5 + aSeed * 6.2831;
    bool inCluster = aCluster > -0.5;

    if (inCluster) {
      int id = int(aCluster + 0.5);
      hot = uHot[id];
      vec3 c = uCenters[id];
      p += (position - c) * hot * (0.85 + aSeed * 0.9) * mix(1.0, 0.16, uLight);
      p += normalize(position) * sin(t) * 0.014;
      p.y += sin(t * 1.3) * 0.012;
    } else {
      p += normalize(position) * sin(uTime * 0.7 + position.y * 2.2 + aSeed * 6.0) * 0.035;
    }

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float depthF = clamp((13.6 + mv.z) / 6.8, 0.0, 1.0);
    float twinkle = 0.75 + 0.25 * sin(t * 2.0);
    float size = aSize * (1.0 + hot * 1.1) * (0.85 + 0.3 * twinkle);
    gl_PointSize = size * uPx * uScale / max(-mv.z, 0.1);
    gl_PointSize = mix(gl_PointSize, min(gl_PointSize, 2.3 * uPx), uLight);

    vColor = mix(aColor, vec3(1.0), hot * 0.55);
    vColor = mix(vColor, mix(vec3(.30, .12, .52), vec3(.47, .27, .67), hot), uLight);
    float dim = inCluster ? (1.0 - uAny * (1.0 - hot) * 0.6) : (1.0 - uAny * 0.5);
    vAlpha = uAlpha * mix(0.26, 1.0, depthF) * dim * (0.65 + 0.35 * twinkle) * (1.0 + hot * 0.9);
    vAlpha = mix(vAlpha, min(vAlpha, .62), uLight);
  }
`

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.05, d);
    gl_FragColor = vec4(vColor, a * a * vAlpha);
  }
`

function cloudGeometry(cloud: PointCloud) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(cloud.positions, 3))
  g.setAttribute('aColor', new THREE.BufferAttribute(cloud.colors, 3))
  g.setAttribute('aSize', new THREE.BufferAttribute(cloud.sizes, 1))
  g.setAttribute('aSeed', new THREE.BufferAttribute(cloud.seeds, 1))
  g.setAttribute('aCluster', new THREE.BufferAttribute(cloud.clusters, 1))
  return g
}

type SceneProps = {
  ctl: React.MutableRefObject<Control>
  variant: 'hero' | 'ambient'
  density: number
  wrapRef: React.RefObject<HTMLDivElement | null>
  onHover: (id: number | null) => void
  onProject: (p: Projection[]) => void
  orbMode: 'orb' | 'word' | 'clusters'
}

function Scene({ ctl, variant, density, wrapRef, onHover, onProject, orbMode }: SceneProps) {
  const lightTheme = useLightTheme()
  const { camera, size } = useThree()
  const group = useRef<THREE.Group>(null)
  const ringGroup = useRef<THREE.Group>(null)
  const orbGroup = useRef<THREE.Group>(null)
  const saturnGroup = useRef<THREE.Group>(null)
  const hero = variant === 'hero'

  const { material, geometries, lineGeo } = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPx: { value: 1 },
        uScale: { value: 800 },
        uAny: { value: 0 },
        uAlpha: { value: hero ? 0.7 : 0.65 },
        uLight: { value: 0 },
        uHot: { value: [0, 0, 0, 0, 0, 0] },
        uCenters: { value: CENTERS.map((c) => new THREE.Vector3(...c)) },
      },
    })
    const core = cloudGeometry(buildCore(density))
    // Keep the existing outer dust; replace only the old central sphere.
    const dustCount = Math.round(520 * density)
    core.setDrawRange(core.getAttribute('position').count - dustCount, dustCount)
    const rings = buildRings(density).map(cloudGeometry)
    const clusters = cloudGeometry(buildClusters(density))
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.BufferAttribute(buildLines(), 3))
    return { material, geometries: { core, rings, clusters }, lineGeo }
  }, [density, hero])

  useEffect(
    () => () => {
      material.dispose()
      geometries.core.dispose()
      geometries.clusters.dispose()
      geometries.rings.forEach((g) => g.dispose())
      lineGeo.dispose()
    },
    [material, geometries, lineGeo],
  )

  const lineMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color('#6d4dcc'),
        transparent: true,
        opacity: hero ? 0.065 : 0.05,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [hero],
  )
  useEffect(() => () => lineMaterial.dispose(), [lineMaterial])
  useEffect(() => {
    material.uniforms.uLight.value = lightTheme ? 1 : 0
    material.uniforms.uAlpha.value = lightTheme ? 0.8 : (hero ? 0.7 : 0.65)
    material.blending = lightTheme ? THREE.NormalBlending : THREE.AdditiveBlending
    material.needsUpdate = true
    lineMaterial.blending = lightTheme ? THREE.NormalBlending : THREE.AdditiveBlending
    lineMaterial.opacity = lightTheme ? 0.055 : 0.065
    lineMaterial.needsUpdate = true
  }, [lightTheme, material, lineMaterial, hero])

  const temp = useMemo(() => new THREE.Vector3(), [])
  const hot = useRef<number[]>([0, 0, 0, 0, 0, 0])
  const any = useRef(0)
  const proj = useRef<Projection[]>(CENTERS.map(() => ({ x: 0, y: 0, depth: 1 })))
  const parallax = useRef({ yaw: 0, pitch: 0 })
  const lastHover = useRef<number | null>(null)

  useFrame((state, rawDelta) => {
    const g = group.current
    if (!g) return
    const c = ctl.current
    const dt = Math.min(rawDelta, 0.05)
    const k = dt * 60
    const t = state.clock.elapsedTime

    // size & uniforms
    c.width = size.width
    c.height = size.height
    material.uniforms.uTime.value = c.reduced ? 0 : t
    material.uniforms.uPx.value = state.gl.getPixelRatio()
    material.uniforms.uScale.value = size.height / (2 * Math.tan((FOV * Math.PI) / 360))

    // hover detection from projected anchors
    const nearestId = (() => {
      if (!hero) return null
      const p = c.pointer
      if (!p.inside || c.drag.active || p.type === 'touch') return null
      let best = Infinity
      let id: number | null = null
      const radius = Math.max(40, Math.min(70, size.width * 0.085))
      proj.current.forEach((pr, i) => {
        const d = Math.hypot(pr.x - p.px, pr.y - p.py)
        if (d < radius && d < best) {
          best = d
          id = i
        }
      })
      return id
    })()
    if (nearestId !== c.hoverId) c.hoverId = nearestId
    if (c.hoverId !== lastHover.current) {
      lastHover.current = c.hoverId
      onHover(c.hoverId)
    }

    // hot / dim easing
    const activeId = c.hoverId ?? c.forced
    let target = 0
    for (let i = 0; i < 6; i++) {
      const to = activeId === i ? 1 : 0
      hot.current[i] += (to - hot.current[i]) * (1 - Math.exp(-dt * 6))
      material.uniforms.uHot.value[i] = hot.current[i]
      target = Math.max(target, hot.current[i])
    }
    any.current += ((activeId !== null ? 1 : 0) - any.current) * (1 - Math.exp(-dt * 5))
    material.uniforms.uAny.value = any.current

    // rotation: idle drift + drag momentum + parallax
    const rot = c.rot
    const idle = c.reduced ? 0 : 0.11 * (1 - any.current * 0.85)
    if (!c.drag.active) {
      rot.y += c.vel.y * k
      rot.x += c.vel.x * k
      const damp = Math.pow(0.935, k)
      c.vel.x *= damp
      c.vel.y *= damp
      rot.y += idle * dt
      rot.x += (0.28 - rot.x) * (1 - Math.exp(-dt * 0.9))
    }
    rot.x = Math.max(-1.2, Math.min(1.2, rot.x))

    let scrollYaw = 0
    let lift = 0
    let scaleMul = 1
    if (hero) {
      const s = Math.min(window.scrollY / window.innerHeight, 1.3)
      scrollYaw = s * 1.3
      lift = s * 0.9
      scaleMul = 1 - s * 0.12
      if (!c.reduced) {
        const px = c.pointer.inside ? c.pointer.nx : 0
        const py = c.pointer.inside ? c.pointer.ny : 0
        const lerp = 1 - Math.exp(-dt * 3)
        parallax.current.yaw += (px * 0.32 - parallax.current.yaw) * lerp
        parallax.current.pitch += (py * 0.18 - parallax.current.pitch) * lerp
      }
    } else {
      const el = wrapRef.current
      if (el) {
        const r = el.getBoundingClientRect()
        const p = Math.max(0, Math.min(1, 1 - r.top / window.innerHeight))
        scrollYaw = p * 2.4
        scaleMul = 0.62 + p * 0.5
      }
    }

    const vh = 2 * CAMERA_Z * Math.tan((FOV * Math.PI) / 360)
    const vw = vh * (size.width / size.height)
    const fit = Math.min(vw / 7.4, vh / 7.4, 1.15)
    const s = fit * scaleMul
    // Use the extra desktop width without stretching the central sphere.
    const desktopExpansion = Math.max(0, Math.min(1, (size.width - 900) / 400))
    g.scale.set(s * (1 + desktopExpansion * 0.2), s * (1 + desktopExpansion * 0.04), s)
    g.position.y = lift
    if (saturnGroup.current) {
      saturnGroup.current.scale.setScalar(s)
      saturnGroup.current.position.y = lift - 2.35 * s
    }
    if (orbGroup.current) {
      orbGroup.current.scale.setScalar(s * (1.75 / 2.08) * (1 + desktopExpansion * 0.25))
      orbGroup.current.position.y = lift
    }
    g.rotation.order = 'YXZ'
    g.rotation.set(rot.x + parallax.current.pitch, rot.y + parallax.current.yaw + scrollYaw, scrollYaw * 0.12)
    g.updateMatrixWorld(true)

    if (ringGroup.current && !c.reduced) {
      ringGroup.current.rotation.y = t * 0.12
      ringGroup.current.rotation.z = Math.sin(t * 0.2) * 0.08
    }

    // project anchors to CSS pixels for labels / hover / preview
    for (let i = 0; i < 6; i++) {
      temp.set(...CENTERS[i]).applyMatrix4(g.matrixWorld).project(camera)
      const pr = proj.current[i]
      pr.x = (temp.x * 0.5 + 0.5) * size.width
      pr.y = (-temp.y * 0.5 + 0.5) * size.height
      pr.depth = temp.z
    }
    if (hero) onProject(proj.current)
  })

  return (
    <>
    <group ref={saturnGroup}>
      <SaturnOrbit reduced={ctl} />
    </group>
    <group ref={orbGroup}>
      <StandaloneOrb count={density < 1 ? 14000 : 29000} mode={orbMode} control={ctl} transformRef={orbGroup} />
    </group>
    <group ref={group}>
      <points geometry={geometries.core} material={material} frustumCulled={false} />
      <group ref={ringGroup}>
        {geometries.rings.map((g, i) => (
          <points key={i} geometry={g} material={material} frustumCulled={false} />
        ))}
      </group>
      <points geometry={geometries.clusters} material={material} frustumCulled={false} />
      <lineSegments geometry={lineGeo} material={lineMaterial} frustumCulled={false} />
    </group>
    </>
  )
}

class Boundary extends Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function Fallback({ interactive }: { interactive: boolean }) {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="absolute size-[60%] rounded-full bg-[radial-gradient(circle,rgba(118,85,216,0.35),transparent_65%)]" />
      {interactive && (
        <ul className="relative grid grid-cols-2 gap-2 p-6 sm:grid-cols-3">
          {destinations.map((d, i) => {
            const Icon = ICONS[i]
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => scrollToId(d.id)}
                  className="flex w-full items-center gap-2 rounded-full border border-line bg-surface/70 px-4 py-2.5 text-sm text-white transition hover:border-lav"
                >
                  <Icon className="size-4 text-lav" />
                  {d.label}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

type Props = { variant?: 'hero' | 'ambient'; className?: string }

export default function ParticleUniverse({ variant = 'hero', className }: Props) {
  const lightTheme = useLightTheme()
  const hero = variant === 'hero'
  const wrapRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const labelEls = useRef<(HTMLButtonElement | null)[]>([])
  const ctl = useRef<Control>({
    pointer: { nx: 0, ny: 0, px: 0, py: 0, inside: false, type: 'mouse' },
    drag: { active: false, lastX: 0, lastY: 0, dist: 0 },
    vel: { x: 0, y: 0 },
    rot: { x: 0.28, y: -0.6 },
    hoverId: null,
    forced: null,
    reduced: false,
    width: 0,
    height: 0,
  })

  const [supported, setSupported] = useState<boolean | null>(null)
  const [visible, setVisible] = useState(true)
  const [ready, setReady] = useState(false)
  const [hover, setHover] = useState<number | null>(null)
  const [focused, setFocused] = useState<number | null>(null)
  const [tapped, setTapped] = useState<number | null>(null)
  const [density, setDensity] = useState(1)
  const [orbMode, setOrbMode] = useState<'orb' | 'word' | 'clusters'>('orb')
  const orbReset = useRef<ReturnType<typeof setTimeout> | null>(null)
  const orbClick = useRef<ReturnType<typeof setTimeout> | null>(null)
  const orbLastTap = useRef(0)
  useEffect(() => () => {
    if (orbReset.current) clearTimeout(orbReset.current)
    if (orbClick.current) clearTimeout(orbClick.current)
  }, [])
  const transformOrb = () => {
    if (orbReset.current) clearTimeout(orbReset.current)
    setOrbMode('word')
    orbReset.current = setTimeout(() => setOrbMode('orb'), ctl.current.reduced ? 1800 : 4600)
  }
  const lastShown = useRef(0)

  const active = hover ?? focused ?? tapped
  if (active !== null) lastShown.current = active

  useEffect(() => {
    ctl.current.forced = focused ?? tapped
  }, [focused, tapped])

  useEffect(() => {
    try {
      const c = document.createElement('canvas')
      setSupported(!!(c.getContext('webgl2') || c.getContext('webgl')))
    } catch {
      setSupported(false)
    }
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => (ctl.current.reduced = mq.matches)
    sync()
    mq.addEventListener('change', sync)
    setDensity(window.innerWidth < 768 ? 0.6 : 1)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '120px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const onProject = useCallback((proj: Projection[]) => {
    const c = ctl.current
    const w = c.width
    const h = c.height
    proj.forEach((p, i) => {
      const el = labelEls.current[i]
      if (!el) return
      el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`
      el.style.opacity = String(Math.max(0.35, Math.min(1, 1.35 - (p.depth + 1) * 0.7)))
    })
    const id = c.hoverId ?? c.forced
    const card = cardRef.current
    if (!card || id === null) return
    const p = proj[id]
    const cw = card.offsetWidth
    const ch = card.offsetHeight
    let left: number
    let top: number
    if (lightTheme) {
      left = (w - cw) / 2
      top = h - ch - 42
    } else if (w < 520) {
      left = (w - cw) / 2
      top = h - ch - 10
    } else {
      left = p.x > w * 0.58 ? p.x - 52 - cw : p.x + 52
      top = p.y - ch / 2
    }
    left = Math.max(8, Math.min(w - cw - 8, left))
    top = Math.max(8, Math.min(h - ch - 8, top))
    card.style.transform = `translate3d(${left}px, ${top}px, 0)`
  }, [lightTheme])

  const updatePointer = (e: React.PointerEvent) => {
    const r = wrapRef.current!.getBoundingClientRect()
    const p = ctl.current.pointer
    p.px = e.clientX - r.left
    p.py = e.clientY - r.top
    p.nx = (p.px / r.width) * 2 - 1
    p.ny = (p.py / r.height) * 2 - 1
    p.type = e.pointerType
    p.inside = true
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!hero) return
    if ((e.target as Element).closest('button')) {
      ctl.current.drag.dist = 0
      return
    }
    updatePointer(e)
    const d = ctl.current.drag
    d.active = true
    d.lastX = e.clientX
    d.lastY = e.clientY
    d.dist = 0
    ctl.current.vel.x = 0
    ctl.current.vel.y = 0
    wrapRef.current?.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!hero) return
    updatePointer(e)
    const d = ctl.current.drag
    if (!d.active) return
    const dx = e.clientX - d.lastX
    const dy = e.clientY - d.lastY
    d.lastX = e.clientX
    d.lastY = e.clientY
    d.dist += Math.abs(dx) + Math.abs(dy)
    const r = ctl.current.rot
    r.y += dx * 0.0065
    r.x += dy * 0.0065
    ctl.current.vel.y = dx * 0.0065 * 0.55 + ctl.current.vel.y * 0.45
    ctl.current.vel.x = dy * 0.0065 * 0.55 + ctl.current.vel.x * 0.45
  }

  const endDrag = (e: React.PointerEvent) => {
    const d = ctl.current.drag
    if (!d.active) return
    d.active = false
    if (wrapRef.current?.hasPointerCapture(e.pointerId)) wrapRef.current.releasePointerCapture(e.pointerId)
    if (d.dist < 6 && !(e.target as HTMLElement).closest('button')) setTapped(null)
    const c = ctl.current
    const desktopExpansion = Math.max(0, Math.min(1, (c.width - 900) / 400))
    const withinOrb = Math.hypot(c.pointer.px - c.width / 2, c.pointer.py - c.height / 2) < Math.min(c.width, c.height) * 0.22 * (1 + desktopExpansion * 0.25)
    if (e.type === 'pointerup' && d.dist < 6 && withinOrb && !(e.target as Element).closest('button')) {
      const now = performance.now()
      if (orbLastTap.current && now - orbLastTap.current < 310) {
        if (orbClick.current) clearTimeout(orbClick.current)
        if (orbReset.current) clearTimeout(orbReset.current)
        orbLastTap.current = 0
        setOrbMode((mode) => mode === 'clusters' ? 'orb' : 'clusters')
      } else {
        orbLastTap.current = now
        orbClick.current = setTimeout(() => {
          orbLastTap.current = 0
          transformOrb()
        }, 310)
      }
    }
  }

  const showCanvas = supported === true

  return (
    <div
      ref={wrapRef}
      data-orb-mode={orbMode}
      tabIndex={hero ? 0 : undefined}
      role={hero ? 'group' : undefined}
      aria-label={hero ? 'Interactive DevHarbour orb. Drag to rotate, click or press Enter to form the wordmark, C for clusters, Escape to reset.' : undefined}
      onKeyDown={(e) => {
        if (!hero || e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          transformOrb()
        } else if (e.key.toLowerCase() === 'c' || e.key === 'Escape') {
          if (orbReset.current) clearTimeout(orbReset.current)
          setOrbMode((mode) => e.key === 'Escape' || mode === 'clusters' ? 'orb' : 'clusters')
        }
      }}
      className={cn('relative select-none overflow-hidden', hero ? 'cursor-grab touch-pan-y active:cursor-grabbing' : 'pointer-events-none', className)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={() => {
        ctl.current.pointer.inside = false
      }}
    >
      {hero && <span className="sr-only" role="status">{orbMode === 'word' ? 'Particles forming DEVHARBOUR.' : orbMode === 'clusters' ? 'Orb particles forming clusters.' : 'DevHarbour particle sphere.'}</span>}
      {hero && (
        <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center [perspective:900px]">
          <div className="size-[94%] [transform:rotateX(74deg)_rotateZ(-14deg)]">
            <svg viewBox="0 0 800 800" className="size-full animate-spin-slow">
              <defs>
                <path id="orbit-path" d="M400 400 m-370 0 a370 370 0 1 1 740 0 a370 370 0 1 1 -740 0" />
              </defs>
              <circle cx="400" cy="400" r="370" fill="none" stroke="rgba(167,139,250,0.22)" strokeWidth="1" strokeDasharray="2 10" />
              <text className="fill-lilac/70 font-mono" fontSize="17" letterSpacing="9">
                <textPath href="#orbit-path" textLength="2300" lengthAdjust="spacing">
                  LEARN · BUILD · COMPETE · CONNECT · LEARN · BUILD · COMPETE · CONNECT ·
                </textPath>
              </text>
            </svg>
          </div>
        </div>
      )}

      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(118,85,216,0.08),transparent_50%)]" />

      {showCanvas && (
        <Boundary fallback={<Fallback interactive={hero} />}>
          <div className={cn('absolute inset-0 transition-opacity duration-1000', ready ? 'opacity-100' : 'opacity-0')}>
            <Canvas
              dpr={[1, 1.75]}
              frameloop={visible ? 'always' : 'never'}
              camera={{ position: [0, 0, CAMERA_Z], fov: FOV, near: 0.1, far: 50 }}
              gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
              onCreated={() => setReady(true)}
              aria-hidden
            >
              <Scene ctl={ctl} variant={variant} density={density} wrapRef={wrapRef} onHover={setHover} onProject={onProject} orbMode={orbMode} />
            </Canvas>
          </div>
        </Boundary>
      )}
      {supported === false && <Fallback interactive={hero} />}

      {hero && supported === true && (
        <>
          <ul className="absolute inset-0 m-0 list-none p-0">
            {destinations.map((d, i) => (
              <li key={d.id} className="contents">
                <button
                  ref={(el) => {
                    labelEls.current[i] = el
                  }}
                  type="button"
                  aria-label={`${d.label}: ${d.blurb}`}
                  onFocus={() => setFocused(i)}
                  onBlur={() => setFocused((f) => (f === i ? null : f))}
                  onClick={() => {
                    if (ctl.current.drag.dist > 8) return
                    const coarse = window.matchMedia('(pointer: coarse)').matches
                    if (coarse && tapped !== i) {
                      setTapped(i)
                      return
                    }
                    scrollToId(d.id)
                  }}
                  className="orb-node group/node absolute left-0 top-0 -ml-8 -mt-8 grid size-16 place-items-center rounded-full opacity-0 outline-offset-0 will-change-transform"
                >
                  <span
                    className={cn(
                      'eyebrow pointer-events-none absolute top-full -mt-1 whitespace-nowrap text-[0.62rem] transition-colors duration-300',
                      active === i ? 'text-white' : 'text-lilac/70',
                    )}
                  >
                    <span className="mr-1.5 text-lav">0{i + 1}</span>
                    {d.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div
            ref={cardRef}
            aria-hidden={active === null}
            className={cn(
              'orb-preview pointer-events-none absolute left-0 top-0 w-[15.5rem] rounded-2xl border border-white/12 bg-ink/80 p-4 shadow-[0_20px_60px_-20px_rgba(118,85,216,0.6)] backdrop-blur-md transition-[opacity,scale] duration-300 ease-[var(--ease-expo)] will-change-transform [@media(pointer:coarse)]:pointer-events-auto',
              active === null ? 'scale-95 opacity-0' : 'scale-100 opacity-100',
            )}
          >
            {(() => {
              const d = destinations[lastShown.current]
              const Icon = ICONS[lastShown.current]
              return (
                <>
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-lav/15 text-lav">
                      <Icon className="size-[18px]" />
                    </span>
                    <span className="eyebrow text-white">{d.label}</span>
                  </div>
                  <p className="mt-3 text-[0.8rem] leading-relaxed text-muted">{d.blurb}</p>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => scrollToId(d.id)}
                    className="mt-3 hidden items-center gap-1 text-xs font-medium text-lav [@media(pointer:coarse)]:inline-flex"
                  >
                    Go to {d.label}
                    <ArrowUpRight className="size-3.5" />
                  </button>
                  <span className="mt-3 block text-[0.68rem] text-white/40 [@media(pointer:coarse)]:hidden">Click to jump to section</span>
                </>
              )
            })()}
          </div>

          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-lilac/70 transition-opacity duration-300 z-10" aria-hidden>
            <div className="w-[18px] h-[28px] rounded-full border border-lilac/40 flex justify-center pt-1.5 shadow-[0_0_10px_rgba(167,139,250,0.25)]">
              <div className="w-1 h-2 rounded-full bg-lilac animate-bounce" />
            </div>
            <span className="text-[0.58rem] tracking-[0.25em] font-mono uppercase text-lilac/80">
              Scroll to Explore
            </span>
          </div>
        </>
      )}
    </div>
  )
}
