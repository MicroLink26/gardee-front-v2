<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import type { User } from '../../types';
import { getLatLng } from '../../utils/geo';

const props = defineProps<{ users: User[] }>();

const mapEl = ref<HTMLDivElement>();
let map: unknown = null;

onMounted(async () => {
  const L = (await import('leaflet')).default;
  await import('leaflet/dist/leaflet.css');

  map = L.map(mapEl.value!).setView([46.8, 2.3], 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
  }).addTo(map as Parameters<typeof L.tileLayer>[1]);

  for (const user of props.users) {
    const latlng = getLatLng(user);
    if (!latlng) continue;
    L.marker(latlng)
      .addTo(map as Parameters<typeof L.tileLayer>[1])
      .bindPopup(`
        <strong>${user.prenom} ${user.nom}</strong><br/>
        ${user.ville}<br/>
        <a href="/prestataires/${user._id}">Voir le profil</a>
      `);
  }
});

onUnmounted(() => {
  if (map) (map as { remove: () => void }).remove();
});
</script>

<template>
  <div ref="mapEl" class="map-container"></div>
</template>

<style scoped>
.map-container { height: 520px; width: 100%; border-radius: 12px; overflow: hidden; }
</style>
