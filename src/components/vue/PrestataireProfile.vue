<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getPrestataire, getReviews } from '../../services/users';
import { createRequest } from '../../services/requests';
import type { User } from '../../types';
import RatingStars from './RatingStars.vue';

const props = defineProps<{ prestataireId: string }>();

const user = ref<User | null>(null);
const reviews = ref<unknown[]>([]);
const totalReviews = ref(0);
const showForm = ref(false);
const formSent = ref(false);
const formError = ref('');
const sending = ref(false);

const form = ref({
  requesterEmail: '', requesterNom: '', requesterPrenom: '',
  requesterTelephone: '', prestations: [] as string[],
  description: '', desiredAt: '', subject: '',
});

onMounted(async () => {
  const [u, r] = await Promise.all([
    getPrestataire(props.prestataireId),
    getReviews(props.prestataireId, { pageSize: 5 }),
  ]);
  user.value = u;
  reviews.value = r.items;
  totalReviews.value = r.total;
});

async function submitRequest() {
  formError.value = '';
  sending.value = true;
  try {
    await createRequest({
      prestataireId: props.prestataireId,
      ...form.value,
    });
    formSent.value = true;
  } catch {
    formError.value = 'Une erreur est survenue. Veuillez réessayer.';
  } finally {
    sending.value = false;
  }
}

function stars(n: number) {
  return Math.round(n);
}
</script>

<template>
  <div v-if="user" class="profile">
    <div class="profile-header">
      <div class="profile-photo">
        <img v-if="user.profil_image?.secure_url" :src="user.profil_image.secure_url" :alt="`${user.prenom} ${user.nom}`" />
        <div v-else class="photo-placeholder">{{ user.prenom[0] }}{{ user.nom[0] }}</div>
      </div>
      <div class="profile-info">
        <h1>{{ user.prenom }} {{ user.nom }}</h1>
        <p class="profile-ville">📍 {{ user.ville }}</p>
        <div v-if="user.numberOfReviews > 0" class="profile-rating">
          <RatingStars :model-value="Math.round(user.averageRating)" readonly />
          <span>{{ user.averageRating.toFixed(1) }} ({{ user.numberOfReviews }} avis)</span>
        </div>
        <div class="profile-tags">
          <span v-for="p in user.prestations" :key="p" class="tag">{{ p }}</span>
        </div>
        <p v-if="user.tarifHoraire" class="profile-tarif"><strong>{{ user.tarifHoraire }} €/h</strong></p>
      </div>
      <button v-if="!showForm" class="btn-contact" @click="showForm = true">Contacter</button>
    </div>

    <div class="profile-body">
      <div class="profile-left">
        <section v-if="user.description">
          <h2>À propos</h2>
          <p>{{ user.description }}</p>
        </section>

        <section v-if="reviews.length">
          <h2>Avis clients ({{ totalReviews }})</h2>
          <div class="reviews-list">
            <div v-for="(r, i) in (reviews as Record<string, unknown>[])" :key="i" class="review-card">
              <RatingStars :model-value="stars(((r.ratingDetails as Record<string,number>)?.quality ?? 0))" readonly />
              <p v-if="r.ratingComment" class="review-comment">{{ r.ratingComment as string }}</p>
              <p class="review-date">{{ new Date(r.ratingGivenAt as string).toLocaleDateString('fr-FR') }}</p>
            </div>
          </div>
        </section>
      </div>

      <aside v-if="showForm" class="contact-form-aside">
        <div v-if="formSent" class="form-success">
          <h3>✅ Demande envoyée !</h3>
          <p>Vérifiez votre boîte email pour confirmer votre demande.</p>
        </div>
        <form v-else @submit.prevent="submitRequest" class="contact-form">
          <h2>Contacter {{ user.prenom }}</h2>
          <div class="field">
            <label>Votre email *</label>
            <input v-model="form.requesterEmail" type="email" required />
          </div>
          <div class="field-row">
            <div class="field">
              <label>Prénom</label>
              <input v-model="form.requesterPrenom" type="text" />
            </div>
            <div class="field">
              <label>Nom</label>
              <input v-model="form.requesterNom" type="text" />
            </div>
          </div>
          <div class="field">
            <label>Objet</label>
            <input v-model="form.subject" type="text" placeholder="Tonte de pelouse..." />
          </div>
          <div class="field">
            <label>Date souhaitée</label>
            <input v-model="form.desiredAt" type="date" />
          </div>
          <div class="field">
            <label>Description</label>
            <textarea v-model="form.description" rows="4" placeholder="Décrivez votre besoin..."></textarea>
          </div>
          <p v-if="formError" class="form-error">{{ formError }}</p>
          <button type="submit" class="btn-primary" :disabled="sending">
            {{ sending ? 'Envoi...' : 'Envoyer la demande' }}
          </button>
        </form>
      </aside>
    </div>
  </div>
  <div v-else class="loading">Chargement...</div>
</template>

<style scoped>
.profile { max-width: 1100px; margin: 0 auto; padding: 2rem; }
.profile-header { display: flex; gap: 2rem; align-items: flex-start; margin-bottom: 3rem; padding-bottom: 2rem; border-bottom: 1px solid #e5e7eb; }
.profile-photo { width: 140px; height: 140px; border-radius: 50%; overflow: hidden; flex-shrink: 0; }
.profile-photo img { width: 100%; height: 100%; object-fit: cover; }
.photo-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f3f4f6; font-size: 2.5rem; font-weight: 700; color: #9ca3af; }
.profile-info { flex: 1; }
h1 { font-size: 2rem; font-weight: 800; margin-bottom: 0.35rem; }
.profile-ville { color: #6b7280; margin-bottom: 0.5rem; }
.profile-rating { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
.profile-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.75rem; }
.tag { background: #dcfce7; color: #16a34a; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.8rem; font-weight: 500; }
.profile-tarif { font-size: 1.1rem; }
.btn-contact { padding: 0.75rem 2rem; background: #16a34a; color: #fff; border: none; border-radius: 10px; cursor: pointer; font-size: 1rem; font-weight: 600; white-space: nowrap; }
.btn-contact:hover { background: #15803d; }
.profile-body { display: grid; grid-template-columns: 1fr 400px; gap: 3rem; align-items: start; }
.profile-left section { margin-bottom: 2rem; }
h2 { font-size: 1.25rem; margin-bottom: 1rem; }
.reviews-list { display: flex; flex-direction: column; gap: 1rem; }
.review-card { padding: 1rem; background: #f9fafb; border-radius: 10px; }
.review-comment { margin: 0.5rem 0; }
.review-date { color: #9ca3af; font-size: 0.8rem; }
.contact-form-aside { position: sticky; top: 80px; }
.contact-form, .form-success { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 1.75rem; }
.field { margin-bottom: 1rem; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.3rem; color: #374151; }
input, textarea { width: 100%; padding: 0.6rem 0.875rem; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box; }
input:focus, textarea:focus { outline: none; border-color: #16a34a; }
.form-error { color: #dc2626; font-size: 0.875rem; margin-bottom: 0.75rem; }
.btn-primary { width: 100%; padding: 0.75rem; background: #16a34a; color: #fff; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; }
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
.form-success h3 { font-size: 1.25rem; margin-bottom: 0.5rem; }
.loading { text-align: center; padding: 4rem; color: #6b7280; }
</style>
