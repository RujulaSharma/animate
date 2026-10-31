'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useLightTheme } from './theme-toggle'

/**
 * Large Concentric Holographic Rings & Ground Platform beneath the floating Globe
 * Tilted in 3D perspective to form an open elliptical energy field.
 */
export function SaturnOrbit({ reduced }: { reduced: React.RefObject<{ reduced: boolean }> }) {
  const light = useLightTheme()
  const elapsed = useRef(0)

  // 6 Concentric ring specifications (radii & densities)
  const ringConfigs = useMemo(() => [
    { r: 2.8, count: 480,  speed: 0.035, width: 1.35 },
    { r: 4.0, count: 640,  speed: -0.028, width: 1.40 },
    { r: 5.4, count: 800,  speed: 0.024, width: 1.45 },
    { r: 7.0, count: 960,  speed: -0.020, width: 1.50 },
    { r: 8.8, count: 1120, speed: 0.016, width: 1.55 },
    { r: 11.0,count: 1280, speed: -0.012, width: 1.60 },
  ], [])

  // 1. Points Geometry for the glowing concentric rings + dotted matrix platform
  const { pointsGeo, linesGeo, reflectionGeo } = useMemo(() => {
    const pos: number[] = []
    const phases: number[] = []
    const seeds: number[] = []
    const sideGlows: number[] = []

    // A. Concentric circular paths
    ringConfigs.forEach((cfg, ringIdx) => {
      for (let i = 0; i < cfg.count; i++) {
        const angle = (i / cfg.count) * Math.PI * 2
        const seed = Math.abs(Math.sin(i * 127.1 + ringIdx * 311.7) * 43758.5453 % 1)
        const jitter = (seed - 0.5) * 0.035
        const rad = cfg.r + jitter

        const x = Math.cos(angle) * rad * cfg.width
        const y = (seed - 0.5) * 0.02
        const z = Math.sin(angle) * rad

        pos.push(x, y, z)
        phases.push(angle + ringIdx * 0.8)
        seeds.push(seed)
        // High specular intensity at the left and right perspective horizons (cos(angle) near +-1)
        const side = Math.pow(Math.abs(Math.cos(angle)), 4.0)
        sideGlows.push(side)
      }
    })

    // B. Dotted platform matrix grid between the rings
    for (let gx = -14; gx <= 14; gx += 0.65) {
      for (let gz = -9; gz <= 9; gz += 0.65) {
        const dist = Math.hypot(gx / 1.50, gz)
        if (dist < 2.5 || dist > 11.5) continue
        const seed = Math.abs(Math.sin(gx * 93.3 + gz * 419.7) * 43758.5453 % 1)
        if (seed > 0.30) continue // sparse matrix dots (~30% density)

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

    // C. Continuous thin wireframe ring lines
    const linePositions: number[] = []
    ringConfigs.forEach((cfg) => {
      const segs = 180
      for (let i = 0; i < segs; i++) {
        const a1 = (i / segs) * Math.PI * 2
        const a2 = ((i + 1) / segs) * Math.PI * 2

        const x1 = Math.cos(a1) * cfg.r * cfg.width
        const y1 = 0
        const z1 = Math.sin(a1) * cfg.r

        const x2 = Math.cos(a2) * cfg.r * cfg.width
        const y2 = 0
        const z2 = Math.sin(a2) * cfg.r

        linePositions.push(x1, y1, z1, x2, y2, z2)
      }
    })

    const lGeo = new THREE.BufferGeometry()
    lGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePositions), 3))

    // D. Soft radial glow pool on the floor beneath the floating orb
    const refCount = 720
    const refPositions: number[] = []
    const refAlphas: number[] = []
    for (let i = 0; i < refCount; i++) {
      const angle = (i / refCount) * Math.PI * 2
      const s = Math.abs(Math.sin(i * 37.1) * 43758.5453 % 1)
      const rad = Math.sqrt(s) * 3.4
      const x = Math.cos(angle) * rad * 1.45
      const y = 0
      const z = Math.sin(angle) * rad
      refPositions.push(x, y, z)
      refAlphas.push(Math.max(0, 1.0 - rad / 3.4))
    }

    const rGeo = new THREE.BufferGeometry()
    rGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(refPositions), 3))
    rGeo.setAttribute('aRefAlpha', new THREE.BufferAttribute(new Float32Array(refAlphas), 1))

    return { pointsGeo: pGeo, linesGeo: lGeo, reflectionGeo: rGeo }
  }, [ringConfigs])

  // Points Shader Material
  const pointsMaterial = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uDpr: { value: 1 },
      uLight: { value: 0 }
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
        // Slow continuous traveling wave around the rings
        float wave = 0.5 + 0.5 * cos(aPhase * 4.0 - uTime * 0.28);
        float pulse = pow(wave, 22.0);

        // Blazing side horizon sparks (matches reference left and right glowing clusters)
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

        // Vivid electric violet to brilliant white at glowing nodes
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
    `
  }), [])

  // Line Segments Material (delicate neon-violet rings)
  const lineMaterial = useMemo(() => new THREE.LineBasicMaterial({
    color: new THREE.Color('#7c52f0'),
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }), [])

  // Reflection Glow Material
  const refMaterial = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uDpr: { value: 1 },
      uLight: { value: 0 }
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
    `
  }), [])

  useEffect(() => {
    pointsMaterial.uniforms.uLight.value = light ? 1 : 0
    pointsMaterial.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending
    pointsMaterial.needsUpdate = true

    refMaterial.uniforms.uLight.value = light ? 1 : 0
    refMaterial.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending
    refMaterial.needsUpdate = true

    lineMaterial.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending
    lineMaterial.opacity = light ? 0.08 : 0.18
    lineMaterial.color.set(light ? '#4a2575' : '#7c52f0')
    lineMaterial.needsUpdate = true
  }, [light, pointsMaterial, refMaterial, lineMaterial])

  useEffect(() => () => {
    pointsGeo.dispose()
    linesGeo.dispose()
    reflectionGeo.dispose()
    pointsMaterial.dispose()
    refMaterial.dispose()
    lineMaterial.dispose()
  }, [pointsGeo, linesGeo, reflectionGeo, pointsMaterial, refMaterial, lineMaterial])

  useFrame(({ gl }, delta) => {
    if (!reduced.current.reduced) elapsed.current += Math.min(delta, 0.05)
    pointsMaterial.uniforms.uTime.value = elapsed.current
    pointsMaterial.uniforms.uDpr.value = gl.getPixelRatio()
    refMaterial.uniforms.uTime.value = elapsed.current
    refMaterial.uniforms.uDpr.value = gl.getPixelRatio()
  })

  // Group tilted at 0.42 rad (~24 deg) around X to open up the concentric elliptical platform
  return (
    <group rotation={[0.42, 0, -0.04]} position={[0, 0.35, 0]}>
      {/* 1. Thin luminous wireframe ring tracks */}
      <lineSegments geometry={linesGeo} material={lineMaterial} frustumCulled={false} />

      {/* 2. Concentric glowing particle paths & holographic platform dots */}
      <points geometry={pointsGeo} material={pointsMaterial} frustumCulled={false} />

      {/* 3. Surface reflection glow directly beneath the floating globe */}
      <points geometry={reflectionGeo} material={refMaterial} frustumCulled={false} />
    </group>
  )
}
