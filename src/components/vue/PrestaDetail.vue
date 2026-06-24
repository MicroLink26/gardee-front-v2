<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../../services/api';
import BookingWidget from './BookingWidget.vue';
import ReviewsList from './reviews/ReviewsList.vue';
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

// Galerie exemple (à remplacer par données du backend)
const galleryProjects = [
  {
    title: 'Tonte et entretien',
    before: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=400&h=300&fit=crop',
    after: 'https://images.unsplash.com/photo-1585299733482-f33e6fbf92dd?w=400&h=300&fit=crop',
  },
  {
    title: 'Taille de haies',
    before: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&h=300&fit=crop',
    after: 'https://images.unsplash.com/photo-1552092099-76b6c5e2e6a0?w=400&h=300&fit=crop',
  },
  {
    title: 'Élagage d\'arbres',
    before: 'https://images.unsplash.com/photo-1582552938357-32b46cf3a655?w=400&h=300&fit=crop',
    after: 'https://images.unsplash.com/photo-1576606596884-16e6cae7971a?w=400&h=300&fit=crop',
  },
];
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
      <div v-if="galleryProjects.length > 0" class="gallery-section">
        <h3>Galerie de travaux</h3>
        <div class="gallery-grid">
          <div v-for="(project, idx) in galleryProjects" :key="idx" class="gallery-item">
            <div class="before-after-container">
              <div class="before">
                <img :src="project.before" :alt="`Avant - ${project.title}`">
                <span class="label">Avant</span>
              </div>
              <div class="after">
                <img :src="project.after" :alt="`Après - ${project.title}`">
                <span class="label">Après</span>
              </div>
            </div>
            <p class="project-title">{{ project.title }}</p>
          </div>
        </div>
      </div>
      <ReviewsList :prestataireId="user._id" />
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

.gallery-section {
  margin: 3rem 0;
  padding: 2rem 0;
  border-top: 1px solid #e5e7eb;
}
.gallery-section h3 {
  font-size: 1.5rem;
  margin: 0 0 1.5rem;
  color: #1f2937;
}
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}
.gallery-item {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.before-after-container {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  background: #f3f4f6;
  border-radius: 12px;
  overflow: hidden;
  aspect-ratio: 2 / 1.5;
}
.before, .after {
  position: relative;
  overflow: hidden;
}
.before img, .after img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.label {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
}
.project-title {
  margin: 0;
  font-weight: 600;
  color: #374151;
  font-size: 0.95rem;
}
</style>
