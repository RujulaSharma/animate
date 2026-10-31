# DevHarbour — Cosmic Particle Earth Orb & Holographic Platform

A futuristic, high-performance interactive 3D particle universe built with **Next.js**, **Three.js**, and **React Three Fiber**.

Featuring a glowing **Digital Particle Earth** with geographical continent detection, delicate 3D orbital trajectory loops, and an open, tilted concentric holographic energy platform.

![DevHarbour Cosmic Orb Preview](public/standalone-orb.html)

---

## 🌟 Key Features

1. **Digital Particle Earth (Globe)**
   - Procedural spherical continent mapping across Earth's major landmasses (North America, South America, Europe, Africa, Asia, India, Australia).
   - Multi-tiered particle illumination: electric-violet and luminous white particles on land, deep cosmic indigo starry matrix across the oceans.
   - Heightened Fresnel atmospheric rim lighting (`pow(1.0 - abs(dot(n, viewDir)), 1.8)`) creating a vivid violet corona.
   - Shimmer and organic fluid surface ripple waves.

2. **Delicate 3D Orbital Rings**
   - 5 continuous 3D elliptical wireframe trajectories wrapping around the globe at different inclination angles.
   - Smooth, elegant, and non-distracting wireframe tracks with soft additive bloom.

3. **Tilted Concentric Holographic Energy Platform**
   - 6 wide concentric circular tracks tilted at $\approx 24^\circ$ ($0.42\text{ rad}$) in perspective directly beneath the floating globe.
   - Dotted matrix grid platform floor with specular flares at the left and right perspective horizons.
   - Luminous purple ground reflection pool simulating light cast onto a glossy stage floor.

4. **Interactive DevHarbour Wordmark & Controls**
   - Pointer / touch drag rotation with inertia and spring physics.
   - Click to morph smoothly between the Digital Earth globe and the `DEVHARBOUR` 3D particle wordmark.
   - Double-tap or press <kbd>C</kbd> to transition into cluster formations; press <kbd>Esc</kbd> to return.
   - Dark / Light mode toggle with smooth particle shader palette adaptation.
   - Animated mouse "SCROLL TO EXPLORE" indicator.

5. **Standalone Portable Options**
   - **React / Next.js Component**: [`components/home/StandaloneHeroOrb.tsx`](components/home/StandaloneHeroOrb.tsx) (100% self-contained, drop into any project).
   - **Zero-Build HTML Demo**: [`public/standalone-orb.html`](public/standalone-orb.html) (double-click to run in any browser via CDN Three.js).

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm / npm / yarn

### Installation
```bash
# Install dependencies
pnpm install
# or
npm install
```

### Development Server
```bash
# Start development server on port 3005
pnpm dev -p 3005
# or
npm run dev -- -p 3005
```

Open [http://localhost:3005](http://localhost:3005) in your browser.

To view the standalone zero-build version directly:
Open [http://localhost:3005/standalone-orb.html](http://localhost:3005/standalone-orb.html) or open `public/standalone-orb.html` directly in your browser.

---

## 📁 Project Structure

```
final/
├── app/                        # Next.js App Router (layout, page, providers)
├── components/
│   └── home/
│       ├── StandaloneHeroOrb.tsx # Complete all-in-one standalone component
│       ├── standalone-orb.jsx    # Core digital Earth orb mesh & shaders
│       ├── saturn-orbit.tsx      # Tilted concentric holographic platform
│       ├── particle-universe.tsx # Full universe scene manager & UI
│       ├── hero.tsx              # Hero section & ambient cosmic aura
│       └── theme-toggle.tsx      # Light/dark theme provider
├── lib/
│   ├── standalone-orb-particles.js # Continent polygons, particle sampling, textCloud
│   └── universe.ts                 # Cluster coordinates & math helpers
├── public/
│   └── standalone-orb.html     # Pure standalone HTML / Three.js demo
└── README.md
```

---

## 🛠️ Tech Stack
- **Framework:** Next.js 16 (Turbopack) & React 19
- **3D Graphics:** Three.js & @react-three/fiber
- **Styling & UI:** Tailwind CSS, Lucide React, Motion (Framer Motion)
- **Language:** TypeScript & JavaScript (GLSL shaders)
