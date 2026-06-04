<script setup lang="ts">
import { getAvatar, getInitialAvatar } from '../../composables/useAvatar';

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

function getAvatarSrc(): string {
  if (props.imageUrl) return props.imageUrl;
  if (props.prenom || props.nom) {
    return getInitialAvatar(props.prenom ?? '', props.nom ?? '', props.userId);
  }
  return getAvatar(props.userId);
}
</script>

<template>
  <img :src="getAvatarSrc()" :alt="alt" :loading="loading" />
</template>
