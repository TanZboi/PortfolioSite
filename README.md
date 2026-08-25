# Game Boy Splat Portfolio

An interactive portfolio built around a real-time 3D Gaussian Splat scan of a real Game Boy.
Orbit it, click into it, blow it apart. Built with [Three.js](https://threejs.org/) and
[Spark](https://sparkjs.dev/) (`@sparkjsdev/spark`) — no React, no game engine, direct
scene-graph control throughout.

## Stack

- **Vite** + **TypeScript** (strict mode) — vanilla, no framework
- **Three.js** for the scene graph, camera, and `OrbitControls`
- **Spark** for splat rendering and its Dyno shader-graph system (the explode effect)
- Plain HTML/CSS/TS for all UI — a small `el()` helper (`src/utils/dom.ts`) stands in for JSX

## Getting started

```bash
npm install
npm run dev
```

```bash
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build locally
```

The splat asset lives at `public/SplatExport.ply` (~6.6MB, SH degree 3, compressed PLY —
trained in Brush, cleaned/cropped in SuperSplat). It's fetched at runtime, not bundled.

## Architecture

```
src/
  app/App.ts              orchestrates everything below; owns the render loop
  scene/                   renderer/camera bootstrap + OrbitControls wrapper
  splat/
    loadGameBoySplat.ts    loads the SplatMesh, computes its bounding box/center/radius
    explode.ts             the Dyno objectModifier that drives the explode gizmo
  zones/                   invisible click hitboxes + angle-based show/hide
  ui/                      HUD, loading screen, panel overlay + per-panel renderers
  content/                 resume / projects / about data (edit these, not the panels)
  game/                    the original CRT-styled Snake clone
  debug/                   dev-only scene inspection + zone-tuning overlay
```

`App.ts` is intentionally the only place that wires subsystems together — everything else
is independently testable and doesn't know about the others.

## The explode effect

`src/splat/explode.ts` builds a Spark Dyno shader graph (`SplatMesh.objectModifier`) that
offsets every splat's center on the GPU, following the pattern from Spark's own "Particle
Simulation" example. Per-splat variety (direction, distance, timing, a bit of sideways
flutter) comes entirely from hashing each splat's own index inside the shader — there's no
CPU-side per-splat work, so it costs the same whether the splat has 10k or 10M points.

`ExplodeEffect.update(dt)` runs a small state machine (`idle → exploding → held →
reassembling → idle`) that writes an eased `progress` value (0→1→0) into a uniform each
frame; the shader does the rest.

## Interaction zones

Each clickable region (screen, D-pad/buttons, cartridge slot, battery cover) is an invisible
box proxy, positioned as **fractions of the splat's bounding box** rather than hardcoded
world coordinates — see `src/zones/zoneConfig.ts`. A zone is only clickable when the camera
is roughly facing it: `dot(cameraDirection, zone.normal) > visibilityThreshold`.

### ⚠️ Tuning the zones

The fractions in `zoneConfig.ts` are a first-pass guess based on generic Game Boy
proportions and the loaded splat's bounding box — they have **not** been visually verified
against this specific scan/crop yet. To tune them:

1. `npm run dev`, open the site, press **`` ` ``** to toggle the debug overlay.
2. The hitboxes render as visible wireframe boxes; the overlay in the bottom-left prints
   live camera azimuth/polar and each zone's world position.
3. Rotate the camera to compare the boxes against the actual screen/D-pad/cartridge
   slot/battery cover, and edit the `at` / `extent` / `normal` fractions in
   `zoneConfig.ts` — Vite's HMR reflects the change instantly, no reload needed.
4. If a zone's normal is pointing the wrong way (e.g. "front" turns out to be −Z instead
   of +Z in this particular export), flip the sign on that axis for every zone — it's a
   one-line change per zone.

This also doubles as the escape hatch for anything else about the loaded scene: dev builds
expose `window.__gb` (scene, camera, mesh, bounds, cameraRig) in the console.

## Content

Edit these — not the panel renderers — to update what's on the site:

- `src/content/resumeData.ts` — experience, education, skills
- `src/content/projectsData.ts` — the "cartridges" shown in the projects panel
- `src/content/aboutData.ts` — bio + contact links

Anything in `[SQUARE BRACKETS]` is a placeholder. In particular, **contact links in
`aboutData.ts` are unset** — fill in a real email/GitHub/LinkedIn before deploying.

## The mini-game

`src/game/CrtSnakeGame.ts` is an original grid-snake clone (not a ROM, not an emulator, no
licensed assets) — per the project's IP constraints, the D-pad/buttons zone links to this
instead of anything Nintendo-owned. Arrow keys or WASD; best score persists in
`localStorage`. The CRT look (scanlines/vignette/flicker) is a CSS overlay in
`src/styles/game.css`, layered over a flat four-shade-green canvas render.

## Known gaps / next steps

- **Zone coordinates need a visual tuning pass** (see above) — first-pass estimates only.
- **Resume/projects/about content is placeholder** — see `src/content/*`.
- **No favicon of your own yet** — `public/favicon.svg` is still the Vite default.
- **Hosting target is TBD** — the build is a static `dist/` folder, so Vercel, Netlify, and
  GitHub Pages all work with zero config changes. Netlify/Vercel are the simpler choice if
  you want clean asset caching headers for the 6.6MB PLY; GitHub Pages works too but you'd
  want to double check large-file limits (PLY is under GitHub's 100MB hard limit, well
  under Pages' bandwidth-friendly range).
- Not yet a git repository — run `git init` when you're ready to start committing.
