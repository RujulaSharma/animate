export type Vec3 = [number, number, number]

const PALETTE: Vec3[] = [
  [0.655, 0.545, 0.98], // A78BFA lavender
  [0.463, 0.333, 0.847], // 7655D8 violet
  [0.867, 0.816, 1.0], // DDD0FF light lavender
  [1, 1, 1], // white
]

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type PointCloud = {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  seeds: Float32Array
  clusters: Float32Array
  count: number
}

class Builder {
  positions: number[] = []
  colors: number[] = []
  sizes: number[] = []
  seeds: number[] = []
  clusters: number[] = []

  add(p: Vec3, color: Vec3, size: number, seed: number, cluster = -1) {
    this.positions.push(p[0], p[1], p[2])
    this.colors.push(color[0], color[1], color[2])
    this.sizes.push(size)
    this.seeds.push(seed)
    this.clusters.push(cluster)
  }

  build(): PointCloud {
    return {
      positions: new Float32Array(this.positions),
      colors: new Float32Array(this.colors),
      sizes: new Float32Array(this.sizes),
      seeds: new Float32Array(this.seeds),
      clusters: new Float32Array(this.clusters),
      count: this.sizes.length,
    }
  }
}

function pick(rng: () => number, weights = [0.5, 0.2, 0.2, 0.1]): Vec3 {
  let r = rng()
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r <= 0) return PALETTE[i]
  }
  return PALETTE[0]
}

/** Six destination anchors, loosely octahedral so every face of the orb has a landmark. */
export const CENTERS: Vec3[] = (
  [
    [1, 0.22, 0.05],
    [-1, -0.18, 0.2],
    [0.08, 1, 0.12],
    [-0.05, -1, -0.12],
    [0.25, 0.1, 1],
    [-0.2, 0.05, -1],
  ] as Vec3[]
).map((v) => {
  const l = Math.hypot(...v)
  return [(v[0] / l) * 2.65, (v[1] / l) * 2.65, (v[2] / l) * 2.65] as Vec3
})

/** Core sculpted sphere + sparse dust. */
export function buildCore(density: number): PointCloud {
  const rng = mulberry32(7)
  const b = new Builder()
  const n = Math.round(2600 * density)
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = golden * i
    const lat = Math.asin(y)
    // sculpted ridges: latitudinal bands plus a meridian swell
    const ridge = Math.sin(lat * 11) * 0.06 + Math.sin(theta * 3 + lat * 2) * 0.05
    const radius = 1.5 + ridge + (rng() - 0.5) * 0.05
    // carve occasional voids so the orb reads as constellation, not mesh
    if (Math.sin(theta * 5 + lat * 7) > 0.86 && rng() > 0.35) continue
    const p: Vec3 = [Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius]
    b.add(p, pick(rng, [0.18, 0.48, 0.24, 0.1]), 0.04 + rng() * 0.04, rng())
  }
  const dust = Math.round(520 * density)
  for (let i = 0; i < dust; i++) {
    const u = rng() * 2 - 1
    const t = rng() * Math.PI * 2
    const rr = 3.5 + rng() * 2.6
    const s = Math.sqrt(1 - u * u)
    b.add([Math.cos(t) * s * rr, u * rr * 0.8, Math.sin(t) * s * rr], pick(rng, [0.28, 0.24, 0.34, 0.14]), 0.022 + rng() * 0.024, rng())
  }
  return b.build()
}

/** Three tilted orbital rings made of dotted arcs. */
export function buildRings(density: number): PointCloud[] {
  const rng = mulberry32(21)
  const defs = [
    { radius: 2.05, tiltX: 1.15, tiltZ: 0.2, n: 520, gap: 0.0 },
    { radius: 2.4, tiltX: 0.4, tiltZ: -0.9, n: 600, gap: 0.0 },
    { radius: 3.05, tiltX: 1.45, tiltZ: 0.75, n: 700, gap: 0.0 },
  ]
  return defs.map((d) => {
    const b = new Builder()
    const n = Math.round(d.n * density)
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      // dashed arcs: fade points inside gaps
      if (Math.sin(a * 6 + d.radius * 4) > 0.55) continue
      const jitter = (rng() - 0.5) * 0.05
      let x = Math.cos(a) * (d.radius + jitter)
      let y = (rng() - 0.5) * 0.03
      let z = Math.sin(a) * (d.radius + jitter)
      // tilt X
      const cx = Math.cos(d.tiltX)
      const sx = Math.sin(d.tiltX)
      const y1 = y * cx - z * sx
      const z1 = y * sx + z * cx
      // tilt Z
      const cz = Math.cos(d.tiltZ)
      const sz = Math.sin(d.tiltZ)
      const x2 = x * cz - y1 * sz
      const y2 = x * sz + y1 * cz
      x = x2
      y = y2
      z = z1
      b.add([x, y, z], pick(rng, [0.34, 0.2, 0.3, 0.16]), 0.02 + rng() * 0.02, rng())
    }
    return b.build()
  })
}

type ShapeFn = (rng: () => number) => Vec3

const shapes: ShapeFn[] = [
  // courses: stacked layers
  (rng) => {
    const layer = Math.floor(rng() * 4)
    const a = rng() * Math.PI * 2
    const r = Math.sqrt(rng()) * (0.55 - layer * 0.04)
    return [Math.cos(a) * r, (layer - 1.5) * 0.19, Math.sin(a) * r]
  },
  // projects: cube lattice surface
  (rng) => {
    const axis = Math.floor(rng() * 3)
    const side = rng() > 0.5 ? 0.4 : -0.4
    const q = (): number => Math.round((rng() * 2 - 1) * 2) * 0.2
    const p: Vec3 = [q(), q(), q()]
    p[axis] = side
    return p
  },
  // community: two interlinked rings
  (rng) => {
    const a = rng() * Math.PI * 2
    const ring = rng() > 0.5
    const r = 0.38
    return ring ? [Math.cos(a) * r - 0.2, Math.sin(a) * r, 0] : [Math.cos(a) * r + 0.2, 0, Math.sin(a) * r]
  },
  // codespace: chevron brackets < / >
  (rng) => {
    const part = Math.floor(rng() * 3)
    const t = rng()
    if (part === 0) return [-0.45 + (t < 0.5 ? t : 1 - t) * 0.5, (t - 0.5) * 0.9, 0.0]
    if (part === 1) return [0.45 - (t < 0.5 ? t : 1 - t) * 0.5, (t - 0.5) * 0.9, 0.0]
    return [(t - 0.5) * 0.24, (0.5 - t) * 0.9, 0.0]
  },
  // hackathons: radial burst
  (rng) => {
    const rays = 11
    const k = Math.floor(rng() * rays)
    const a = (k / rays) * Math.PI * 2
    const el = Math.sin(k * 2.3) * 0.9
    const len = 0.12 + rng() * (0.4 + (k % 3) * 0.12)
    return [Math.cos(a) * Math.cos(el) * len, Math.sin(el) * len, Math.sin(a) * Math.cos(el) * len]
  },
  // build: ascending helix
  (rng) => {
    const t = rng()
    const strand = rng() > 0.5 ? 0 : Math.PI
    const a = t * Math.PI * 4 + strand
    return [Math.cos(a) * 0.3, (t - 0.5) * 1.0, Math.sin(a) * 0.3]
  },
]

export function buildClusters(density: number): PointCloud {
  const rng = mulberry32(99)
  const b = new Builder()
  const n = Math.round(240 * density)
  CENTERS.forEach((c, id) => {
    for (let i = 0; i < n; i++) {
      const o = shapes[id](rng)
      const jitter = 0.02
      b.add(
        [c[0] + o[0] + (rng() - 0.5) * jitter, c[1] + o[1] + (rng() - 0.5) * jitter, c[2] + o[2] + (rng() - 0.5) * jitter],
        pick(rng, [0.35, 0.1, 0.3, 0.25]),
        0.03 + rng() * 0.03,
        rng(),
        id,
      )
    }
  })
  return b.build()
}

/** Pairs of vertices for connective line segments. */
export function buildLines(): Float32Array {
  const pts: number[] = []
  const origin: Vec3 = [0, 0, 0]
  CENTERS.forEach((c) => pts.push(...origin, ...c))
  for (let i = 0; i < CENTERS.length; i++) {
    for (let j = i + 1; j < CENTERS.length; j++) {
      const a = CENTERS[i]
      const bb = CENTERS[j]
      const d = Math.hypot(a[0] - bb[0], a[1] - bb[1], a[2] - bb[2])
      if (d < 4.3) pts.push(...a, ...bb)
    }
  }
  return new Float32Array(pts)
}
