export const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
export const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
export const hash = n => { const x = Math.sin(n * 127.1 + 31.7) * 43758.5453; return x - Math.floor(x); };

// Canvas is only a sampling surface: every visible glyph is a 3D point.
export function textCloud(word, count, { spread = 3.35 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 1600; canvas.height = 260;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.font = '700 205px Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
  ctx.fillText(word, 800, 130, 1510);
  const pixels = ctx.getImageData(0, 0, 1600, 260).data, samples = [];
  for (let y = 0; y < 260; y += 3) for (let x = 0; x < 1600; x += 3) {
    if (pixels[(y * 1600 + x) * 4 + 3] > 180) samples.push([x, y]);
  }
  const result = new Float32Array(count * 3);
  // Stratified sampling covers the entire silhouette without sparse letter edges.
  for (let i = 0; i < count; i++) {
    const [x, y] = samples[Math.min(samples.length - 1, Math.floor((i + hash(i)) / count * samples.length))];
    result[i * 3] = (x / 1600 - .5) * spread;
    result[i * 3 + 1] = -(y / 1600 - .5 * 260 / 1600) * spread;
    result[i * 3 + 2] = (hash(i + 87) - .5) * .075;
  }
  return result;
}
export function createParticleData(count) {
  const sphere = new Float32Array(count * 3), clusters = new Float32Array(count * 3);
  const random = new Float32Array(count * 3), colors = new Float32Array(count * 3);
  const centers = [[-1.65, 0, 0], [0, .35, 0], [1.65, 0, 0]];
  for (let i = 0; i < count; i++) {
    const y = 1 - 2 * (i + .5) / count, a = i * 2.39996323;
    // Fine, coherent shell plus a sparse outer atmosphere of drifting dust.
    const dust = hash(i + 17) > .93;
    const r = 2.08 + (hash(i + 3) - .5) * .035 + (dust ? .10 + hash(i + 61) * .30 : 0), ring = Math.sqrt(1 - y * y);
    const o = i * 3, c = centers[i % 3];
    sphere[o] = Math.cos(a) * ring * r; sphere[o + 1] = y * r; sphere[o + 2] = Math.sin(a) * ring * r;
    const cr = Math.cbrt(hash(i + 41)) * .65;
    clusters[o] = c[0] + Math.cos(a) * ring * cr; clusters[o + 1] = c[1] + y * cr; clusters[o + 2] = Math.sin(a) * ring * cr;
    for (let j = 0; j < 3; j++) random[o + j] = (hash(i + j * 37 + 79) - .5) * 9;
    const silver = hash(i + 100) > .72;
    colors[o] = silver ? .90 : .655; colors[o + 1] = silver ? .89 : .545; colors[o + 2] = silver ? 1 : .98;
  }
  return { sphere, clusters, random, colors };
}
