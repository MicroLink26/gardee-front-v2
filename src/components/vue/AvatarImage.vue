<script setup lang="ts">
import { computed } from 'vue';
import { getAvatar } from '../../composables/useAvatar';

interface Props {
  userId: string;
  prenom?: string;
  nom?: string;
  imageUrl?: string;
  alt?: string;
  loading?: 'lazy' | 'eager';
}

const props = withDefaults(defineProps<Props>(), {
  loading: 'lazy',
});

const useInitials = computed(() => !props.imageUrl && (props.prenom || props.nom));
const initials = computed(() => {
  if (!useInitials.value) return '';
  return `${props.prenom?.[0] ?? '?'}${props.nom?.[0] ?? '?'}`.toUpperCase();
});

const bgColor = computed(() => {
  const COLORS = ['#A8C47A', '#6B8A3A', '#C8D9A6', '#515F37', '#3A5020'];
  let hash = 0;
  for (let i = 0; i < props.userId.length; i++) {
    hash = (hash + props.userId.charCodeAt(i)) % 997;
  }
  return COLORS[hash % COLORS.length];
});

const imgSrc = computed(() => {
  if (props.imageUrl) return props.imageUrl;
  return getAvatar(props.userId);
});
</script>

<template>
  <div v-if="useInitials" class="avatar-initials" :style="{ backgroundColor: bgColor }">
    <span>{{ initials }}</span>
  </div>
  <img v-else :src="imgSrc" :alt="alt" :loading="loading" />
</template>

<style scoped>
.avatar-initials {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: inherit;
  color: white;
  font-weight: 700;
  font-size: clamp(1rem, 25%, 3rem);
  font-family: system-ui, sans-serif;
}
</style>
