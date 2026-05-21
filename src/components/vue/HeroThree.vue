<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import { Timer } from 'three'

// ── Constants ──────────────────────────────────────────────────────────────────
const SCROLL_MULTIPLIER = 5
const CAM_START = { x: 0, y: 3.5, z: 22 }
const CAM_PANO  = { x: 0, y: 38,  z: 15 }   // bird's eye pullback
const PANO_LOOK = { x: 0, y: 0,   z: -55 }  // center of letter field
const LETTER_SIZE = 3.8
const PHASE_FLY  = 0.80
const PHASE_PANO = 1.0

// Letters scattered organically — alternating left/right, varying depth
const LETTER_DEFS = [
  { char: 'G', x:  5.5, z: -16,  ry:  0.20 },
  { char: 'A', x: -6.0, z: -30,  ry: -0.15 },
  { char: 'R', x:  4.0, z: -46,  ry:  0.10 },
  { char: 'D', x: -5.5, z: -62,  ry: -0.20 },
  { char: 'E', x:  3.5, z: -78,  ry:  0.08 },
  { char: 'E', x: -4.0, z: -94,  ry: -0.10 },
]
const CAM_FLY_END_Z = LETTER_DEFS[LETTER_DEFS.length - 1].z + 8  // -86

const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

// ── Refs ──────────────────────────────────────────────────────────────────────
const wrapperRef  = ref<HTMLDivElement | null>(null)
const canvasRef   = ref<HTMLCanvasElement | null>(null)
const loading     = ref(true)
const uiVisible   = ref(false)
const hintVisible = ref(true)

let renderer: THREE.WebGLRenderer
let scene:    THREE.Scene
let camera:   THREE.PerspectiveCamera
let animId:   number
let scrollProg = 0
let uiShown    = false

const letterMats: THREE.MeshStandardMaterial[][] = []

// ── Seeded RNG ────────────────────────────────────────────────────────────────
function rng(seed: number) {
  let s = seed >>> 0
  return () => { s ^= s<<13; s ^= s>>>17; s ^= s<<5; return (s>>>0)/0xffffffff }
}

function ease(t: number) { return t<.5 ? 2*t*t : -1+(4-2*t)*t }
function lerp(a: number, b: number, t: number) { return a+(b-a)*t }

// ── Renderer ──────────────────────────────────────────────────────────────────
function initRenderer() {
  const canvas = canvasRef.value!
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.5
  renderer.setClearColor(0x000000, 0)
  scene  = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0xc97840, 0.007)
  const w = canvas.clientWidth, h = canvas.clientHeight
  camera = new THREE.PerspectiveCamera(65, w/h, 0.1, 500)
  camera.position.set(CAM_START.x, CAM_START.y, CAM_START.z)
  renderer.setSize(w, h, false)
}

// ── Lights ────────────────────────────────────────────────────────────────────
function addLights() {
  scene.add(new THREE.HemisphereLight(0xffcc88, 0x3a7028, 0.9))
  const sun = new THREE.DirectionalLight(0xff8833, 3.5)
  sun.position.set(-18, 30, 8)
  scene.add(sun)
  const fill = new THREE.DirectionalLight(0x8899dd, 0.25)
  fill.position.set(22, 12, -30)
  scene.add(fill)
}

// ── Ground & Path ─────────────────────────────────────────────────────────────
function addGround() {
  // Grass
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 600),
    new THREE.MeshStandardMaterial({ color: 0x3a7028, roughness: 1 })
  )
  grass.rotation.x = -Math.PI / 2
  grass.position.set(0, 0, -250)
  scene.add(grass)

  // Stone path surface
  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 600),
    new THREE.MeshStandardMaterial({ color: 0xb09878, roughness: 1 })
  )
  path.rotation.x = -Math.PI / 2
  path.position.set(0, 0.01, -250)
  scene.add(path)

  // Edge kerb stones
  const kerbMat = new THREE.MeshStandardMaterial({ color: 0x807060, roughness: 1 })
  for (const sx of [-1, 1]) {
    const kerb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 600), kerbMat)
    kerb.position.set(sx * 2.8, 0.08, -250)
    scene.add(kerb)
  }
}

// ── Trees (sphere-cluster / organic) ──────────────────────────────────────────
function addTrees() {
  const r = rng(42)
  const treeCount = isMobile ? 12 : 24
  const segs = isMobile ? 6 : 9

  const trunkMat = isMobile
    ? new THREE.MeshLambertMaterial({ color: 0x7a5230 })
    : new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.95 })

  const greenColors = [0x2d6b2a, 0x3a7a32, 0x255520, 0x4a8835, 0x1e4e1a, 0x336b28]
  const sphereGeos = [0.9, 1.3, 1.7, 2.2].map(s => new THREE.SphereGeometry(s, segs, 6))
  const foliageMats = greenColors.map(c => isMobile
    ? new THREE.MeshLambertMaterial({ color: c })
    : new THREE.MeshStandardMaterial({ color: c, roughness: 0.88 })
  )

  for (let i = 0; i < treeCount; i++) {
    for (const side of [-1, 1]) {
      const g = new THREE.Group()
      const trunkH = 4 + r() * 7
      const trunkGeo = new THREE.CylinderGeometry(0.05 + r()*0.05, 0.1 + r()*0.1, trunkH, isMobile ? 5 : 7)
      const trunk = new THREE.Mesh(trunkGeo, trunkMat)
      trunk.position.y = trunkH / 2
      g.add(trunk)

      const clusterN = isMobile ? 3 : (3 + Math.floor(r() * 5))
      for (let c = 0; c < clusterN; c++) {
        const geo = sphereGeos[Math.floor(r() * sphereGeos.length)]
        const mat = foliageMats[Math.floor(r() * foliageMats.length)]
        const foliage = new THREE.Mesh(geo, mat)
        foliage.position.set(
          (r()-0.5) * 2.8,
          trunkH * 0.72 + r() * 3.5 - 0.5,
          (r()-0.5) * 2.8
        )
        g.add(foliage)
      }

      const s = 0.5 + r() * 1.0
      g.scale.set(s, s * (0.7 + r() * 0.6), s)
      g.position.set(side * (5.2 + r() * 6.5), 0, -2 - i * 5 + r() * 3 - 1)
      g.rotation.y = (r()-0.5) * 0.5
      scene.add(g)
    }
  }
}

// ── Hedges (low bushes along path) ────────────────────────────────────────────
function addHedges() {
  const hedgeMat = isMobile
    ? new THREE.MeshLambertMaterial({ color: 0x1e5218 })
    : new THREE.MeshStandardMaterial({ color: 0x1e5218, roughness: 0.95 })
  const r = rng(888)
  const count = isMobile ? 8 : 18
  for (let i = 0; i < count; i++) {
    for (const side of [-1, 1]) {
      const w = 0.7 + r() * 0.5
      const h = 0.5 + r() * 0.5
      const d = 1.8 + r() * 2.5
      const hedge = new THREE.Mesh(
        new THREE.SphereGeometry(1, isMobile ? 6 : 8, 6),
        hedgeMat
      )
      hedge.scale.set(w, h, d)
      hedge.position.set(side * (3.2 + r() * 1.2), h, -4 - i * 6 + r() * 4)
      scene.add(hedge)
    }
  }
}

// ── Lamp Posts ────────────────────────────────────────────────────────────────
function addLampPosts() {
  if (isMobile) return
  const poleMat  = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.6 })
  const lampMat  = new THREE.MeshStandardMaterial({ color: 0xfff0cc, emissive: 0xffaa22, emissiveIntensity: 1.0 })
  const poleGeo  = new THREE.CylinderGeometry(0.035, 0.065, 4.8, 6)
  const lampGeo  = new THREE.SphereGeometry(0.22, 8, 6)

  for (let i = 0; i < 8; i++) {
    for (const side of [-1, 1]) {
      const g = new THREE.Group()
      const pole = new THREE.Mesh(poleGeo, poleMat)
      pole.position.y = 2.4
      g.add(pole)
      const lamp = new THREE.Mesh(lampGeo, lampMat)
      lamp.position.y = 5.0
      g.add(lamp)
      const light = new THREE.PointLight(0xffaa33, 0.7, 12)
      light.position.y = 5.0
      g.add(light)
      g.position.set(side * 3.3, 0, -6 - i * 14)
      scene.add(g)
    }
  }
}

// ── Distant water feature ─────────────────────────────────────────────────────
function addWater() {
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 25),
    new THREE.MeshStandardMaterial({ color: 0x1a3a6a, metalness: 0.25, roughness: 0.05, transparent: true, opacity: 0.82 })
  )
  water.rotation.x = -Math.PI / 2
  water.position.set(0, 0.03, -118)
  scene.add(water)
}

// ── Flowers ───────────────────────────────────────────────────────────────────
function addFlowers() {
  const COLORS = [0xffd700, 0xff69b4, 0xff4500, 0xffffff, 0x9b59b6, 0xe74c3c, 0xf39c12, 0xff85a1]
  const stemMat = isMobile
    ? new THREE.MeshLambertMaterial({ color: 0x4a8a2a })
    : new THREE.MeshStandardMaterial({ color: 0x4a8a2a })
  const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.9, 4)
  const headGeo = new THREE.SphereGeometry(0.2, 5, 4)
  const count = isMobile ? 40 : 100
  const r = rng(77)
  for (let i = 0; i < count; i++) {
    const z = -2 - r() * 100
    const x = (r() > 0.5 ? 1 : -1) * (3.5 + r() * 7)
    const g = new THREE.Group()
    const stem = new THREE.Mesh(stemGeo, stemMat)
    stem.position.set(0, 0.45, 0)
    g.add(stem)
    const col = COLORS[Math.floor(r() * COLORS.length)]
    const hm = new THREE.Mesh(headGeo, isMobile
      ? new THREE.MeshLambertMaterial({ color: col })
      : new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 })
    )
    hm.position.y = 0.92
    g.add(hm)
    g.scale.setScalar(0.6 + r() * 0.9)
    g.position.set(x, 0, z)
    scene.add(g)
  }
}

// ── Particles ─────────────────────────────────────────────────────────────────
let particlePositions: Float32Array
let particleGeo: THREE.BufferGeometry
const particleN = isMobile ? 60 : 250

function addParticles() {
  particlePositions = new Float32Array(particleN * 3)
  const r = rng(999)
  for (let i = 0; i < particleN; i++) {
    particlePositions[i*3]   = (r()-0.5) * 40
    particlePositions[i*3+1] = 0.5 + r() * 8
    particlePositions[i*3+2] = -r() * 110
  }
  particleGeo = new THREE.BufferGeometry()
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
  scene.add(new THREE.Points(particleGeo, new THREE.PointsMaterial({
    color: 0xffdd99, size: 0.08, transparent: true, opacity: 0.7, sizeAttenuation: true
  })))
}

// ── GARDEE Topiaries ──────────────────────────────────────────────────────────
async function addLetters(): Promise<void> {
  return new Promise((resolve, reject) => {
    const loader = new FontLoader()
    loader.load('/fonts/helvetiker_bold.typeface.json', font => {
      const bumpGeo = new THREE.SphereGeometry(0.28, isMobile ? 4 : 5, isMobile ? 3 : 4)
      const r = rng(31415)
      const bumpCount = isMobile ? 8 : 18

      LETTER_DEFS.forEach((def, i) => {
        const textGeo = new TextGeometry(def.char, {
          font,
          size:          LETTER_SIZE,
          depth:         isMobile ? 0.5 : 0.9,
          curveSegments: isMobile ? 3 : 5,
          bevelEnabled:  !isMobile,
          bevelThickness: 0.12,
          bevelSize:      0.06,
          bevelSegments:  2,
        })
        textGeo.computeBoundingBox()
        const bb = textGeo.boundingBox!
        const cx = (bb.max.x - bb.min.x) / 2

        const mats: THREE.MeshStandardMaterial[] = []
        const makeMat = (hex: number) => {
          const m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.95, metalness: 0, transparent: true, opacity: 1 })
          mats.push(m)
          return m
        }

        const group = new THREE.Group()
        group.add(new THREE.Mesh(textGeo, makeMat(0x2d5a1b)))

        for (let b = 0; b < bumpCount; b++) {
          const bump = new THREE.Mesh(bumpGeo, makeMat(b % 2 === 0 ? 0x3a6b22 : 0x224510))
          bump.position.set(
            bb.min.x + r() * (bb.max.x - bb.min.x),
            bb.min.y + r() * (bb.max.y - bb.min.y),
            bb.max.z + 0.1 + r() * 0.5
          )
          bump.scale.setScalar(0.7 + r() * 0.6)
          group.add(bump)
        }

        // Scattered position — each letter at its own X offset
        group.position.set(def.x - cx, 0.15, def.z)
        group.rotation.y = def.ry + (r()-0.5) * 0.05
        group.scale.set(1, 0.9 + r() * 0.2, 1)
        letterMats.push(mats)
        scene.add(group)
      })
      resolve()
    }, undefined, (err) => { console.error('HeroThree: font load failed', err); reject(err) })
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
const timer = new Timer()
let t0 = 0

function tick() {
  animId = requestAnimationFrame(tick)
  timer.update()
  const dt = timer.getDelta()
  t0 += dt

  const p = scrollProg

  if (p <= PHASE_FLY) {
    const t = ease(p / PHASE_FLY)
    camera.position.z = lerp(CAM_START.z, CAM_FLY_END_Z, t)
    camera.position.y = CAM_START.y + Math.sin(t * Math.PI * 0.5) * 0.6
    camera.position.x = Math.sin(t * Math.PI * 1.5) * 0.8
    camera.lookAt(camera.position.x * 0.2, 1.8, camera.position.z - 12)
  } else {
    const t = ease(Math.min(1, (p - PHASE_FLY) / (PHASE_PANO - PHASE_FLY)))
    camera.position.z = lerp(CAM_FLY_END_Z, CAM_PANO.z, t)
    camera.position.y = lerp(CAM_START.y, CAM_PANO.y, t)
    camera.position.x = lerp(camera.position.x, CAM_PANO.x, 0.06)
    // Look down toward garden center
    const lookZ = lerp(CAM_FLY_END_Z - 12, PANO_LOOK.z, t)
    const lookY = lerp(1.8, 0, t)
    camera.lookAt(0, lookY, lookZ)
    if (t > 0.75 && !uiShown) { uiShown = true; uiVisible.value = true }
  }

  // Letter opacity: fade during fly-through, reveal again during pano
  letterMats.forEach((mats, i) => {
    let op: number
    if (p > PHASE_FLY) {
      const t = ease(Math.min(1, (p - PHASE_FLY) / (PHASE_PANO - PHASE_FLY)))
      op = Math.min(1, t * 2.2)
    } else {
      const lz = LETTER_DEFS[i].z
      const passed = lz - camera.position.z
      op = passed < -1 ? 1 : Math.max(0, 1 - (passed + 1) / 9)
    }
    mats.forEach(m => { m.opacity = op })
  })

  // Particles drift
  if (particleGeo) {
    for (let i = 0; i < particleN; i++) {
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
  addHedges()
  addLampPosts()
  addWater()
  addFlowers()
  addParticles()
  await addLetters().catch(() => {})
  loading.value = false
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('touchmove', onScroll, { passive: true })
  window.addEventListener('resize', onResize)
  tick()
})

onUnmounted(() => {
  cancelAnimationFrame(animId)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('touchmove', onScroll)
  window.removeEventListener('resize', onResize)
  renderer?.dispose()
})
</script>

<template>
  <div ref="wrapperRef" class="hero-wrapper" :style="`height: ${SCROLL_MULTIPLIER * 100}vh`">
    <div class="canvas-sticky">

      <canvas ref="canvasRef" class="hero-canvas"></canvas>

      <Transition name="fade">
        <div v-if="loading" class="loading-veil">
          <div class="loading-dot"></div>
          <div class="loading-dot" style="animation-delay:.2s"></div>
          <div class="loading-dot" style="animation-delay:.4s"></div>
        </div>
      </Transition>

      <div class="fixed-headline" :class="{ 'dim': uiVisible }">
        <span class="hl-eyebrow">La plateforme jardinage de confiance</span>
        <h1>Trouvez votre<br><em>meilleur jardinier</em></h1>
      </div>

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
              <a href="/classement" class="cta-btn cta-primary">Classement →</a>
              <a href="/postuler" class="cta-btn cta-ghost">Devenir prestataire</a>
            </div>
          </div>
        </div>
      </Transition>

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
.hero-wrapper { position: relative; }

.canvas-sticky {
  position: sticky;
  top: 56px;
  height: calc(100vh - 56px);
  overflow: hidden;
  background: linear-gradient(
    to bottom,
    #0d1b2a  0%,
    #1b3a5c 18%,
    #c97a3c 52%,
    #e8954d 76%,
    #f5c06b 100%
  );
}

.hero-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.loading-veil {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  gap: 10px;
  background: rgba(13,27,42,0.8);
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
.fixed-headline h1 em { font-style: normal; color: #f5c06b; }

.scene-ui {
  position: absolute; inset: 0;
  display: flex; align-items: center;
  padding: 0 3rem;
  gap: 3rem;
  z-index: 6;
  background: linear-gradient(to bottom, rgba(10,20,35,.45) 0%, rgba(10,20,35,.2) 60%, rgba(10,20,35,.5) 100%);
}
.scene-left {
  flex: 0 0 220px;
  display: flex; flex-direction: column; gap: .875rem;
}
.scene-logo {
  width: 160px;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,.4));
}
.scene-tagline {
  color: rgba(255,255,255,.75);
  font-size: .85rem;
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
  background: rgba(255,255,255,.95);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,.25);
}
.scene-search svg { width: 18px; height: 18px; color: #9ca3af; flex-shrink: 0; margin-left: 1rem; }
.scene-search input { flex: 1; padding: .85rem .75rem; border: none; outline: none; font-size: .95rem; color: #1a1a0e; background: transparent; }
.scene-search input::placeholder { color: #b8b0a0; }
.scene-search button { padding: .85rem 1.5rem; background: #515F37; color: #fff; border: none; cursor: pointer; font-weight: 700; font-size: .9rem; transition: background .15s; white-space: nowrap; }
.scene-search button:hover { background: #3d4a28; }

.scene-ctas { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }
.cta-btn { padding: .6rem 1.25rem; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: .875rem; transition: all .15s; display: inline-flex; align-items: center; gap: .4rem; }
.cta-primary { background: #515F37; color: #fff; }
.cta-primary:hover { background: #3d4a28; }
.cta-secondary { background: rgba(255,255,255,.18); color: #fff; border: 1.5px solid rgba(255,255,255,.5); }
.cta-secondary:hover { background: rgba(255,255,255,.3); }
.cta-ghost { color: rgba(255,255,255,.75); font-weight: 500; font-size: .82rem; }
.cta-ghost:hover { color: #fff; }

.scroll-hint {
  position: absolute;
  bottom: 2rem; left: 50%;
  transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; gap: .5rem;
  color: rgba(255,255,255,.6);
  font-size: .72rem; letter-spacing: .12em; text-transform: uppercase;
  z-index: 5; pointer-events: none;
}
.scroll-arrow {
  width: 20px; height: 20px;
  border-right: 2px solid rgba(255,255,255,.5);
  border-bottom: 2px solid rgba(255,255,255,.5);
  transform: rotate(45deg);
  animation: arrowBounce 1.4s ease-in-out infinite;
}
@keyframes arrowBounce {
  0%,100% { transform: rotate(45deg) translateY(0); opacity: .4; }
  50%      { transform: rotate(45deg) translateY(5px); opacity: 1; }
}

.fade-enter-active, .fade-leave-active { transition: opacity .6s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.ui-rise-enter-active { transition: opacity .9s ease, transform .9s ease; }
.ui-rise-leave-active { transition: opacity .4s ease; }
.ui-rise-enter-from { opacity: 0; transform: translateY(20px); }
.ui-rise-leave-to { opacity: 0; }

@media (max-width: 900px) {
  .scene-left { display: none; }
  .scene-ui { padding: 0 1.5rem; justify-content: center; }
  .scene-center { max-width: 100%; }
}
@media (max-width: 600px) {
  .fixed-headline h1 { font-size: clamp(2rem, 10vw, 3rem); }
  .scene-search button { padding: .85rem 1rem; font-size: .82rem; }
  .scene-ctas { gap: .5rem; }
  .cta-btn { padding: .5rem .9rem; font-size: .8rem; }
}
</style>
