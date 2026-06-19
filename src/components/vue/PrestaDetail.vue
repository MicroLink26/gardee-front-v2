<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../../services/api';
import BookingWidget from './BookingWidget.vue';
import type { User } from '../../types';

const props = defineProps<{ userId: string }>();

const user = ref<User | null>(null);
const loading = ref(true);
const error = ref('');

const prest = () => user.value?.prestataire as Record<string, unknown> | undefined;

onMounted(async () => {
  try {
    const { data } = await api.get(`/prestataires/${props.userId}`);
    user.value = data.user;
  } catch (e) {
    error.value = 'Profil introuvable';
  } finally {
    loading.value = false;
  }
});

const CATEGORY_LABELS: Record<string, string> = {
  time: 'Délai',
  quality: 'Qualité',
  sympathy: 'Sympathie',
  value: 'Rapport qualité/prix',
  punctuality: 'Ponctualité',
};

const avatarIdx = parseInt(props.userId.slice(-2), 16) % 4;
const defaultAvatars = ['/img/default-avatar.png', '/img/default-avatar2.png', '/img/default-avatar3.png', '/img/default-avatar4.png'];
</script>

<template>
  <div class="prest-detail">
    <div v-if="loading" class="loading">Chargement du profil…</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="user" class="detail-content">
      <div class="header">
        <img :src="prest()?.profil_image?.secure_url ?? defaultAvatars[avatarIdx]" :alt="`${user.prenom} ${user.nom}`" class="avatar">
        <div class="info">
          <h1>{{ user.prenom }} {{ user.nom }}</h1>
          <p v-if="prest()?.ville" class="location">📍 {{ prest()?.ville }} ({{ prest()?.codePostal }})</p>
          <p v-if="prest()?.tarifHoraire" class="price">{{ prest()?.tarifHoraire }} €/h</p>
        </div>
      </div>
      <div v-if="prest()?.description" class="description">{{ prest()?.description }}</div>
      <BookingWidget
        :prestataireId="user._id"
        :prenom="user.prenom"
        :tarifHoraire="prest()?.tarifHoraire as number | undefined"
        :averageRating="prest()?.averageRating as number | undefined"
        :numberOfReviews="prest()?.numberOfReviews as number | undefined"
        :prestations="(prest()?.prestations ?? []) as string[]"
      />
    </div>
  </div>
</template>

<style scoped>
.prest-detail { padding: 2rem; }
.loading, .error { text-align: center; padding: 2rem; }
.error { color: #b91c1c; }
.detail-content { max-width: 1000px; margin: 0 auto; }
.header { display: flex; gap: 2rem; margin-bottom: 3rem; }
.avatar { width: 150px; height: 150px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.info h1 { margin: 0; font-size: 1.8rem; }
.location, .price { margin: 0.5rem 0 0; color: #6b7280; }
.description { line-height: 1.6; color: #374151; margin-bottom: 3rem; }
</style>
