<script setup lang="ts">
interface Props {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  loading?: 'lazy' | 'eager';
  class?: string;
  style?: string;
}

const props = withDefaults(defineProps<Props>(), {
  loading: 'lazy',
});

// Determine if image has a WebP version available
const hasWebP = props.src.endsWith('.png') || props.src.endsWith('.jpg') || props.src.endsWith('.jpeg');
const webpSrc = hasWebP ? props.src.replace(/\.(png|jpg|jpeg)$/i, '.webp') : null;
</script>

<template>
  <picture v-if="webpSrc">
    <source :srcset="webpSrc" type="image/webp" />
    <img
      :src="src"
      :alt="alt"
      :width="width"
      :height="height"
      :loading="loading"
      :class="class"
      :style="style"
    />
  </picture>
  <img
    v-else
    :src="src"
    :alt="alt"
    :width="width"
    :height="height"
    :loading="loading"
    :class="class"
    :style="style"
  />
</template>
