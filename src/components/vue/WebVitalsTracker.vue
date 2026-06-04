<script setup lang="ts">
import { onMounted } from 'vue';
import { trackWebVitals } from '../../services/webVitals';

onMounted(() => {
  trackWebVitals();
});
</script>

<template>
  <!-- Web Vitals tracking (no UI) -->
</template>
