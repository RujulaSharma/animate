import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { clamp, smooth, hash, createParticleData, textCloud } from '../utils/particles';

const vertexShader = `
attribute vec3 color;
attribute float aSeed;
attribute float aText;
uniform float uTime;
uniform float uDpr;
uniform float uHover;
uniform float uOrb;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec3 p = position;
  vec3 n = normalize(p + vec3(.0001));
  float shell = (1. - aText) * uOrb;
  // Coherent travelling waves give the shell a fluid surface, without frame uploads.
  float wave = sin(p.y * 4.5 + p.x * 1.7 - uTime * .65)
             * sin(p.z * 3.4 - p.y * 1.3 + uTime * .42);
  float fine = sin(p.x * 11. + p.z * 7. + uTime * .8) * .012;
  p += n * (wave * .065 + fine) * shell;
  p.x += sin(p.y * 3. + uTime * .38) * .028 * shell;
  p.z += cos(p.y * 4. - uTime * .32) * .025 * shell;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec3 viewDir = normalize(vec3(0., 0., 6.6) - p);
  float rim = pow(1. - abs(dot(n, viewDir)), 2.2);
  float key = pow(max(0., dot(n, normalize(vec3(-.85, .85, 1.0)))), 2.);
  float front = smoothstep(-.8, 1.4, p.z);
  float light = .10 + key * .9 + rim * .75;
  float shimmer = .88 + .12 * sin(uTime * (1.2 + uHover * aText * 8.) + aSeed * 80.);
  vec3 shellColor = mix(vec3(.40, .24, .76), vec3(.94, .92, 1.), clamp(key + rim * .7, 0., 1.));
  vColor = mix(mix(color, shellColor, uOrb) * mix(1.15, light * 1.5, uOrb), color * (1.55 + uHover * .65), aText) * shimmer;
  vAlpha = mix(mix(.72, (.12 + front * .62) * (.38 + rim * .7 + key * .8), uOrb), .95, aText);
  gl_PointSize = clamp((aText > .5 ? 2.3 : 1.25 + aSeed * 1.5) * uDpr * 6. / -mv.z, 1., 7. * uDpr);
  gl_Position = projectionMatrix * mv;
}`;
const fragmentShader = `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float r = length(gl_PointCoord - .5) * 2.;
  if (r > 1.) discard;
  float core = exp(-r * r * 13.);
  float halo = exp(-r * r * 3.) * .20;
  gl_FragColor = vec4(vColor, (core + halo) * vAlpha);
}`;

function ParticleField({ count, mode, pointer, gesture, reduced, stage }) {
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
    return geo;
  }, [count, data]);
  const material = useMemo(() => new THREE.ShaderMaterial({ vertexShader, fragmentShader,
    uniforms: { uTime: { value: 0 }, uDpr: { value: 1 }, uHover: { value: 0 }, uOrb: { value: 1 } },
    transparent: true, depthWrite: false, vertexColors: false, blending: THREE.AdditiveBlending }), []);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  useFrame(({ viewport, gl, camera, size }, delta) => {
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
    if (stage.current) {
      stage.current.dataset.interaction = movingText ? 'moving-text' : g.dragging ? 'rotating' : g.textHover ? 'text-hover' : 'idle';
      stage.current.style.setProperty('--cursor-x', `${50 + p.x * 30}%`);
      stage.current.style.setProperty('--cursor-y', `${50 - p.y * 30}%`);
      stage.current.style.setProperty('--cursor-glow', p.active ? '.7' : '0');
    }
  });
  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
function canWebGL() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}
export default function ParticleOrb({ mode, setMode, onCluster }) {
  const [supported] = useState(canWebGL);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [mobile, setMobile] = useState(() => innerWidth < 700);
  const stage = useRef();
  const pointer = useRef({ x: 0, y: 0, active: false });
  const gesture = useRef({ dragging: false, id: null, dx: 0, dy: 0, vx: 0, vy: 0 });
  const origin = useRef({});
  const clickTimer = useRef(), resetTimer = useRef(), lastTap = useRef(0);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(media.matches), resize = () => setMobile(innerWidth < 700);
    media.addEventListener('change', change); window.addEventListener('resize', resize);
    return () => { media.removeEventListener('change', change); window.removeEventListener('resize', resize); clearTimeout(clickTimer.current); clearTimeout(resetTimer.current); };
  }, []);
  const activateWord = () => {
    clearTimeout(resetTimer.current); setMode('word');
    resetTimer.current = setTimeout(() => setMode('orb'), reduced ? 1800 : 4600);
  };
  const toggleClusters = () => { clearTimeout(resetTimer.current); setMode(mode === 'clusters' ? 'orb' : 'clusters'); };
  const updatePointer = event => {
    const r = event.currentTarget.getBoundingClientRect();
    pointer.current = { x: clamp((event.clientX - r.left) / r.width * 2 - 1, -1, 1), y: -clamp((event.clientY - r.top) / r.height * 2 - 1, -1, 1), active: true };
  };
  const down = event => {
    if (gesture.current.id !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    updatePointer(event); clearTimeout(clickTimer.current);
    event.currentTarget.setPointerCapture(event.pointerId);
    const target = gesture.current.pickText?.(pointer.current.x, pointer.current.y) ? 'text' : 'sphere';
    Object.assign(gesture.current, { dragging: true, target, id: event.pointerId, vx: 0, vy: 0, dx: 0, dy: 0 });
    origin.current = { x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, moved: false };
  };
  const move = event => {
    if (gesture.current.id !== null && event.pointerId !== gesture.current.id) return;
    updatePointer(event);
    const g = gesture.current, o = origin.current;
    if (!g.dragging) return;
    if (Math.hypot(event.clientX - o.x, event.clientY - o.y) > 7) { o.moved = true; lastTap.current = 0; }
    g.dx += event.clientX - o.lastX; g.dy += event.clientY - o.lastY;
    o.lastX = event.clientX; o.lastY = event.clientY;
  };
  const finish = (event, cancel = false) => {
    if (gesture.current.id !== event.pointerId) return;
    gesture.current.dragging = false; gesture.current.id = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (event.pointerType !== 'mouse') pointer.current.active = false;
    if (cancel || origin.current.moved) { lastTap.current = 0; return; }
    const now = performance.now();
    if (lastTap.current && now - lastTap.current < 310) {
      clearTimeout(clickTimer.current); lastTap.current = 0; toggleClusters();
    } else {
      lastTap.current = now;
      clickTimer.current = setTimeout(() => { lastTap.current = 0; activateWord(); }, 310);
    }
  };
  return <div ref={stage} className="orb-stage" data-mode={mode} aria-label="Interactive DevHarbour particle sculpture">
    <div className="orb-aura" aria-hidden="true" />
    {supported ? <div className="orb-canvas" onPointerDown={down} onPointerMove={move} onPointerUp={finish} onPointerCancel={e => finish(e, true)} onLostPointerCapture={e => { if (gesture.current.id === e.pointerId) finish(e, true); }} onPointerLeave={() => { pointer.current.active = false; }}>
      <Canvas camera={{ position: [0, 0, 6.6], fov: 45 }} dpr={[1, mobile ? 1.4 : 1.75]} gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}>
        <ParticleField count={mobile ? 14000 : 29000} mode={mode} pointer={pointer} gesture={gesture} reduced={reduced} stage={stage} />
      </Canvas>
    </div> : <div className="webgl-fallback">DevHarbour<span>Enable WebGL to explore the particle universe.</span></div>}
    {mode === 'clusters' && <div className="cluster-hotspots" aria-label="Feature clusters">{['Learn', 'Build', 'Connect'].map(item => <button key={item} className="cluster-hotspot" onClick={() => onCluster(item)}>Explore {item} <span>↗</span></button>)}</div>}
    <div className="orbit-instructions"><span className="instruction-dot"/> GRAB TEXT TO MOVE <span className="dot-separator">·</span> DRAG ORB TO ROTATE <span className="dot-separator">·</span> CLICK TO TRANSFORM</div>
    <div className="orb-keyboard-controls"><button onClick={activateWord}>Morph to text</button><button onClick={toggleClusters}>{mode === 'clusters' ? 'Reset sphere' : 'Explore clusters'}</button></div>
    <span className="sr-only" role="status">{mode === 'word' ? 'Particles forming DEVHARBOUR. The sphere will return shortly.' : mode === 'clusters' ? 'Explore the Learn, Build and Connect clusters.' : 'Particle sphere with DevHarbour lettering. Drag to rotate, click to transform, or use the buttons below.'}</span>
  </div>;
}



