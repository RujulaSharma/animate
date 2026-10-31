export const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
export const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
export const hash = n => { const x = Math.sin(n * 127.1 + 31.7) * 43758.5453; return x - Math.floor(x); };

// Point-in-polygon algorithm for geographical landmass detection
function pointInPoly(pt, vs) {
  const x = pt[0], y = pt[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Accurate global continent boundary polygons
const WORLD_CONTINENTS = [
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
];

export function isWorldLand(lon, lat) {
  for (let i = 0; i < WORLD_CONTINENTS.length; i++) {
    if (pointInPoly([lon, lat], WORLD_CONTINENTS[i])) return true;
  }
  return false;
}

// Major developer tech hubs across the digital Earth
const TECH_HUBS = [
  { name: 'SF', lat: 37.77, lon: -122.41 },
  { name: 'NYC', lat: 40.71, lon: -74.00 },
  { name: 'London', lat: 51.50, lon: -0.12 },
  { name: 'Berlin', lat: 52.52, lon: 13.40 },
  { name: 'Bengaluru', lat: 12.97, lon: 77.59 },
  { name: 'Tokyo', lat: 35.68, lon: 139.69 },
  { name: 'Singapore', lat: 1.35, lon: 103.82 },
  { name: 'Sydney', lat: -33.86, lon: 151.20 },
  { name: 'SaoPaulo', lat: -23.55, lon: -46.63 },
  { name: 'Zurich', lat: 47.37, lon: 8.54 }
];

// Canvas is only a sampling surface: every visible glyph is a 3D point.
export function textCloud(word, count, { spread = 3.35 } = {}) {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) return new Float32Array(count * 3);
  canvas.width = 1600; canvas.height = 260;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return new Float32Array(count * 3);
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
    const [x, y] = samples.length > 0 ? samples[Math.min(samples.length - 1, Math.floor((i + hash(i)) / count * samples.length))] : [800, 130];
    result[i * 3] = (x / 1600 - .5) * spread;
    result[i * 3 + 1] = -(y / 1600 - .5 * 260 / 1600) * spread;
    result[i * 3 + 2] = (hash(i + 87) - .5) * .075;
  }
  return result;
}

export function createParticleData(count) {
  const sphere = new Float32Array(count * 3);
  const clusters = new Float32Array(count * 3);
  const random = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const land = new Float32Array(count);
  const centers = [[-1.65, 0, 0], [0, .35, 0], [1.65, 0, 0]];

  for (let i = 0; i < count; i++) {
    const y = 1 - 2 * (i + .5) / count;
    const a = i * 2.39996323;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));

    // Convert spherical point to geographic coordinates
    const lat = Math.asin(clamp(y, -1, 1)) * 180 / Math.PI;
    const lon = ((a % (2 * Math.PI)) - Math.PI) * 180 / Math.PI;

    // Check if this point falls on continental land
    const onLand = isWorldLand(lon, lat);
    land[i] = onLand ? 1.0 : 0.0;

    // Fine, coherent shell with subtle elevation for land continents
    const dust = hash(i + 17) > .93;
    const baseR = 2.08 + (onLand ? 0.015 : 0.0);
    const r = baseR + (hash(i + 3) - .5) * 0.035 + (dust ? .10 + hash(i + 61) * .30 : 0);

    const o = i * 3;
    const c = centers[i % 3];
    sphere[o] = Math.cos(a) * ring * r;
    sphere[o + 1] = y * r;
    sphere[o + 2] = Math.sin(a) * ring * r;

    const cr = Math.cbrt(hash(i + 41)) * .65;
    clusters[o] = c[0] + Math.cos(a) * ring * cr;
    clusters[o + 1] = c[1] + y * cr;
    clusters[o + 2] = Math.sin(a) * ring * cr;

    for (let j = 0; j < 3; j++) random[o + j] = (hash(i + j * 37 + 79) - .5) * 9;

    // Palette: glowing electric-white & vivid violet for continents, deep indigo for oceans
    const tone = hash(i + 100);
    if (onLand) {
      if (tone > 0.65) {
        // Brilliant white-lavender core city node
        colors[o] = 0.96; colors[o + 1] = 0.95; colors[o + 2] = 1.0;
      } else {
        // Bright electric violet continent particle
        colors[o] = 0.76; colors[o + 1] = 0.58; colors[o + 2] = 1.0;
      }
    } else {
      if (tone > 0.88) {
        // Subtle sparkling ocean node
        colors[o] = 0.62; colors[o + 1] = 0.44; colors[o + 2] = 0.95;
      } else {
        // Deep indigo ocean base
        colors[o] = 0.32; colors[o + 1] = 0.16; colors[o + 2] = 0.68;
      }
    }
  }

  return { sphere, clusters, random, colors, land };
}
