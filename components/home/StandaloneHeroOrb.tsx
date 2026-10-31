'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sun, Moon } from 'lucide-react'

// =========================================================================
// 1. Mathematical & Geographical Utilities (Digital Earth Continent Detection)
// =========================================================================
const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n))
const smooth = (t: number) => {
  t = clamp(t)
  return t * t * (3 - 2 * t)
}
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 31.7) * 43758.5453
  return x - Math.floor(x)
}

function pointInPoly(pt: [number, number], vs: [number, number][]) {
  const x = pt[0], y = pt[1]
  let inside = false
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1]
    const xj = vs[j][0], yj = vs[j][1]
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

// Global continent boundary polygons for Earth continent detection
const WORLD_CONTINENTS: [number, number][][] = [
  // North America
  [[-168,65],[-165,71],[-140,70],[-130,68],[-120,69],[-95,70],[-82,65],[-64,62],[-55,50],[-65,44],[-75,35],[-80,25],[-82,14],[-77,8],[-83,9],[-90,15],[-98,20],[-105,23],[-110,30],[-117,32],[-124,38],[-125,49],[-136,58],[-150,60],[-165,60]],
  // Greenland
  [[-55,60],[-40,60],[-20,70],[-18,78],[-30,83],[-50,82],[-60,76],[-55,60]],
  // South America
  [[-77,8],[-72,12],[-60,10],[-50,0],[-35,-5],[-38,-15],[-48,-28],[-58,-38],[-65,-50],[-70,-55],[-75,-50],[-72,-40],[-70,-20],[-80,-5],[-77,8]],
  // Europe
  [[-9,38],[-9,43],[0,46],[5,53],[10,54],[8,57],[15,56],[20,55],[25,60],[28,70],[35,68],[45,68],[60,60],[50,50],[40,45],[30,42],[24,37],[15,40],[14,45],[3,43],[-3,43],[-9,38]],
  // Scandinavia
  [[5,58],[10,65],[15,68],[25,71],[30,70],[25,65],[18,60],[12,57],[5,58]],
  // Africa
  [[-6,36],[10,37],[25,32],[32,31],[35,25],[43,12],[51,11],[45,-12],[35,-25],[28,-34],[18,-34],[12,-15],[9,5],[-5,5],[-17,14],[-17,28],[-6,36]],
  // Asia
  [[35,35],[45,40],[50,30],[55,25],[60,25],[68,24],[73,18],[78,8],[82,15],[90,22],[100,14],[105,10],[108,22],[120,32],[120,38],[130,42],[140,54],[150,59],[160,56],[170,60],[180,65],[170,68],[140,73],[120,74],[100,76],[80,73],[60,70],[45,68],[35,35]],
  // India
  [[68,24],[73,18],[78,8],[82,15],[90,22],[88,26],[78,30],[70,28],[68,24]],
  // Australia
  [[114,-22],[118,-35],[135,-35],[145,-38],[150,-35],[153,-28],[148,-19],[142,-11],[136,-12],[130,-14],[125,-15],[115,-20],[114,-22]],
  // Japan
  [[130,32],[132,34],[137,35],[141,38],[141,43],[145,44],[142,40],[136,35],[130,32]],
  // Great Britain
  [[-5,50],[2,51],[0,53],[-1,58],[-3,58],[-5,55],[-5,50]]
]

function isWorldLand(lon: number, lat: number) {
  for (let i = 0; i < WORLD_CONTINENTS.length; i++) {
    if (pointInPoly([lon, lat], WORLD_CONTINENTS[i])) return true
  }
  return false
}

/**
 * Samples text glyphs from a 2D offscreen canvas into 3D points
 */
function textCloud(word: string, count: number, { spread = 3.35 } = {}) {
  if (typeof document === 'undefined') return new Float32Array(count * 3)
  const canvas = document.createElement('canvas')
  canvas.width = 1600
  canvas.height = 260
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return new Float32Array(count * 3)

  ctx.font = '700 205px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff'
  ctx.fillText(word, 800, 130, 1510)

  const pixels = ctx.getImageData(0, 0, 1600, 260).data
  const samples: [number, number][] = []
  for (let y = 0; y < 260; y += 3) {
    for (let x = 0; x < 1600; x += 3) {
      if (pixels[(y * 1600 + x) * 4 + 3] > 180) samples.push([x, y])
    }
  }

  const result = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const sample = samples.length > 0 ? samples[Math.min(samples.length - 1, Math.floor(((i + hash(i)) / count) * samples.length))] : [800, 130]
    const [x, y] = sample
    result[i * 3] = (x / 1600 - 0.5) * spread
    result[i * 3 + 1] = -(y / 1600 - (0.5 * 260) / 1600) * spread
    result[i * 3 + 2] = (hash(i + 87) - 0.5) * 0.075
  }
  return result
}

/**
 * Generates digital Earth sphere coordinates, clusters, and colors
 */
function createParticleData(count: number) {
  const sphere = new Float32Array(count * 3)
  const clusters = new Float32Array(count * 3)
  const random = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const land = new Float32Array(count)
  const centers = [
    [-1.65, 0, 0],
    [0, 0.35, 0],
    [1.65, 0, 0],
  ]

  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * (i + 0.5)) / count
    const a = i * 2.39996323
    const ring = Math.sqrt(Math.max(0, 1 - y * y))

    const lat = (Math.asin(clamp(y, -1, 1)) * 180) / Math.PI
    const lon = (((a % (2 * Math.PI)) - Math.PI) * 180) / Math.PI

    const onLand = isWorldLand(lon, lat)
    land[i] = onLand ? 1.0 : 0.0

    const dust = hash(i + 17) > 0.93
    const baseR = 2.08 + (onLand ? 0.015 : 0.0)
    const r = baseR + (hash(i + 3) - 0.5) * 0.035 + (dust ? 0.1 + hash(i + 61) * 0.3 : 0)
    const o = i * 3
    const c = centers[i % 3]

    sphere[o] = Math.cos(a) * ring * r
    sphere[o + 1] = y * r
    sphere[o + 2] = Math.sin(a) * ring * r

    const cr = Math.cbrt(hash(i + 41)) * 0.65
    clusters[o] = c[0] + Math.cos(a) * ring * cr
    clusters[o + 1] = c[1] + y * cr
    clusters[o + 2] = Math.sin(a) * ring * cr

    for (let j = 0; j < 3; j++) random[o + j] = (hash(i + j * 37 + 79) - 0.5) * 9

    const tone = hash(i + 100)
    if (onLand) {
      if (tone > 0.65) {
        colors[o] = 0.96; colors[o + 1] = 0.95; colors[o + 2] = 1.0
      } else {
        colors[o] = 0.76; colors[o + 1] = 0.58; colors[o + 2] = 1.0
      }
    } else {
      if (tone > 0.88) {
        colors[o] = 0.62; colors[o + 1] = 0.44; colors[o + 2] = 0.95
      } else {
        colors[o] = 0.32; colors[o + 1] = 0.16; colors[o + 2] = 0.68
      }
    }
  }
  return { sphere, clusters, random, colors, land }
}

// =========================================================================
// 2. Custom GLSL Shaders (Digital Earth Corona & Shimmer)
// =========================================================================
const orbVertexShader = `
attribute vec3 color;
attribute float aSeed;
attribute float aText;
attribute float aLand;
uniform float uTime;
uniform float uDpr;
uniform float uHover;
uniform float uOrb;
uniform float uLight;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec3 p = position;
  vec3 n = normalize(p + vec3(.0001));
  float shell = (1. - aText) * uOrb;

  float wave = sin(p.y * 4.5 + p.x * 1.7 - uTime * .65)
             * sin(p.z * 3.4 - p.y * 1.3 + uTime * .42);
  float fine = sin(p.x * 11. + p.z * 7. + uTime * .8) * .012;
  p += n * (wave * .055 + fine) * shell;
  p.x += sin(p.y * 3. + uTime * .38) * .024 * shell;
  p.z += cos(p.y * 4. - uTime * .32) * .022 * shell;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec3 viewDir = normalize(vec3(0., 0., 6.6) - p);

  float rim = pow(1. - abs(dot(n, viewDir)), 1.8);
  float key = pow(max(0., dot(n, normalize(vec3(-.85, .85, 1.0)))), 2.);
  float front = smoothstep(-.8, 1.4, p.z);
  float light = .12 + key * 1.1 + rim * .95;

  float shimmer = .84 + .16 * sin(uTime * (1.2 + uHover * aText * 6. + aLand * 2.2) + aSeed * 75.);

  vec3 deepViolet = vec3(.24, .10, .58);
  vec3 midLilac   = vec3(.62, .38, 1.00);
  vec3 coreWhite  = vec3(.96, .94, 1.00);
  float blend = clamp(key * 1.15 + rim * .9, 0., 1.);
  vec3 shellColor = mix(deepViolet, mix(midLilac, coreWhite, blend), blend);

  vec3 landColor = mix(color, coreWhite, 0.45 * key + 0.35 * rim);
  vec3 finalOrbColor = mix(shellColor, landColor, aLand * 0.75);

  vColor = mix(mix(color, finalOrbColor, uOrb) * mix(1.2, light * 1.6, uOrb), color * (1.6 + uHover * .65), aText) * shimmer;
  vAlpha = mix(mix(.68, (.15 + front * .65) * (.42 + rim * .8 + key * .85), uOrb), .97, aText);
  vAlpha = mix(vAlpha, min(1.0, vAlpha * 1.35), aLand * uOrb);

  vec3 ink = mix(vec3(.16, .055, .31), vec3(.42, .20, .65), key * .65 + rim * .35);
  vColor = mix(vColor, mix(ink, vec3(.20, .07, .36), aText) * shimmer, uLight);
  float inkAlpha = mix((.18 + front * .63 + rim * .25), 1.0, aText);
  vAlpha = mix(vAlpha, inkAlpha, uLight);

  float baseSize = aText > .5 ? 2.5 : (mix(1.2, 2.2, aLand) + aSeed * 1.6);
  gl_PointSize = clamp(baseSize * uDpr * 8.0 / -mv.z, 0.8, 9. * uDpr);
  gl_Position = projectionMatrix * mv;
}
`

const orbFragmentShader = `
uniform float uLight;
varying vec3 vColor;
varying float vAlpha;

void main() {
  float r = length(gl_PointCoord - .5) * 2.;
  if (r > 1.) discard;
  float core = exp(-r * r * mix(11., 5.5, uLight));
  float halo = exp(-r * r * 2.2) * mix(.30, .06, uLight);
  float flare = exp(-r * r * 50.) * mix(.22, 0., uLight);
  gl_FragColor = vec4(vColor, (core + halo + flare) * vAlpha);
}
`

// =========================================================================
// 3. Types
// =========================================================================
type OrbControlState = {
  pointer: { nx: number; ny: number; px: number; py: number; inside: boolean }
  drag: { active: boolean; dx: number; dy: number }
  reduced: boolean
}

// =========================================================================
// 4. Delicate 3D Orbital Wireframe Rings Wrapping the Globe
// =========================================================================
function GlobeOrbitalRings({ lightTheme, uOrbRef }: { lightTheme: boolean; uOrbRef: React.MutableRefObject<number> }) {
  const orbitConfigs = useMemo(() => [
    { tilt: [0.55, 0.35, 0.25] as [number, number, number],   radius: 2.38 },
    { tilt: [-0.95, -0.45, 0.65] as [number, number, number],  radius: 2.52 },
    { tilt: [1.25, 0.20, -0.55] as [number, number, number],   radius: 2.65 },
    { tilt: [-0.35, 1.30, 0.40] as [number, number, number],   radius: 2.48 },
    { tilt: [0.70, -0.85, 1.15] as [number, number, number],   radius: 2.42 },
  ], [])

  const lineGeometries = useMemo(() => {
    return orbitConfigs.map((cfg) => {
      const segs = 180
      const pos: number[] = []
      for (let i = 0; i < segs; i++) {
        const a1 = (i / segs) * Math.PI * 2
        const a2 = ((i + 1) / segs) * Math.PI * 2
        pos.push(Math.cos(a1) * cfg.radius, 0, Math.sin(a1) * cfg.radius)
        pos.push(Math.cos(a2) * cfg.radius, 0, Math.sin(a2) * cfg.radius)
      }
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3))
      return g
    })
  }, [orbitConfigs])

  const lineMaterial = useMemo(() => new THREE.LineBasicMaterial({
    color: new THREE.Color('#9366f8'),
    transparent: true,
    opacity: 0.24,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }), [])

  useEffect(() => () => {
    lineGeometries.forEach((g) => g.dispose())
    lineMaterial.dispose()
  }, [lineGeometries, lineMaterial])

  useFrame(() => {
    const orbVisibility = uOrbRef.current ?? 1
    lineMaterial.opacity = (lightTheme ? 0.10 : 0.24) * orbVisibility
    lineMaterial.blending = lightTheme ? THREE.NormalBlending : THREE.AdditiveBlending
    lineMaterial.color.set(lightTheme ? '#6236b5' : '#9366f8')
  })

  return (
    <group>
      {orbitConfigs.map((cfg, i) => (
        <group key={i} rotation={cfg.tilt}>
          <lineSegments geometry={lineGeometries[i]} material={lineMaterial} frustumCulled={false} />
        </group>
      ))}
    </group>
  )
}

// =========================================================================
// 5. Large Concentric Tilted Holographic Energy Platform (Below Globe)
// =========================================================================
function TiltedHolographicPlatform({ lightTheme }: { lightTheme: boolean }) {
  const elapsed = useRef(0)

  const ringConfigs = useMemo(() => [
    { r: 2.8, count: 480,  width: 1.35 },
    { r: 4.0, count: 640,  width: 1.40 },
    { r: 5.4, count: 800,  width: 1.45 },
    { r: 7.0, count: 960,  width: 1.50 },
    { r: 8.8, count: 1120, width: 1.55 },
    { r: 11.0,count: 1280, width: 1.60 },
  ], [])

  const { pointsGeo, linesGeo, reflectionGeo } = useMemo(() => {
    const pos: number[] = []
    const phases: number[] = []
    const seeds: number[] = []
    const sideGlows: number[] = []

    ringConfigs.forEach((cfg, ringIdx) => {
      for (let i = 0; i < cfg.count; i++) {
        const angle = (i / cfg.count) * Math.PI * 2
        const seed = Math.abs((Math.sin(i * 127.1 + ringIdx * 311.7) * 43758.5453) % 1)
        const jitter = (seed - 0.5) * 0.035
        const rad = cfg.r + jitter

        const x = Math.cos(angle) * rad * cfg.width
        const y = (seed - 0.5) * 0.02
        const z = Math.sin(angle) * rad

        pos.push(x, y, z)
        phases.push(angle + ringIdx * 0.8)
        seeds.push(seed)
        sideGlows.push(Math.pow(Math.abs(Math.cos(angle)), 4.0))
      }
    })

    for (let gx = -14; gx <= 14; gx += 0.65) {
      for (let gz = -9; gz <= 9; gz += 0.65) {
        const dist = Math.hypot(gx / 1.50, gz)
        if (dist < 2.5 || dist > 11.5) continue
        const seed = Math.abs((Math.sin(gx * 93.3 + gz * 419.7) * 43758.5453) % 1)
        if (seed > 0.30) continue

        const y = (seed - 0.5) * 0.02
        pos.push(gx, y, gz)
        const angle = Math.atan2(gz, gx)
        phases.push(angle)
        seeds.push(seed)
        sideGlows.push(Math.pow(Math.abs(Math.cos(angle)), 4.0) * (1.0 - dist / 12.0))
      }
    }

    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3))
    pGeo.setAttribute('aPhase', new THREE.BufferAttribute(new Float32Array(phases), 1))
    pGeo.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(seeds), 1))
    pGeo.setAttribute('aSide', new THREE.BufferAttribute(new Float32Array(sideGlows), 1))

    const linePositions: number[] = []
    ringConfigs.forEach((cfg) => {
      const segs = 180
      for (let i = 0; i < segs; i++) {
        const a1 = (i / segs) * Math.PI * 2
        const a2 = ((i + 1) / segs) * Math.PI * 2

        linePositions.push(
          Math.cos(a1) * cfg.r * cfg.width, 0, Math.sin(a1) * cfg.r,
          Math.cos(a2) * cfg.r * cfg.width, 0, Math.sin(a2) * cfg.r
        )
      }
    })

    const lGeo = new THREE.BufferGeometry()
    lGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePositions), 3))

    const refCount = 720
    const refPositions: number[] = []
    const refAlphas: number[] = []
    for (let i = 0; i < refCount; i++) {
      const angle = (i / refCount) * Math.PI * 2
      const s = Math.abs((Math.sin(i * 37.1) * 43758.5453) % 1)
      const rad = Math.sqrt(s) * 3.4
      refPositions.push(Math.cos(angle) * rad * 1.45, 0, Math.sin(angle) * rad)
      refAlphas.push(Math.max(0, 1.0 - rad / 3.4))
    }

    const rGeo = new THREE.BufferGeometry()
    rGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(refPositions), 3))
    rGeo.setAttribute('aRefAlpha', new THREE.BufferAttribute(new Float32Array(refAlphas), 1))

    return { pointsGeo: pGeo, linesGeo: lGeo, reflectionGeo: rGeo }
  }, [ringConfigs])

  const pointsMaterial = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uDpr: { value: 1 },
      uLight: { value: 0 },
    },
    vertexShader: `
      attribute float aPhase;
      attribute float aSeed;
      attribute float aSide;
      uniform float uTime;
      uniform float uDpr;
      varying float vGlow;
      varying float vAlpha;
      varying float vSide;

      void main() {
        float wave = 0.5 + 0.5 * cos(aPhase * 4.0 - uTime * 0.28);
        float pulse = pow(wave, 22.0);

        float sidePulse = pow(aSide, 1.3) * (0.55 + 0.45 * sin(uTime * 0.6 + aPhase * 2.0));
        vGlow = clamp(pulse + sidePulse * 0.8, 0.0, 1.0);
        vSide = aSide;
        vAlpha = 0.08 + aSeed * 0.12 + vGlow * 0.68 + sidePulse * 0.4;

        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;

        float baseSize = 0.8 + aSeed * 0.6 + vGlow * 4.2 + sidePulse * 3.8;
        gl_PointSize = clamp(baseSize * uDpr * 9.0 / -mv.z, 0.5, 11.0 * uDpr);
      }
    `,
    fragmentShader: `
      uniform float uLight;
      varying float vGlow;
      varying float vAlpha;
      varying float vSide;

      void main() {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        if (r > 1.0) discard;

        vec3 deep = vec3(0.32, 0.14, 0.72);
        vec3 lilac = vec3(0.68, 0.48, 1.00);
        vec3 white = vec3(0.96, 0.94, 1.00);
        vec3 col = mix(deep, mix(lilac, white, vGlow), vGlow);
        col = mix(col, white, vSide * vGlow * 0.75);

        vec3 ink = mix(vec3(0.24, 0.08, 0.46), vec3(0.55, 0.30, 0.78), vGlow);

        float core = exp(-r * r * 4.5);
        float flare = exp(-r * r * 50.0) * 0.28;
        gl_FragColor = vec4(mix(col, ink, uLight), (core + flare) * vAlpha);
      }
    `,
  }), [])

  const lineMaterial = useMemo(() => new THREE.LineBasicMaterial({
    color: new THREE.Color('#7c52f0'),
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }), [])

  const refMaterial = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uDpr: { value: 1 },
      uLight: { value: 0 },
    },
    vertexShader: `
      attribute float aRefAlpha;
      uniform float uTime;
      uniform float uDpr;
      varying float vAlpha;

      void main() {
        vAlpha = aRefAlpha * (0.35 + 0.1 * sin(uTime * 1.2 + position.x * 2.0));
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(2.5 * uDpr * 8.0 / -mv.z, 0.8, 6.0 * uDpr);
      }
    `,
    fragmentShader: `
      uniform float uLight;
      varying float vAlpha;

      void main() {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        if (r > 1.0) discard;
        vec3 col = mix(vec3(0.42, 0.18, 0.85), vec3(0.85, 0.75, 1.0), 0.4);
        vec3 ink = vec3(0.30, 0.12, 0.55);
        float alpha = exp(-r * r * 3.0) * vAlpha * 0.45;
        gl_FragColor = vec4(mix(col, ink, uLight), alpha);
      }
    `,
  }), [])

  useEffect(() => {
    pointsMaterial.uniforms.uLight.value = lightTheme ? 1 : 0
    pointsMaterial.blending = lightTheme ? THREE.NormalBlending : THREE.AdditiveBlending
    pointsMaterial.needsUpdate = true

    refMaterial.uniforms.uLight.value = lightTheme ? 1 : 0
    refMaterial.blending = lightTheme ? THREE.NormalBlending : THREE.AdditiveBlending
    refMaterial.needsUpdate = true

    lineMaterial.blending = lightTheme ? THREE.NormalBlending : THREE.AdditiveBlending
    lineMaterial.opacity = lightTheme ? 0.08 : 0.18
    lineMaterial.color.set(lightTheme ? '#4a2575' : '#7c52f0')
    lineMaterial.needsUpdate = true
  }, [lightTheme, pointsMaterial, refMaterial, lineMaterial])

  useEffect(() => () => {
    pointsGeo.dispose()
    linesGeo.dispose()
    reflectionGeo.dispose()
    pointsMaterial.dispose()
    refMaterial.dispose()
    lineMaterial.dispose()
  }, [pointsGeo, linesGeo, reflectionGeo, pointsMaterial, refMaterial, lineMaterial])

  useFrame(({ gl }, delta) => {
    elapsed.current += Math.min(delta, 0.05)
    pointsMaterial.uniforms.uTime.value = elapsed.current
    pointsMaterial.uniforms.uDpr.value = gl.getPixelRatio()
    refMaterial.uniforms.uTime.value = elapsed.current
    refMaterial.uniforms.uDpr.value = gl.getPixelRatio()
  })

  // Tilted at 0.42 rad (~24 deg) around X to form an open elliptical energy field
  return (
    <group rotation={[0.42, 0, -0.04]} position={[0, -2.35, 0]}>
      <lineSegments geometry={linesGeo} material={lineMaterial} frustumCulled={false} />
      <points geometry={pointsGeo} material={pointsMaterial} frustumCulled={false} />
      <points geometry={reflectionGeo} material={refMaterial} frustumCulled={false} />
    </group>
  )
}

// =========================================================================
// 6. Interactive Digital Earth Particle Mesh Component
// =========================================================================
function StandaloneOrbMesh({
  count = 28000,
  mode,
  control,
  lightTheme,
}: {
  count?: number
  mode: 'orb' | 'word' | 'clusters'
  control: React.MutableRefObject<OrbControlState>
  lightTheme: boolean
}) {
  const pointer = useRef({ x: 0, y: 0, active: false })
  const gesture = useRef({ dragging: false, dx: 0, dy: 0, vx: 0, vy: 0, target: 'sphere' as 'sphere' | 'text' })
  const previous = useRef({ x: 0, y: 0, dragging: false })
  const localCamera = useMemo(() => new THREE.PerspectiveCamera(), [])
  const state = useRef({
    time: 0,
    morph: 0,
    clusters: 0,
    entrance: 0,
    tiltX: 0,
    tiltY: 0,
    labelX: 0,
    labelY: 0,
    labelVX: 0,
    labelVY: 0,
    pointerX: 0,
    pointerY: 0,
    pointerActive: false,
  })

  const pointerVec = useMemo(() => new THREE.Vector2(), [])
  const rotation = useMemo(() => new THREE.Quaternion(), [])
  const labelRotation = useMemo(() => new THREE.Quaternion(), [])
  const restRotation = useMemo(() => new THREE.Quaternion(), [])
  const picking = useMemo(
    () => ({
      ray: new THREE.Raycaster(),
      plane: new THREE.Plane(),
      normal: new THREE.Vector3(),
      center: new THREE.Vector3(),
      hit: new THREE.Vector3(),
      inverse: new THREE.Matrix4(),
    }),
    [],
  )
  const step = useMemo(() => new THREE.Quaternion(), [])
  const euler = useMemo(() => new THREE.Euler(), [])
  const matrix = useMemo(() => new THREE.Matrix4(), [])
  const idleMatrix = useMemo(() => new THREE.Matrix4(), [])
  const textMatrix = useMemo(() => new THREE.Matrix4(), [])
  const uOrbRef = useRef(1)

  const data = useMemo(() => {
    const shellCount = count - 5000
    const labelCount = count - shellCount
    const d: any = createParticleData(count)
    const label = textCloud('DevHarbour', labelCount)

    d.home = d.sphere.slice()
    d.home.set(createParticleData(shellCount).sphere)
    d.shellCount = shellCount
    d.home.set(label, shellCount * 3)
    for (let i = shellCount; i < count; i++) d.home[i * 3 + 2] += 0.3
    d.expanded = textCloud('DEVHARBOUR', count, { spread: 4.65 })
    d.offset = new Float32Array(count * 3)
    d.velocity = new Float32Array(count * 3)
    d.scatter = new Float32Array(labelCount * 3)
    d.scatterVelocity = new Float32Array(labelCount * 3)
    return d
  }, [count])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(data.home.slice(), 3).setUsage(THREE.DynamicDrawUsage))
    geo.setAttribute('color', new THREE.BufferAttribute(data.colors, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(Float32Array.from({ length: count }, (_, i) => hash(i + 5)), 1))
    geo.setAttribute('aText', new THREE.BufferAttribute(Float32Array.from({ length: count }, (_, i) => (i >= data.shellCount ? 1 : 0)), 1))
    geo.setAttribute('aLand', new THREE.BufferAttribute(Float32Array.from({ length: count }, (_, i) => (i < data.shellCount && data.land ? data.land[i] : 0)), 1))
    return geo
  }, [count, data])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: orbVertexShader,
        fragmentShader: orbFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uDpr: { value: 1 },
          uHover: { value: 0 },
          uOrb: { value: 1 },
          uLight: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  )

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useEffect(() => {
    material.uniforms.uLight.value = lightTheme ? 1 : 0
    material.blending = lightTheme ? THREE.NormalBlending : THREE.AdditiveBlending
    material.needsUpdate = true
  }, [lightTheme, material])

  useFrame(({ viewport: worldViewport, gl, camera: worldCamera, size }, delta) => {
    const ctl = control.current
    if ('isPerspectiveCamera' in worldCamera) {
      localCamera.copy(worldCamera as THREE.PerspectiveCamera)
    }
    localCamera.position.set(0, 0, worldCamera.position.z)
    localCamera.updateMatrixWorld()
    const camera = localCamera
    const viewport = { width: worldViewport.width, height: worldViewport.height }

    pointer.current = { x: ctl.pointer.nx, y: -ctl.pointer.ny, active: ctl.pointer.inside }
    const reduced = ctl.reduced
    const dragging = ctl.drag.active

    gesture.current.dx = dragging && previous.current.dragging ? ctl.pointer.px - previous.current.x : 0
    gesture.current.dy = dragging && previous.current.dragging ? ctl.pointer.py - previous.current.y : 0

    if (dragging && !previous.current.dragging) {
      gesture.current.vx = 0
      gesture.current.vy = 0
    }
    gesture.current.dragging = dragging
    previous.current = { x: ctl.pointer.px, y: ctl.pointer.py, dragging }

    const s = state.current
    const g = gesture.current
    const p = pointer.current

    const dt = Math.min(delta, 1 / 30)
    const damp = 1 - Math.exp(-dt * 5)

    const pointerDX = p.active && s.pointerActive ? p.x - s.pointerX : 0
    const pointerDY = p.active && s.pointerActive ? p.y - s.pointerY : 0
    const movementX = reduced ? 0 : clamp((g.dragging ? (g.dx * viewport.width) / size.width : pointerDX * viewport.width * 0.18) / Math.max(dt, 0.001), -5, 5)
    const movementY = reduced ? 0 : clamp((g.dragging ? (-g.dy * viewport.height) / size.height : pointerDY * viewport.height * 0.18) / Math.max(dt, 0.001), -5, 5)

    s.pointerX = p.x
    s.pointerY = p.y
    s.pointerActive = p.active
    s.time += reduced ? 0 : dt
    s.entrance = reduced ? 1 : Math.min(1, s.entrance + dt * 0.65)
    s.morph += ((mode === 'word' ? 1 : 0) - s.morph) * (reduced ? 1 : damp * 0.75)
    s.clusters += ((mode === 'clusters' ? 1 : 0) - s.clusters) * (reduced ? 1 : damp)

    const movingText = g.dragging && g.target === 'text'
    if (movingText) {
      s.labelX = clamp(s.labelX + (g.dx * viewport.width) / size.width, -1.05, 1.05)
      s.labelY = clamp(s.labelY - (g.dy * viewport.height) / size.height, -0.95, 0.95)
      s.labelVX = 0
      s.labelVY = 0
      g.dx = 0
      g.dy = 0
    } else if (g.dragging) {
      g.vx += (g.dy * 0.006 - g.vx) * 0.6
      g.vy += (g.dx * 0.006 - g.vy) * 0.6
      g.dx = 0
      g.dy = 0
    } else {
      g.vx *= Math.exp(-dt * 3.2)
      g.vy *= Math.exp(-dt * 3.2)
    }

    if (!movingText) {
      s.labelVX += (-s.labelX * 32 - s.labelVX * 9) * dt
      s.labelVY += (-s.labelY * 32 - s.labelVY * 9) * dt
      s.labelX += s.labelVX * dt
      s.labelY += s.labelVY * dt
    }

    step.setFromEuler(euler.set(g.vx, g.vy, 0))
    rotation.premultiply(step).normalize()
    labelRotation.slerp(g.dragging && g.target !== 'text' ? rotation : restRotation, 1 - Math.exp(-dt * (g.dragging ? 12 : 2.4)))

    s.tiltX += ((p.active && !reduced ? -p.y * 0.1 : 0) - s.tiltX) * damp
    s.tiltY += ((p.active && !reduced ? p.x * 0.14 : 0) - s.tiltY) * damp

    step.setFromEuler(euler.set(s.tiltX, s.tiltY, 0))
    textMatrix.makeRotationFromQuaternion(labelRotation).premultiply(matrix.makeRotationFromQuaternion(step))
    matrix.makeRotationFromQuaternion(rotation).premultiply(idleMatrix.makeRotationFromQuaternion(step))

    step.setFromEuler(euler.set(reduced ? 0 : Math.sin(s.time * 0.12) * 0.08, reduced ? 0 : s.time * 0.055, -0.12))
    matrix.premultiply(idleMatrix.makeRotationFromQuaternion(step))

    const a = matrix.elements
    const b = textMatrix.elements
    const pos = geometry.attributes.position.array as Float32Array

    const pickText = (x: number, y: number) => {
      if (mode !== 'orb' || s.morph > 0.1 || s.clusters > 0.1) return false
      pointerVec.set(x, y)
      picking.ray.setFromCamera(pointerVec, camera)
      picking.normal.set(0, 0, 1).transformDirection(textMatrix)
      picking.center.set(0, 0, 0.3).applyMatrix4(textMatrix)
      picking.center.x += s.labelX
      picking.center.y += s.labelY
      picking.plane.setFromNormalAndCoplanarPoint(picking.normal, picking.center)
      if (!picking.ray.ray.intersectPlane(picking.plane, picking.hit)) return false
      picking.hit.x -= s.labelX
      picking.hit.y -= s.labelY
      picking.hit.applyMatrix4(picking.inverse.copy(textMatrix).invert())
      return Math.abs(picking.hit.x) < 1.63 && Math.abs(picking.hit.y) < 0.24
    }

    const textHover = p.active && pickText(p.x, p.y)
    const m = smooth(s.morph)
    const c = smooth(s.clusters)
    const entrance = smooth(s.entrance)
    const insideOrb = (1 - m) * (1 - c)
    uOrbRef.current = insideOrb
    const stir = Math.hypot(movementX, movementY)
    const burst = Math.sin(Math.PI * m) ** 2 * 0.52
    const cursorX = (p.x * viewport.width) / 2
    const cursorY = (p.y * viewport.height) / 2
    const active = p.active && !reduced && (!g.dragging || movingText)

    material.uniforms.uTime.value = s.time
    material.uniforms.uDpr.value = gl.getPixelRatio()
    material.uniforms.uOrb.value = (1 - m) * (1 - c)
    material.uniforms.uHover.value += ((active && (textHover || movingText) ? 1 : 0) - material.uniforms.uHover.value) * damp

    for (let i = 0; i < count; i++) {
      const o = i * 3
      const isText = i >= data.shellCount
      const r = isText ? b : a
      const hx = data.home[o]
      const hy = data.home[o + 1]
      const hz = data.home[o + 2]
      const breath = reduced || isText ? 1 : 1 + Math.sin(s.time * 0.7 + hy * 2) * 0.008

      let x = (hx * r[0] + hy * r[4] + hz * r[8]) * breath
      let y = (hx * r[1] + hy * r[5] + hz * r[9]) * breath
      let z = hx * r[2] + hy * r[6] + hz * r[10]

      if (isText) {
        x += s.labelX
        y += s.labelY
      }

      x += (data.expanded[o] - x) * m + data.random[o] * burst
      y += (data.expanded[o + 1] - y) * m + data.random[o + 1] * burst
      z += (data.expanded[o + 2] - z) * m + data.random[o + 2] * burst

      x += (data.clusters[o] - x) * c
      y += (data.clusters[o + 1] - y) * c
      z += (data.clusters[o + 2] - z) * c

      const perspective = (camera.position.z - z) / camera.position.z
      const dx = x - cursorX * perspective
      const dy = y - cursorY * perspective
      const dist = Math.sqrt(dx * dx + dy * dy)
      const influence = active ? Math.max(0, 1 - dist / 0.68) ** 2 : 0
      const force = influence * (isText ? 0.18 : 0.48)
      const norm = 1 / Math.max(0.09, dist)
      const shimmer = isText ? Math.sin(s.time * 7 + i * 1.7) * influence * 0.025 : 0
      const fx = dx * norm * force - dy * norm * force * 0.35 + shimmer
      const fy = dy * norm * force + dx * norm * force * 0.35

      for (let j = 0; j < 3; j++) {
        const target = j === 0 ? fx : j === 1 ? fy : force * 0.4
        data.velocity[o + j] += ((target - data.offset[o + j]) * 95 - data.velocity[o + j] * 15) * dt
        data.offset[o + j] += data.velocity[o + j] * dt
      }

      let scatterX = 0
      let scatterY = 0
      let scatterZ = 0

      if (isText) {
        const local = (i - data.shellCount) * 3
        for (let j = 0; j < 3; j++) {
          const index = local + j
          const seed = data.random[o + j] / 4.5
          const drift = j === 0 ? movementX : j === 1 ? movementY : stir * 0.4
          const forcing = (drift * (1.5 + Math.abs(seed) * 2) + seed * stir * 3.5) * insideOrb
          const spring = reduced ? 100 : 17 + Math.abs(seed) * 8
          const damping = reduced ? 20 : 5.8
          data.scatterVelocity[index] += (forcing - spring * data.scatter[index] - damping * data.scatterVelocity[index]) * dt
          data.scatter[index] += data.scatterVelocity[index] * dt
        }
        scatterX = data.scatter[local] * insideOrb
        scatterY = data.scatter[local + 1] * insideOrb
        scatterZ = data.scatter[local + 2] * insideOrb
      }

      pos[o] = x * entrance + data.random[o] * (1 - entrance) + data.offset[o] + scatterX
      pos[o + 1] = y * entrance + data.random[o + 1] * (1 - entrance) + data.offset[o + 1] + scatterY
      pos[o + 2] = z * entrance + data.random[o + 2] * (1 - entrance) + data.offset[o + 2] + scatterZ
    }
    geometry.attributes.position.needsUpdate = true
  })

  return (
    <group>
      <points geometry={geometry} material={material} frustumCulled={false} />
      <GlobeOrbitalRings lightTheme={lightTheme} uOrbRef={uOrbRef} />
    </group>
  )
}

// =========================================================================
// 7. Full Scene Assembly (Scales Responsively)
// =========================================================================
function Scene({
  mode,
  control,
  lightTheme,
}: {
  mode: 'orb' | 'word' | 'clusters'
  control: React.MutableRefObject<OrbControlState>
  lightTheme: boolean
}) {
  const { size } = useThree()
  const group = useRef<THREE.Group>(null)

  useFrame(() => {
    if (!group.current) return
    const vh = 2 * 10 * Math.tan((40 * Math.PI) / 360)
    const vw = vh * (size.width / size.height)
    const fit = Math.min(vw / 7.4, vh / 7.4, 1.15)
    const desktopExpansion = Math.max(0, Math.min(1, (size.width - 900) / 400))
    const s = fit * (1.75 / 2.08) * (1 + desktopExpansion * 0.25)
    group.current.scale.setScalar(s)
  })

  return (
    <group ref={group}>
      <TiltedHolographicPlatform lightTheme={lightTheme} />
      <StandaloneOrbMesh count={28000} mode={mode} control={control} lightTheme={lightTheme} />
    </group>
  )
}

// =========================================================================
// 8. Main Standalone Export Component
// =========================================================================
export default function StandaloneHeroOrb({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [orbMode, setOrbMode] = useState<'orb' | 'word' | 'clusters'>('orb')
  const [ready, setReady] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const orbReset = useRef<ReturnType<typeof setTimeout> | null>(null)
  const orbClick = useRef<ReturnType<typeof setTimeout> | null>(null)
  const orbLastTap = useRef(0)

  const ctl = useRef<OrbControlState>({
    pointer: { nx: 0, ny: 0, px: 0, py: 0, inside: false },
    drag: { active: false, dx: 0, dy: 0 },
    reduced: false,
  })

  const isLight = theme === 'light'

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const current = document.documentElement.dataset.theme
      if (current === 'light' || current === 'dark') {
        setTheme(current)
      }
    }
  }, [])

  const toggleTheme = () => {
    const next = isLight ? 'dark' : 'light'
    setTheme(next)
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = next
      try {
        localStorage.setItem('devharbour-theme', next)
      } catch {}
      window.dispatchEvent(new Event('themechange'))
    }
  }

  const transformOrb = () => {
    if (orbReset.current) clearTimeout(orbReset.current)
    setOrbMode('word')
    orbReset.current = setTimeout(() => setOrbMode('orb'), ctl.current.reduced ? 1800 : 4600)
  }

  const updatePointer = (e: React.PointerEvent) => {
    if (!containerRef.current) return
    const r = containerRef.current.getBoundingClientRect()
    const p = ctl.current.pointer
    p.px = e.clientX - r.left
    p.py = e.clientY - r.top
    p.nx = (p.px / r.width) * 2 - 1
    p.ny = (p.py / r.height) * 2 - 1
    p.inside = true
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('button')) return
    updatePointer(e)
    ctl.current.drag.active = true
    ctl.current.drag.dx = 0
    ctl.current.drag.dy = 0
    containerRef.current?.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    updatePointer(e)
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (!ctl.current.drag.active) return
    ctl.current.drag.active = false
    if (containerRef.current?.hasPointerCapture(e.pointerId)) {
      containerRef.current.releasePointerCapture(e.pointerId)
    }

    const c = ctl.current
    if (!containerRef.current) return
    const { width, height } = containerRef.current.getBoundingClientRect()
    const withinOrb = Math.hypot(c.pointer.px - width / 2, c.pointer.py - height / 2) < Math.min(width, height) * 0.3
    if (withinOrb && !(e.target as Element).closest('button')) {
      const now = performance.now()
      if (orbLastTap.current && now - orbLastTap.current < 310) {
        if (orbClick.current) clearTimeout(orbClick.current)
        if (orbReset.current) clearTimeout(orbReset.current)
        orbLastTap.current = 0
        setOrbMode((prev) => (prev === 'clusters' ? 'orb' : 'clusters'))
      } else {
        orbLastTap.current = now
        orbClick.current = setTimeout(() => {
          orbLastTap.current = 0
          transformOrb()
        }, 310)
      }
    }
  }

  return (
    <section
      ref={containerRef}
      tabIndex={0}
      aria-label="Interactive futuristic DevHarbour particle Earth"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          transformOrb()
        } else if (e.key.toLowerCase() === 'c' || e.key === 'Escape') {
          if (orbReset.current) clearTimeout(orbReset.current)
          setOrbMode((mode) => (e.key === 'Escape' || mode === 'clusters' ? 'orb' : 'clusters'))
        }
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => {
        ctl.current.pointer.inside = false
      }}
      className={`relative h-[100svh] w-full select-none overflow-hidden transition-colors duration-500 cursor-grab active:cursor-grabbing ${className}`}
      style={{
        background: isLight
          ? 'radial-gradient(ellipse at 46% 38%, #fcfaff 0%, #f0eafa 48%, #e4d8f3 100%)'
          : 'radial-gradient(ellipse at 50% 48%, #0d0a1c 0%, #06050e 55%, #030208 100%)',
      }}
    >
      {/* 1. Theme Toggle Pill */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
        className="absolute top-6 right-6 z-30 flex items-center gap-2.5 rounded-full border px-4 py-2 text-xs font-medium backdrop-blur-md transition-all duration-300 shadow-sm"
        style={{
          background: isLight ? 'rgba(250, 246, 255, 0.85)' : 'rgba(17, 17, 29, 0.85)',
          borderColor: isLight ? '#d6c4e9' : 'rgba(109, 77, 204, 0.3)',
          color: isLight ? '#32164f' : '#eeebf7',
          boxShadow: isLight ? '0 4px 20px rgba(84, 40, 128, 0.08)' : '0 4px 20px rgba(0, 0, 0, 0.4)',
        }}
      >
        {isLight ? <Moon size={15} className="text-[#7040b5]" /> : <Sun size={15} className="text-[#a78bfa]" />}
        <span>{isLight ? 'Dark mode' : 'Light mode'}</span>
      </button>

      {/* 2. Deep Cosmic Purple Radial Corona Bloom */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-700"
        style={{
          background: isLight
            ? 'radial-gradient(ellipse at center, rgba(167, 139, 250, 0.16) 0%, transparent 60%)'
            : 'radial-gradient(ellipse at 50% 48%, rgba(124, 58, 237, 0.22) 0%, rgba(76, 29, 149, 0.09) 35%, transparent 65%)',
        }}
      />

      {/* 3. Platform Horizon Bloom at Bottom */}
      {!isLight && (
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-[32%]"
          style={{
            background: 'radial-gradient(ellipse at 50% 100%, rgba(109, 40, 217, 0.18) 0%, transparent 70%)',
          }}
        />
      )}

      {/* 4. Tilted Rotating Orbit Text Ring */}
      <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center [perspective:900px]">
        <div className="size-[94%] max-w-[900px] max-h-[900px] [transform:rotateX(74deg)_rotateZ(-14deg)]">
          <svg viewBox="0 0 800 800" className="size-full animate-[spin_60s_linear_infinite]">
            <defs>
              <path id="hero-orbit-path" d="M400 400 m-370 0 a370 370 0 1 1 740 0 a370 370 0 1 1 -740 0" />
            </defs>
            <circle
              cx="400"
              cy="400"
              r="370"
              fill="none"
              stroke={isLight ? 'rgba(112, 64, 181, 0.28)' : 'rgba(167, 139, 250, 0.22)'}
              strokeWidth="1"
              strokeDasharray="2 10"
            />
            <text
              fill={isLight ? '#553078' : '#c9b9f5'}
              fillOpacity={isLight ? 0.78 : 0.65}
              fontSize="17"
              fontFamily="monospace"
              letterSpacing="9"
            >
              <textPath href="#hero-orbit-path" textLength="2300" lengthAdjust="spacing">
                LEARN · BUILD · COMPETE · CONNECT · LEARN · BUILD · COMPETE · CONNECT ·
              </textPath>
            </text>
          </svg>
        </div>
      </div>

      {/* 5. 3D Canvas with Digital Earth + Tilted Holographic Platform */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${ready ? 'opacity-100' : 'opacity-0'}`}>
        <Canvas
          dpr={[1, 1.75]}
          camera={{ position: [0, 0, 10], fov: 40, near: 0.1, far: 50 }}
          gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
          onCreated={() => setReady(true)}
        >
          <Scene mode={orbMode} control={ctl} lightTheme={isLight} />
        </Canvas>
      </div>

      {/* 6. Fallback Pulsing Ring while Loading */}
      {!ready && (
        <div className="absolute inset-0 grid place-items-center" role="status">
          <div
            className="size-48 animate-pulse rounded-full"
            style={{
              background: isLight
                ? 'radial-gradient(circle, rgba(167, 139, 250, 0.3), transparent 65%)'
                : 'radial-gradient(circle, rgba(118, 85, 216, 0.35), transparent 65%)',
            }}
          />
        </div>
      )}

      {/* 7. Animated Mouse Scroll Indicator */}
      <div
        className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 transition-colors duration-300 z-10"
        style={{ color: isLight ? 'rgba(85, 48, 120, 0.7)' : 'rgba(200, 180, 255, 0.75)' }}
        aria-hidden
      >
        <div
          className="w-[18px] h-[28px] rounded-full border flex justify-center pt-1.5 shadow-[0_0_10px_rgba(167,139,250,0.25)]"
          style={{ borderColor: isLight ? 'rgba(112, 64, 181, 0.4)' : 'rgba(167, 139, 250, 0.4)' }}
        >
          <div
            className="w-1 h-2 rounded-full animate-bounce"
            style={{ background: isLight ? '#7040b5' : '#c9b9f5' }}
          />
        </div>
        <span className="text-[0.58rem] tracking-[0.25em] font-mono uppercase">
          Scroll to Explore
        </span>
      </div>
    </section>
  )
}
