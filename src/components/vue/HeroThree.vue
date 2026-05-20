<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'

// ── Constants ──────────────────────────────────────────────────────────────────
const SCROLL_MULTIPLIER = 5        // wrapper height = N × 100vh
const CAM_START  = { x: 0, y: 3.5, z: 22 }
const CAM_PANO   = { x: -3, y: 13, z: -60 }
const LETTERS    = ['G', 'A', 'R', 'D', 'E', 'E']
const LETTER_Z0  = -14             // Z of first letter
const LETTER_DZ  = -15             // spacing between letters
const LETTER_SIZE = 3.8
const PHASE_FLY  = 0.80            // 0→PHASE_FLY: camera flies through letters
const PHASE_PANO = 1.0             // PHASE_FLY→PHASE_PANO: rise to panoramic view

// ── Refs ──────────────────────────────────────────────────────────────────────
const wrapperRef = ref<HTMLDivElement | null>(null)
const canvasRef  = ref<HTMLCanvasElement | null>(null)
const loading    = ref(true)
const uiVisible  = ref(false)
const hintVisible = ref(true)

// Three.js state (not reactive – updated per frame)
let renderer: THREE.WebGLRenderer
let scene:    THREE.Scene
let camera:   THREE.PerspectiveCamera
let animId:   number
let scrollProg = 0
let uiShown    = false

// Per-letter materials for opacity fade
const letterMats: THREE.MeshStandardMaterial[][] = []

// ── Seeded RNG ────────────────────────────────────────────────────────────────
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5
    return (s >>> 0) / 0xffffffff
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function ease(t: number) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

// ── Renderer + Scene ──────────────────────────────────────────────────────────
function initRenderer() {
  const canvas = canvasRef.value!
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping  = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.3
  renderer.setClearColor(0x000000, 0)

  scene  = new THREE.Scene()
  scene.fog = new THREE.Fog(0xd4824a, 50, 130)

  const w = canvas.clientWidth, h = canvas.clientHeight
  camera = new THREE.PerspectiveCamera(65, w / h, 0.1, 400)
  camera.position.set(CAM_START.x, CAM_START.y, CAM_START.z)
  renderer.setSize(w, h, false)
}

// ── Lights ────────────────────────────────────────────────────────────────────
function addLights() {
  // Warm hemisphere (sky warm / ground green)
  scene.add(new THREE.HemisphereLight(0xffcc88, 0x4a7c39, 0.7))

  // Golden sun from left-back
  const sun = new THREE.DirectionalLight(0xffaa44, 2.5)
  sun.position.set(-18, 28, 15)
  scene.add(sun)

  // Soft sky fill from right
  const fill = new THREE.DirectionalLight(0x88aae0, 0.35)
  fill.position.set(20, 12, -40)
  scene.add(fill)
}

// ── Ground + Path ─────────────────────────────────────────────────────────────
function addGround() {
  // Main ground
  const geo = new THREE.PlaneGeometry(140, 320)
  const mat = new THREE.MeshStandardMaterial({ color: 0x3d6b2e, roughness: 0.95 })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(0, 0, -130)
  scene.add(mesh)

  // Stone path
  const pathGeo = new THREE.PlaneGeometry(4, 320)
  const pathMat = new THREE.MeshStandardMaterial({ color: 0xb8a882, roughness: 0.98 })
  const path = new THREE.Mesh(pathGeo, pathMat)
  path.rotation.x = -Math.PI / 2
  path.position.set(0, 0.01, -130)
  scene.add(path)
}

// ── Trees ─────────────────────────────────────────────────────────────────────
function addTrees() {
  const trunkMat   = new THREE.MeshStandardMaterial({ color: 0x6b3a1f, roughness: 0.9 })
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x2a5518, roughness: 0.85 })

  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.32, 3.0, 6)
  const cones = [
    new THREE.ConeGeometry(2.2, 4.5, 7),
    new THREE.ConeGeometry(1.6, 3.8, 7),
    new THREE.ConeGeometry(0.95, 2.8, 7),
  ]
  const coneY = [4.8, 7.4, 9.6]

  const r = rng(42)
  for (let i = 0; i < 26; i++) {
    const z = -4 - i * 5.2
    for (const side of [-1, 1]) {
      const g = new THREE.Group()
      g.add(Object.assign(new THREE.Mesh(trunkGeo, trunkMat), { position: new THREE.Vector3(0, 1.5, 0) }))
      cones.forEach((cg, ci) => {
        const m = new THREE.Mesh(cg, foliageMat)
        m.position.y = coneY[ci]
        g.add(m)
      })
      const s = 0.55 + r() * 0.65
      g.scale.set(s, s * (0.85 + r() * 0.3), s)
      g.position.set(side * (7.5 + r() * 3.5), 0, z + r() * 2.5 - 1.2)
      g.rotation.y = (r() - 0.5) * 0.3
      scene.add(g)
    }
  }
}

// ── Flowers ───────────────────────────────────────────────────────────────────
function addFlowers() {
  const COLORS = [0xffd700, 0xff69b4, 0xff4500, 0xf5f5f0, 0x9b59b6, 0xe74c3c, 0xf39c12]
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x4a8a2a })
  const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.9, 4)
  const headGeo = new THREE.SphereGeometry(0.2, 6, 5)
  const r = rng(77)
  for (let i = 0; i < 110; i++) {
    const z = -2 - r() * 100
    const x = (r() > 0.5 ? 1 : -1) * (2.8 + r() * 5.5)
    const g = new THREE.Group()
    g.add(Object.assign(new THREE.Mesh(stemGeo, stemMat), { position: new THREE.Vector3(0, 0.45, 0) }))
    const hm = new THREE.Mesh(headGeo, new THREE.MeshStandardMaterial({
      color: COLORS[Math.floor(r() * COLORS.length)], roughness: 0.7
    }))
    hm.position.y = 0.92
    g.add(hm)
    const s = 0.6 + r() * 0.9
    g.scale.setScalar(s)
    g.position.set(x, 0, z)
    scene.add(g)
  }
}

// ── Particles (pollen / fireflies) ───────────────────────────────────────────
let particlePositions: Float32Array
let particleGeo: THREE.BufferGeometry
function addParticles() {
  const N = 250
  particlePositions = new Float32Array(N * 3)
  const r = rng(999)
  for (let i = 0; i < N; i++) {
    particlePositions[i*3]   = (r() - 0.5) * 35
    particlePositions[i*3+1] = 0.5 + r() * 6
    particlePositions[i*3+2] = -r() * 110
  }
  particleGeo = new THREE.BufferGeometry()
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
  scene.add(new THREE.Points(particleGeo, new THREE.PointsMaterial({
    color: 0xffdd99, size: 0.07, transparent: true, opacity: 0.65, sizeAttenuation: true
  })))
}

// ── GARDEE Topiaries ──────────────────────────────────────────────────────────
async function addLetters(): Promise<void> {
  return new Promise(resolve => {
    const loader = new FontLoader()
    loader.load('/fonts/helvetiker_bold.typeface.json', font => {
      const bumpGeo = new THREE.SphereGeometry(0.28, 5, 4)
      const r = rng(31415)

      LETTERS.forEach((char, i) => {
        const textGeo = new TextGeometry(char, {
          font,
          size:          LETTER_SIZE,
          depth:         0.9,
          curveSegments: 5,
          bevelEnabled:  true,
          bevelThickness: 0.12,
          bevelSize:      0.06,
          bevelSegments:  2,
        })
        textGeo.computeBoundingBox()
        const bb = textGeo.boundingBox!
        const cx = (bb.max.x - bb.min.x) / 2

        const mats: THREE.MeshStandardMaterial[] = []
        const letterZ = LETTER_Z0 + i * LETTER_DZ

        const makeMat = (hex: number) => {
          const m = new THREE.MeshStandardMaterial({
            color: hex, roughness: 0.95, metalness: 0,
            transparent: true, opacity: 1,
          })
          mats.push(m)
          return m
        }

        const group = new THREE.Group()

        // Main letter mesh
        group.add(new THREE.Mesh(textGeo, makeMat(0x2d5a1b)))

        // Bush bumps for topiary texture
        for (let b = 0; b < 18; b++) {
          const bump = new THREE.Mesh(bumpGeo, makeMat(b % 2 === 0 ? 0x3a6b22 : 0x224510))
          bump.position.set(
            bb.min.x + r() * (bb.max.x - bb.min.x),
            bb.min.y + r() * (bb.max.y - bb.min.y),
            bb.max.z + 0.1 + r() * 0.5,
          )
          const bs = 0.7 + r() * 0.6
          bump.scale.setScalar(bs)
          group.add(bump)
        }

        // Subtle lean / scale variation
        group.position.set(-cx, 0.15, letterZ)
        group.rotation.y = (r() - 0.5) * 0.08
        group.scale.set(1, 0.92 + r() * 0.16, 1)

        letterMats.push(mats)
        scene.add(group)
      })
      resolve()
    })
  })
}

// ── Scroll ────────────────────────────────────────────────────────────────────
function onScroll() {
  const el = wrapperRef.value
  if (!el) return
  const rect  = el.getBoundingClientRect()
  const total = el.offsetHeight - window.innerHeight
  scrollProg  = Math.min(1, Math.max(0, -rect.top / total))
  if (scrollProg > 0.04) hintVisible.value = false
}

// ── Animation loop ────────────────────────────────────────────────────────────
const timer = new THREE.Timer()
let t0 = 0   // absolute time for particles

function tick() {
  animId = requestAnimationFrame(tick)
  timer.update()
  const dt = timer.getDelta()
  t0 += dt

  // ── Camera ──────────────────────────────────────────────────
  const p = scrollProg
  if (p <= PHASE_FLY) {
    const t = ease(p / PHASE_FLY)
    const endZ = LETTER_Z0 + (LETTERS.length - 1) * LETTER_DZ + 8
    camera.position.z = lerp(CAM_START.z, endZ, t)
    camera.position.y = CAM_START.y + Math.sin(t * Math.PI * 0.5) * 0.4
    camera.position.x = Math.sin(t * Math.PI * 1.2) * 0.6
    camera.lookAt(camera.position.x * 0.3, 1.8, camera.position.z - 12)
  } else {
    const t = ease(Math.min(1, (p - PHASE_FLY) / (PHASE_PANO - PHASE_FLY)))
    const fromZ = LETTER_Z0 + (LETTERS.length - 1) * LETTER_DZ + 8
    camera.position.z = lerp(fromZ, CAM_PANO.z, t)
    camera.position.y = lerp(CAM_START.y, CAM_PANO.y, t)
    camera.position.x = lerp(camera.position.x, CAM_PANO.x, 0.04)
    camera.lookAt(0, 1.5, camera.position.z - 18)

    if (t > 0.75 && !uiShown) {
      uiShown    = true
      uiVisible.value = true
    }
  }

  // ── Letter opacity fade ──────────────────────────────────────
  letterMats.forEach((mats, i) => {
    const lz    = LETTER_Z0 + i * LETTER_DZ
    const passed = lz - camera.position.z   // positive = letter is behind camera
    const op    = passed < -1 ? 1 : Math.max(0, 1 - (passed + 1) / 9)
    mats.forEach(m => { m.opacity = op })
  })

  // ── Particles drift ──────────────────────────────────────────
  if (particleGeo) {
    for (let i = 0; i < 250; i++) {
      particlePositions[i*3+1] += Math.sin(t0 * 0.8 + i * 0.7) * 0.0015
    }
    particleGeo.attributes.position.needsUpdate = true
  }

  renderer.render(scene, camera)
}

// ── Resize ────────────────────────────────────────────────────────────────────
function onResize() {
  const canvas = canvasRef.value!
  const w = canvas.clientWidth, h = canvas.clientHeight
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(async () => {
  initRenderer()
  addLights()
  addGround()
  addTrees()
  addFlowers()
  addParticles()
  await addLetters()
  loading.value = false
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize)
  tick()
})

onUnmounted(() => {
  cancelAnimationFrame(animId)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onResize)
  renderer?.dispose()
})
</script>

<template>
  <!-- Tall wrapper drives scroll-based animation -->
  <div ref="wrapperRef" class="hero-wrapper" :style="`height: ${SCROLL_MULTIPLIER * 100}vh`">
    <div class="canvas-sticky">

      <!-- WebGL canvas -->
      <canvas ref="canvasRef" class="hero-canvas"></canvas>

      <!-- Loading veil -->
      <Transition name="fade">
        <div v-if="loading" class="loading-veil">
          <div class="loading-dot"></div>
          <div class="loading-dot" style="animation-delay:.2s"></div>
          <div class="loading-dot" style="animation-delay:.4s"></div>
        </div>
      </Transition>

      <!-- Fixed headline — visible throughout scroll -->
      <div class="fixed-headline" :class="{ 'dim': uiVisible }">
        <span class="hl-eyebrow">La plateforme jardinage de confiance</span>
        <h1>Trouvez votre<br><em>meilleur jardinier</em></h1>
      </div>

      <!-- Post-animation UI -->
      <Transition name="ui-rise">
        <div v-if="uiVisible" class="scene-ui">
          <div class="scene-left">
            <img src="/logo.png" alt="Gardee" class="scene-logo" />
            <p class="scene-tagline">La plateforme jardinage<br>de confiance</p>
          </div>
          <div class="scene-center">
            <form class="scene-search" action="/classement" method="get">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input name="q" type="search" placeholder="Service, jardinier, ville…" autocomplete="off" />
              <button type="submit">Rechercher</button>
            </form>
            <div class="scene-ctas">
              <a href="/carte" class="cta-btn cta-secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
                Voir la carte
              </a>
              <a href="/classement" class="cta-btn cta-primary">
                Classement →
              </a>
              <a href="/postuler" class="cta-btn cta-ghost">Devenir prestataire</a>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Scroll hint arrow -->
      <Transition name="fade">
        <div v-if="hintVisible && !loading" class="scroll-hint">
          <span>Découvrir</span>
          <div class="scroll-arrow"></div>
        </div>
      </Transition>

    </div>
  </div>
</template>

<style scoped>
/* ── Layout ─────────────────────────────────────────────────── */
.hero-wrapper { position: relative; }

.canvas-sticky {
  position: sticky;
  top: 56px; /* navbar height */
  height: calc(100vh - 56px);
  overflow: hidden;
  background: linear-gradient(
    to bottom,
    #0d1b2a  0%,
    #1b3a5c 20%,
    #c97a3c 55%,
    #e8954d 78%,
    #f5c06b 100%
  );
}

.hero-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* ── Loading ─────────────────────────────────────────────────── */
.loading-veil {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  gap: 10px;
  background: rgba(13, 27, 42, 0.8);
  z-index: 10;
}
.loading-dot {
  width: 10px; height: 10px;
  background: #f5c06b; border-radius: 50%;
  animation: dotPulse 1s ease-in-out infinite;
}
@keyframes dotPulse {
  0%,100% { transform: scale(.6); opacity: .3; }
  50%      { transform: scale(1.0); opacity: 1; }
}

/* ── Fixed Headline ──────────────────────────────────────────── */
.fixed-headline {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 5;
  pointer-events: none;
  transition: opacity 0.8s ease;
  filter: drop-shadow(0 2px 18px rgba(0,0,0,0.55));
}
.fixed-headline.dim { opacity: 0; }

.hl-eyebrow {
  display: block;
  font-size: clamp(0.65rem, 1.8vw, 0.85rem);
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #f5c06b;
  margin-bottom: 0.6rem;
}

.fixed-headline h1 {
  font-size: clamp(2.4rem, 7vw, 5.5rem);
  font-weight: 900;
  line-height: 1.08;
  color: #fff;
  margin: 0;
  letter-spacing: -0.02em;
}
.fixed-headline h1 em {
  font-style: normal;
  color: #f5c06b;
}

/* ── Post-animation UI ───────────────────────────────────────── */
.scene-ui {
  position: absolute; inset: 0;
  display: flex; align-items: center;
  padding: 0 3rem;
  gap: 3rem;
  z-index: 6;
  background: linear-gradient(
    to bottom,
    rgba(10,20,35,0.45) 0%,
    rgba(10,20,35,0.25) 60%,
    rgba(10,20,35,0.5) 100%
  );
}

.scene-left {
  flex: 0 0 220px;
  display: flex; flex-direction: column; gap: 0.875rem;
}
.scene-logo {
  width: 160px;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.4));
}
.scene-tagline {
  color: rgba(255,255,255,0.75);
  font-size: 0.85rem;
  line-height: 1.5;
  margin: 0;
}

.scene-center {
  flex: 1;
  max-width: 520px;
  display: flex; flex-direction: column; gap: 1.25rem;
}

.scene-search {
  display: flex; align-items: center;
  background: rgba(255,255,255,0.95);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.25);
}
.scene-search svg {
  width: 18px; height: 18px;
  color: #9ca3af; flex-shrink: 0; margin-left: 1rem;
}
.scene-search input {
  flex: 1;
  padding: 0.85rem 0.75rem;
  border: none; outline: none;
  font-size: 0.95rem; color: #1a1a0e;
  background: transparent;
}
.scene-search input::placeholder { color: #b8b0a0; }
.scene-search button {
  padding: 0.85rem 1.5rem;
  background: #515F37; color: #fff;
  border: none; cursor: pointer;
  font-weight: 700; font-size: 0.9rem;
  transition: background 0.15s;
  white-space: nowrap;
}
.scene-search button:hover { background: #3d4a28; }

.scene-ctas {
  display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
}
.cta-btn {
  padding: 0.6rem 1.25rem;
  border-radius: 10px;
  text-decoration: none;
  font-weight: 700; font-size: 0.875rem;
  transition: all 0.15s;
  display: inline-flex; align-items: center; gap: 0.4rem;
}
.cta-primary { background: #515F37; color: #fff; }
.cta-primary:hover { background: #3d4a28; }
.cta-secondary { background: rgba(255,255,255,0.18); color: #fff; border: 1.5px solid rgba(255,255,255,0.5); }
.cta-secondary:hover { background: rgba(255,255,255,0.3); }
.cta-ghost { color: rgba(255,255,255,0.75); font-weight: 500; font-size: 0.82rem; }
.cta-ghost:hover { color: #fff; }

/* ── Scroll hint ─────────────────────────────────────────────── */
.scroll-hint {
  position: absolute;
  bottom: 2rem; left: 50%;
  transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
  color: rgba(255,255,255,0.6);
  font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase;
  z-index: 5; pointer-events: none;
}
.scroll-arrow {
  width: 20px; height: 20px;
  border-right: 2px solid rgba(255,255,255,0.5);
  border-bottom: 2px solid rgba(255,255,255,0.5);
  transform: rotate(45deg);
  animation: arrowBounce 1.4s ease-in-out infinite;
}
@keyframes arrowBounce {
  0%,100% { transform: rotate(45deg) translateY(0); opacity: .4; }
  50%      { transform: rotate(45deg) translateY(5px); opacity: 1; }
}

/* ── Transitions ─────────────────────────────────────────────── */
.fade-enter-active, .fade-leave-active { transition: opacity 0.6s ease; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }

.ui-rise-enter-active { transition: opacity 0.9s ease, transform 0.9s ease; }
.ui-rise-leave-active { transition: opacity 0.4s ease; }
.ui-rise-enter-from   { opacity: 0; transform: translateY(20px); }
.ui-rise-leave-to     { opacity: 0; }

/* ── Responsive ──────────────────────────────────────────────── */
@media (max-width: 900px) {
  .scene-left { display: none; }
  .scene-ui { padding: 0 1.5rem; justify-content: center; }
  .scene-center { max-width: 100%; }
}

@media (max-width: 600px) {
  .canvas-sticky { top: 56px; }
  .fixed-headline h1 { font-size: clamp(2rem, 10vw, 3rem); }
  .scene-search button { padding: 0.85rem 1rem; font-size: 0.82rem; }
  .scene-ctas { gap: 0.5rem; }
  .cta-btn { padding: 0.5rem 0.9rem; font-size: 0.8rem; }
}
</style>
