# DevHarbour Particle Homepage

Standalone React + Vite + React Three Fiber + Three.js interactive particle experience.

## Run locally

```bash
npm install
npm run dev -- --port 3002 --strictPort
```

Open http://localhost:3002/.

## Interactions

- Hover to stir nearby particles, shimmer the lettering, and tilt the orb.
- Drag the sphere to rotate with inertia. The inner letter particles scatter and spring back to form DevHarbour.
- Grab the inner wordmark to move it, then release for a spring return.
- Click the sphere to transform into a larger DEVHARBOUR particle wordmark, then reconstruct the sphere.
- Double-click or double-tap to explore Learn, Build, and Connect clusters.
- Use the visible buttons for keyboard-accessible morph and cluster controls.

The custom particle shaders provide flowing surface waves, directional silver-lavender lighting, and glowing points. Letter shapes are sampled from an off-screen canvas and rendered as actual Three.js particle geometry. Mobile devices use fewer particles and a lower pixel ratio. Reduced-motion preferences are respected.

## Production build

```bash
npm run build
npm run preview -- --port 3002
```

This project is independent of the DevHarbour backend. Its particle renderer is an original implementation inspired by the visual reference at Motion.dev.
