<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps<{ src: string }>();
const emit = defineEmits<{ (e: 'crop', blob: Blob): void; (e: 'cancel'): void }>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);

let img: HTMLImageElement | null = null;
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let dragging = false;
let lastX = 0;
let lastY = 0;

const OUTPUT_SIZE = 400;
const CANVAS_SIZE = 320;

function clampOffset() {
  if (!img) return;
  const iw = img.naturalWidth * scale;
  const ih = img.naturalHeight * scale;
  const minX = Math.min(0, CANVAS_SIZE - iw);
  const minY = Math.min(0, CANVAS_SIZE - ih);
  offsetX = Math.max(minX, Math.min(0, offsetX));
  offsetY = Math.max(minY, Math.min(0, offsetY));
}

function draw() {
  const canvas = canvasRef.value;
  if (!canvas || !img) return;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.drawImage(img, offsetX, offsetY, img.naturalWidth * scale, img.naturalHeight * scale);
  // Darken outside circle
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Circle border
  ctx.beginPath();
  ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 4, 0, Math.PI * 2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function onWheel(e: WheelEvent) {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  scale = Math.max(0.5, Math.min(4, scale * delta));
  clampOffset();
  draw();
}

function onMousedown(e: MouseEvent) {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
}
function onTouchstart(e: TouchEvent) {
  dragging = true;
  lastX = e.touches[0].clientX;
  lastY = e.touches[0].clientY;
}
function onMove(dx: number, dy: number) {
  offsetX += dx;
  offsetY += dy;
  clampOffset();
  draw();
}
function onMousemove(e: MouseEvent) {
  if (!dragging) return;
  onMove(e.clientX - lastX, e.clientY - lastY);
  lastX = e.clientX;
  lastY = e.clientY;
}
function onTouchmove(e: TouchEvent) {
  if (!dragging) return;
  onMove(e.touches[0].clientX - lastX, e.touches[0].clientY - lastY);
  lastX = e.touches[0].clientX;
  lastY = e.touches[0].clientY;
}
function stopDrag() { dragging = false; }

function crop() {
  const canvas = canvasRef.value;
  if (!canvas || !img) return;
  const out = document.createElement('canvas');
  out.width = OUTPUT_SIZE;
  out.height = OUTPUT_SIZE;
  const ctx = out.getContext('2d')!;
  // Circular clip
  ctx.beginPath();
  ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
  ctx.clip();
  // Scale from canvas to output
  const ratio = OUTPUT_SIZE / CANVAS_SIZE;
  ctx.drawImage(img, offsetX * ratio, offsetY * ratio, img.naturalWidth * scale * ratio, img.naturalHeight * scale * ratio);
  out.toBlob(blob => { if (blob) emit('crop', blob); }, 'image/jpeg', 0.9);
}

onMounted(() => {
  img = new Image();
  img.onload = () => {
    if (!img) return;
    // Fit image to canvas
    const ratio = Math.max(CANVAS_SIZE / img.naturalWidth, CANVAS_SIZE / img.naturalHeight);
    scale = ratio;
    offsetX = (CANVAS_SIZE - img.naturalWidth * scale) / 2;
    offsetY = (CANVAS_SIZE - img.naturalHeight * scale) / 2;
    draw();
  };
  img.src = props.src;

  window.addEventListener('mouseup', stopDrag);
  window.addEventListener('touchend', stopDrag);
});

onUnmounted(() => {
  window.removeEventListener('mouseup', stopDrag);
  window.removeEventListener('touchend', stopDrag);
});
</script>

<template>
  <div class="cropper-overlay">
    <div class="cropper-modal">
      <h3>Recadrer la photo</h3>
      <p class="crop-hint">Faites glisser pour repositionner · molette ou pincement pour zoomer</p>

      <div
        ref="containerRef"
        class="canvas-wrap"
        @mousedown="onMousedown"
        @mousemove="onMousemove"
        @touchstart.prevent="onTouchstart"
        @touchmove.prevent="onTouchmove"
        @wheel.prevent="onWheel"
      >
        <canvas
          ref="canvasRef"
          :width="320"
          :height="320"
          class="crop-canvas"
        ></canvas>
      </div>

      <div class="crop-actions">
        <button class="btn-cancel" type="button" @click="$emit('cancel')">Annuler</button>
        <button class="btn-crop" type="button" @click="crop">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
          Valider
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.cropper-overlay {
  position: fixed; inset: 0; z-index: 900;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  padding: 1rem;
}
.cropper-modal {
  background: #FCFAF5; border-radius: 20px;
  padding: 1.5rem; max-width: 380px; width: 100%;
  box-shadow: 0 24px 64px rgba(0,0,0,0.25);
  text-align: center;
}
.cropper-modal h3 { font-size: 1rem; font-weight: 800; color: #1a1a0e; margin: 0 0 0.3rem; }
.crop-hint { font-size: 0.75rem; color: #9ca3af; margin: 0 0 1rem; }

.canvas-wrap {
  cursor: grab; user-select: none; border-radius: 50%;
  overflow: hidden; margin: 0 auto;
  width: 320px; height: 320px;
  border: 2px solid #e9e5d6;
}
.canvas-wrap:active { cursor: grabbing; }
.crop-canvas { display: block; }

.crop-actions {
  display: flex; gap: 0.75rem; margin-top: 1.25rem; justify-content: center;
}
.btn-cancel {
  padding: 0.65rem 1.5rem; background: none; color: #6b7280;
  border: 1.5px solid #e9e5d6; border-radius: 10px;
  font-size: 0.875rem; font-weight: 600; cursor: pointer; font-family: inherit;
  transition: all 0.15s;
}
.btn-cancel:hover { border-color: #9ca3af; color: #374151; }
.btn-crop {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.65rem 1.5rem; background: #3a5020; color: #fff;
  border: none; border-radius: 10px;
  font-size: 0.875rem; font-weight: 700; cursor: pointer; font-family: inherit;
  transition: background 0.15s;
}
.btn-crop:hover { background: #2a3c16; }
</style>
