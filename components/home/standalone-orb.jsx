'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { clamp, smooth, hash, createParticleData, textCloud } from '@/lib/standalone-orb-particles';
import { useLightTheme } from './theme-toggle';

// ==========================================
// 1. Digital Earth Particle Shader
// ==========================================
const vertexShader = `
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

  // Multi-layered waves for fluid surface & network dynamics
  float wave = sin(p.y * 4.5 + p.x * 1.7 - uTime * .65)
             * sin(p.z * 3.4 - p.y * 1.3 + uTime * .42);
  float fine = sin(p.x * 11. + p.z * 7. + uTime * .8) * .012;
  p += n * (wave * .055 + fine) * shell;
  p.x += sin(p.y * 3. + uTime * .38) * .024 * shell;
  p.z += cos(p.y * 4. - uTime * .32) * .022 * shell;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec3 viewDir = normalize(vec3(0., 0., 6.6) - p);

  // Intense violet/purple luminous outline (rim lighting)
  float rim = pow(1. - abs(dot(n, viewDir)), 1.8);
  float key = pow(max(0., dot(n, normalize(vec3(-.85, .85, 1.0)))), 2.);
  float front = smoothstep(-.8, 1.4, p.z);
  float light = .12 + key * 1.1 + rim * .95;

  // Subtle twinkle & shimmering on continents & wordmark (smooth & elegant)
  float shimmer = .84 + .16 * sin(uTime * (1.2 + uHover * aText * 6. + aLand * 2.2) + aSeed * 75.);

  // Vivid cosmic palette: deep indigo -> electric violet -> core white
  vec3 deepViolet = vec3(.24, .10, .58);
  vec3 midLilac   = vec3(.62, .38, 1.00);
  vec3 coreWhite  = vec3(.96, .94, 1.00);
  float blend = clamp(key * 1.15 + rim * .9, 0., 1.);
  vec3 shellColor = mix(deepViolet, mix(midLilac, coreWhite, blend), blend);

  // Continent points glow with bright white-lilac particles
  vec3 landColor = mix(color, coreWhite, 0.45 * key + 0.35 * rim);
  vec3 finalOrbColor = mix(shellColor, landColor, aLand * 0.75);

  vColor = mix(mix(color, finalOrbColor, uOrb) * mix(1.2, light * 1.6, uOrb), color * (1.6 + uHover * .65), aText) * shimmer;
  vAlpha = mix(mix(.68, (.15 + front * .65) * (.42 + rim * .8 + key * .85), uOrb), .97, aText);
  vAlpha = mix(vAlpha, min(1.0, vAlpha * 1.35), aLand * uOrb);

  // Light mode ink particles with illuminated edges
  vec3 ink = mix(vec3(.16, .055, .31), vec3(.42, .20, .65), key * .65 + rim * .35);
  vColor = mix(vColor, mix(ink, vec3(.20, .07, .36), aText) * shimmer, uLight);
  float inkAlpha = mix((.18 + front * .63 + rim * .25), 1.0, aText);
  vAlpha = mix(vAlpha, inkAlpha, uLight);

  float baseSize = aText > .5 ? 2.5 : (mix(1.2, 2.2, aLand) + aSeed * 1.6);
  gl_PointSize = clamp(baseSize * uDpr * 8.0 / -mv.z, 0.8, 9. * uDpr);
  gl_Position = projectionMatrix * mv;
}`;

const fragmentShader = `
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
}`;

// ==========================================
// 2. Delicate 3D Orbital Wireframe Rings Around Globe
// (Fast-moving dots removed; clean luminous orbital tracks preserved)
// ==========================================
function GlobeOrbitalRings({ lightTheme, uOrbRef }) {
  // 5 distinct 3D orbital trajectory loops wrapping around the globe
  const orbitConfigs = useMemo(() => [
    { tilt: [0.55, 0.35, 0.25],   radius: 2.38 },
    { tilt: [-0.95, -0.45, 0.65],  radius: 2.52 },
    { tilt: [1.25, 0.20, -0.55],   radius: 2.65 },
    { tilt: [-0.35, 1.30, 0.40],   radius: 2.48 },
    { tilt: [0.70, -0.85, 1.15],   radius: 2.42 },
  ], []);

  // Continuous thin wireframe ring lines wrapping in 3D
  const lineGeometries = useMemo(() => {
    return orbitConfigs.map((cfg) => {
      const segs = 180;
      const pos = [];
      for (let i = 0; i < segs; i++) {
        const a1 = (i / segs) * Math.PI * 2;
        const a2 = ((i + 1) / segs) * Math.PI * 2;
        pos.push(Math.cos(a1) * cfg.radius, 0, Math.sin(a1) * cfg.radius);
        pos.push(Math.cos(a2) * cfg.radius, 0, Math.sin(a2) * cfg.radius);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
      return g;
    });
  }, [orbitConfigs]);

  const lineMaterial = useMemo(() => new THREE.LineBasicMaterial({
    color: new THREE.Color('#9366f8'),
    transparent: true,
    opacity: 0.24,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }), []);

  useEffect(() => () => {
    lineGeometries.forEach(g => g.dispose());
    lineMaterial.dispose();
  }, [lineGeometries, lineMaterial]);

  useFrame(() => {
    const orbVisibility = uOrbRef.current ?? 1;
    lineMaterial.opacity = (lightTheme ? 0.10 : 0.24) * orbVisibility;
    lineMaterial.blending = lightTheme ? THREE.NormalBlending : THREE.AdditiveBlending;
    lineMaterial.color.set(lightTheme ? '#6236b5' : '#9366f8');
  });

  return (
    <group>
      {orbitConfigs.map((cfg, i) => (
        <group key={i} rotation={cfg.tilt}>
          <lineSegments geometry={lineGeometries[i]} material={lineMaterial} frustumCulled={false} />
        </group>
      ))}
    </group>
  );
}

// ==========================================
// 3. Main StandaloneOrb Component
// ==========================================
export function StandaloneOrb({ count, mode, control, transformRef }) {
  const lightTheme = useLightTheme();
  const pointer = useRef({ x: 0, y: 0, active: false });
  const gesture = useRef({ dragging: false, dx: 0, dy: 0, vx: 0, vy: 0 });
  const previous = useRef({ x: 0, y: 0, dragging: false });
  const localCamera = useMemo(() => new THREE.PerspectiveCamera(), []);
  const state = useRef({ time: 0, morph: 0, clusters: 0, entrance: 0, tiltX: 0, tiltY: 0, labelX: 0, labelY: 0, labelVX: 0, labelVY: 0, pointerX: 0, pointerY: 0, pointerActive: false });
  const rotation = useMemo(() => new THREE.Quaternion(), []);
  const labelRotation = useMemo(() => new THREE.Quaternion(), []);
  const restRotation = useMemo(() => new THREE.Quaternion(), []);
  const picking = useMemo(() => ({ ray: new THREE.Raycaster(), plane: new THREE.Plane(), normal: new THREE.Vector3(), center: new THREE.Vector3(), hit: new THREE.Vector3(), inverse: new THREE.Matrix4() }), []);
  const step = useMemo(() => new THREE.Quaternion(), []);
  const euler = useMemo(() => new THREE.Euler(), []);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const idleMatrix = useMemo(() => new THREE.Matrix4(), []);
  const textMatrix = useMemo(() => new THREE.Matrix4(), []);
  const uOrbRef = useRef(1);

  const data = useMemo(() => {
    const shellCount = count - 5000, labelCount = count - shellCount;
    const d = createParticleData(count), label = textCloud('DevHarbour', labelCount);
    d.home = d.sphere.slice(); d.home.set(createParticleData(shellCount).sphere); d.shellCount = shellCount;
    d.home.set(label, shellCount * 3);
    for (let i = shellCount; i < count; i++) d.home[i * 3 + 2] += .30;
    d.expanded = textCloud('DEVHARBOUR', count, { spread: 4.65 });
    d.offset = new Float32Array(count * 3); d.velocity = new Float32Array(count * 3);
    d.scatter = new Float32Array(labelCount * 3);
    d.scatterVelocity = new Float32Array(labelCount * 3);
    return d;
  }, [count]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(data.home.slice(), 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(Float32Array.from({ length: count }, (_, i) => hash(i + 5)), 1));
    geo.setAttribute('aText', new THREE.BufferAttribute(Float32Array.from({ length: count }, (_, i) => i >= data.shellCount ? 1 : 0), 1));
    geo.setAttribute('aLand', new THREE.BufferAttribute(Float32Array.from({ length: count }, (_, i) => i < data.shellCount && data.land ? data.land[i] : 0), 1));
    return geo;
  }, [count, data]);

  const material = useMemo(() => new THREE.ShaderMaterial({ vertexShader, fragmentShader,
    uniforms: { uTime: { value: 0 }, uDpr: { value: 1 }, uHover: { value: 0 }, uOrb: { value: 1 }, uLight: { value: 0 } },
    transparent: true, depthWrite: false, vertexColors: false, blending: THREE.AdditiveBlending }), []);

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  useEffect(() => {
    material.uniforms.uLight.value = lightTheme ? 1 : 0;
    material.blending = lightTheme ? THREE.NormalBlending : THREE.AdditiveBlending;
    material.needsUpdate = true;
  }, [lightTheme, material]);

  useFrame(({ viewport: worldViewport, gl, camera: worldCamera, size }, delta) => {
    const ctl = control.current;
    const scale = transformRef.current?.scale.x || 1;
    const lift = transformRef.current?.position.y || 0;
    localCamera.copy(worldCamera);
    localCamera.position.set(0, -lift / scale, worldCamera.position.z / scale);
    localCamera.updateMatrixWorld();
    const camera = localCamera;
    const viewport = { width: worldViewport.width / scale, height: worldViewport.height / scale };
    pointer.current = { x: ctl.pointer.nx, y: -ctl.pointer.ny, active: ctl.pointer.inside };
    const reduced = ctl.reduced;
    const dragging = ctl.drag.active;
    gesture.current.dx = dragging && previous.current.dragging ? ctl.pointer.px - previous.current.x : 0;
    gesture.current.dy = dragging && previous.current.dragging ? ctl.pointer.py - previous.current.y : 0;
    if (dragging && !previous.current.dragging) {
      gesture.current.target = gesture.current.pickText?.(pointer.current.x, pointer.current.y) ? 'text' : 'sphere';
      gesture.current.vx = 0;
      gesture.current.vy = 0;
    }
    gesture.current.dragging = dragging;
    previous.current = { x: ctl.pointer.px, y: ctl.pointer.py, dragging };
    const s = state.current, g = gesture.current, p = pointer.current;
    // Capped integration keeps spring motion stable after a suspended tab resumes.
    const dt = Math.min(delta, 1 / 30), damp = 1 - Math.exp(-dt * 5);
    // Only movement supplies energy. A stationary cursor lets every dot find home.
    const pointerDX = p.active && s.pointerActive ? p.x - s.pointerX : 0;
    const pointerDY = p.active && s.pointerActive ? p.y - s.pointerY : 0;
    const movementX = reduced ? 0 : clamp((g.dragging ? g.dx * viewport.width / size.width : pointerDX * viewport.width * .18) / Math.max(dt, .001), -5, 5);
    const movementY = reduced ? 0 : clamp((g.dragging ? -g.dy * viewport.height / size.height : pointerDY * viewport.height * .18) / Math.max(dt, .001), -5, 5);
    s.pointerX = p.x; s.pointerY = p.y; s.pointerActive = p.active;
    s.time += reduced ? 0 : dt;
    s.entrance = reduced ? 1 : Math.min(1, s.entrance + dt * .65);
    s.morph += ((mode === 'word' ? 1 : 0) - s.morph) * (reduced ? 1 : damp * .75);
    s.clusters += ((mode === 'clusters' ? 1 : 0) - s.clusters) * (reduced ? 1 : damp);
    const movingText = g.dragging && g.target === 'text';
    if (movingText) {
      s.labelX = clamp(s.labelX + g.dx * viewport.width / size.width, -1.05, 1.05);
      s.labelY = clamp(s.labelY - g.dy * viewport.height / size.height, -.95, .95);
      s.labelVX = 0; s.labelVY = 0; g.dx = 0; g.dy = 0;
    } else if (g.dragging) {
      g.vx += (g.dy * .006 - g.vx) * .6; g.vy += (g.dx * .006 - g.vy) * .6;
      g.dx = 0; g.dy = 0;
    } else { g.vx *= Math.exp(-dt * 3.2); g.vy *= Math.exp(-dt * 3.2); }
    if (!movingText) {
      s.labelVX += (-s.labelX * 32 - s.labelVX * 9) * dt;
      s.labelVY += (-s.labelY * 32 - s.labelVY * 9) * dt;
      s.labelX += s.labelVX * dt; s.labelY += s.labelVY * dt;
    }
    step.setFromEuler(euler.set(g.vx, g.vy, 0));
    rotation.premultiply(step).normalize();
    // The word participates in rotation, then settles into a readable silhouette.
    labelRotation.slerp(g.dragging && g.target !== 'text' ? rotation : restRotation, 1 - Math.exp(-dt * (g.dragging ? 12 : 2.4)));
    s.tiltX += ((p.active && !reduced ? -p.y * .10 : 0) - s.tiltX) * damp;
    s.tiltY += ((p.active && !reduced ? p.x * .14 : 0) - s.tiltY) * damp;
    step.setFromEuler(euler.set(s.tiltX, s.tiltY, 0));
    textMatrix.makeRotationFromQuaternion(labelRotation).premultiply(matrix.makeRotationFromQuaternion(step));
    matrix.makeRotationFromQuaternion(rotation).premultiply(idleMatrix.makeRotationFromQuaternion(step));
    step.setFromEuler(euler.set(reduced ? 0 : Math.sin(s.time * .12) * .08, reduced ? 0 : s.time * .055, -.12));
    matrix.premultiply(idleMatrix.makeRotationFromQuaternion(step));
    const a = matrix.elements, b = textMatrix.elements, pos = geometry.attributes.position.array;
    g.pickText = (x, y) => {
      if (mode !== 'orb' || s.morph > .1 || s.clusters > .1) return false;
      picking.ray.setFromCamera({ x, y }, camera);
      picking.normal.set(0, 0, 1).transformDirection(textMatrix);
      picking.center.set(0, 0, .30).applyMatrix4(textMatrix);
      picking.center.x += s.labelX; picking.center.y += s.labelY;
      picking.plane.setFromNormalAndCoplanarPoint(picking.normal, picking.center);
      if (!picking.ray.ray.intersectPlane(picking.plane, picking.hit)) return false;
      picking.hit.x -= s.labelX; picking.hit.y -= s.labelY;
      picking.hit.applyMatrix4(picking.inverse.copy(textMatrix).invert());
      return Math.abs(picking.hit.x) < 1.63 && Math.abs(picking.hit.y) < .24;
    };
    g.textHover = p.active && g.pickText(p.x, p.y);
    const m = smooth(s.morph), c = smooth(s.clusters), entrance = smooth(s.entrance);
    const insideOrb = (1 - m) * (1 - c);
    uOrbRef.current = insideOrb;
    const stir = Math.hypot(movementX, movementY);
    const burst = Math.sin(Math.PI * m) ** 2 * .52;
    const cursorX = p.x * viewport.width / 2, cursorY = p.y * viewport.height / 2;
    const active = p.active && !reduced && (!g.dragging || movingText);
    material.uniforms.uTime.value = s.time;
    material.uniforms.uDpr.value = gl.getPixelRatio();
    material.uniforms.uOrb.value = (1 - m) * (1 - c);
    material.uniforms.uHover.value += ((active && (g.textHover || movingText) ? 1 : 0) - material.uniforms.uHover.value) * damp;
    for (let i = 0; i < count; i++) {
      const o = i * 3, isText = i >= data.shellCount, r = isText ? b : a;
      const hx = data.home[o], hy = data.home[o + 1], hz = data.home[o + 2];
      const breath = reduced || isText ? 1 : 1 + Math.sin(s.time * .7 + hy * 2) * .008;
      let x = (hx * r[0] + hy * r[4] + hz * r[8]) * breath;
      let y = (hx * r[1] + hy * r[5] + hz * r[9]) * breath;
      let z = hx * r[2] + hy * r[6] + hz * r[10];
      if (isText) { x += s.labelX; y += s.labelY; }
      x += (data.expanded[o] - x) * m + data.random[o] * burst;
      y += (data.expanded[o + 1] - y) * m + data.random[o + 1] * burst;
      z += (data.expanded[o + 2] - z) * m + data.random[o + 2] * burst;
      x += (data.clusters[o] - x) * c; y += (data.clusters[o + 1] - y) * c; z += (data.clusters[o + 2] - z) * c;
      // Project cursor onto each particle's depth plane, matching perspective.
      const perspective = (camera.position.z - z) / camera.position.z;
      const dx = x - cursorX * perspective, dy = y - cursorY * perspective;
      const dist = Math.sqrt(dx * dx + dy * dy), influence = active ? Math.max(0, 1 - dist / .68) ** 2 : 0;
      const force = influence * (isText ? .18 : .48), norm = 1 / Math.max(.09, dist);
      const shimmer = isText ? Math.sin(s.time * 7 + i * 1.7) * influence * .025 : 0;
      const fx = dx * norm * force - dy * norm * force * .35 + shimmer;
      const fy = dy * norm * force + dx * norm * force * .35;
      // Independent damped springs: cursor forces displace points, never their homes.
      for (let j = 0; j < 3; j++) {
        const target = j === 0 ? fx : j === 1 ? fy : force * .4;
        data.velocity[o + j] += ((target - data.offset[o + j]) * 95 - data.velocity[o + j] * 15) * dt;
        data.offset[o + j] += data.velocity[o + j] * dt;
      }
      let scatterX = 0, scatterY = 0, scatterZ = 0;
      if (isText) {
        const local = (i - data.shellCount) * 3;
        // Each dot has its own drag, swirl and spring; this breaks up the letters
        // into a moving cloud instead of shifting them as one rigid word.
        for (let j = 0; j < 3; j++) {
          const index = local + j;
          const seed = data.random[o + j] / 4.5;
          const drift = j === 0 ? movementX : j === 1 ? movementY : stir * .4;
          const forcing = (drift * (1.5 + Math.abs(seed) * 2) + seed * stir * 3.5) * insideOrb;
          const spring = reduced ? 100 : 17 + Math.abs(seed) * 8;
          const damping = reduced ? 20 : 5.8;
          data.scatterVelocity[index] += (forcing - spring * data.scatter[index] - damping * data.scatterVelocity[index]) * dt;
          data.scatter[index] += data.scatterVelocity[index] * dt;
        }
        scatterX = data.scatter[local] * insideOrb;
        scatterY = data.scatter[local + 1] * insideOrb;
        scatterZ = data.scatter[local + 2] * insideOrb;
      }
      pos[o] = x * entrance + data.random[o] * (1 - entrance) + data.offset[o] + scatterX;
      pos[o + 1] = y * entrance + data.random[o + 1] * (1 - entrance) + data.offset[o + 1] + scatterY;
      pos[o + 2] = z * entrance + data.random[o + 2] * (1 - entrance) + data.offset[o + 2] + scatterZ;
    }
    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <group>
      <points geometry={geometry} material={material} frustumCulled={false} />
      <GlobeOrbitalRings lightTheme={lightTheme} uOrbRef={uOrbRef} />
    </group>
  );
}
