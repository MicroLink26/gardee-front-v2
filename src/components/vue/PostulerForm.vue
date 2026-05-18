<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { registerPrestataire } from '../../services/users';
import { useCategoriesStore } from '../../stores/categories';

const categoriesStore = useCategoriesStore();

const step = ref(1);
const loading = ref(false);
const done = ref(false);
const error = ref('');

const form = ref({
  // Étape 1 — identité
  prenom: '', nom: '', email: '', password: '', telephone: '',
  // Étape 2 — activité
  prestations: [] as string[],
  tarifHoraire: '',
  description: '',
  materielOK: false,
  isEntrepreneur: false,
  siret: '',
  qualifElagage: false,
  // Étape 3 — localisation
  adresse: '',
  codePostal: '',
  ville: '',
  contactCom: false,
  // Étape 4 — photo + CGU
  photo: null as File | null,
  cgu: false,
  consentDataProcessing: false,
});

const photoPreview = ref('');

onMounted(() => categoriesStore.load());

function togglePrestation(name: string) {
  const idx = form.value.prestations.indexOf(name);
  if (idx >= 0) form.value.prestations.splice(idx, 1);
  else form.value.prestations.push(name);
}

function onPhotoChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  form.value.photo = file;
  photoPreview.value = URL.createObjectURL(file);
}

function nextStep() {
  if (step.value === 1 && (!form.value.prenom || !form.value.nom || !form.value.email || !form.value.password || !form.value.telephone)) {
    error.value = 'Veuillez remplir tous les champs obligatoires.';
    return;
  }
  if (step.value === 2 && form.value.prestations.length === 0) {
    error.value = 'Sélectionnez au moins un service.';
    return;
  }
  if (step.value === 3 && (!form.value.adresse || !form.value.codePostal || !form.value.ville)) {
    error.value = 'Veuillez renseigner votre adresse complète.';
    return;
  }
  error.value = '';
  step.value++;
}

async function submit() {
  if (!form.value.cgu) { error.value = 'Vous devez accepter les CGU.'; return; }
  error.value = '';
  loading.value = true;
  try {
    const fd = new FormData();
    const fields: Record<string, unknown> = { ...form.value };
    for (const [key, val] of Object.entries(fields)) {
      if (key === 'photo') continue;
      if (Array.isArray(val)) val.forEach(v => fd.append(key, v));
      else fd.append(key, String(val));
    }
    if (form.value.photo) fd.append('photo', form.value.photo);
    await registerPrestataire(fd);
    done.value = true;
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
    error.value = msg ?? 'Une erreur est survenue.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="postuler-wrapper">
    <div class="postuler-card">
      <h1>Devenir prestataire Gardee</h1>

      <!-- Succès -->
      <div v-if="done" class="success">
        <p class="success-icon">🎉</p>
        <h2>Inscription envoyée !</h2>
        <p>Votre dossier est en cours de validation. Vous recevrez un email dès qu'il sera approuvé.</p>
        <a href="/" class="btn-primary">Retour à l'accueil</a>
      </div>

      <template v-else>
        <!-- Stepper -->
        <div class="stepper">
          <div v-for="n in 4" :key="n" :class="['step-dot', { active: step === n, done: step > n }]">
            <span>{{ step > n ? '✓' : n }}</span>
          </div>
        </div>

        <!-- Étape 1 — Identité -->
        <div v-if="step === 1" class="form-step">
          <h2>Vos informations</h2>
          <div class="field-row">
            <div class="field"><label>Prénom *</label><input v-model="form.prenom" type="text" /></div>
            <div class="field"><label>Nom *</label><input v-model="form.nom" type="text" /></div>
          </div>
          <div class="field"><label>Email *</label><input v-model="form.email" type="email" /></div>
          <div class="field"><label>Mot de passe *</label><input v-model="form.password" type="password" placeholder="8 caractères minimum" /></div>
          <div class="field"><label>Téléphone *</label><input v-model="form.telephone" type="tel" /></div>
        </div>

        <!-- Étape 2 — Activité -->
        <div v-if="step === 2" class="form-step">
          <h2>Votre activité</h2>
          <div class="field">
            <label>Services proposés * (sélectionnez au moins un)</label>
            <div class="checkboxes">
              <label v-for="cat in categoriesStore.categories" :key="cat._id" class="checkbox-item">
                <input
                  type="checkbox"
                  :checked="form.prestations.includes(cat.name)"
                  @change="togglePrestation(cat.name)"
                />
                {{ cat.name }}
              </label>
            </div>
          </div>
          <div class="field"><label>Tarif horaire (€/h)</label><input v-model="form.tarifHoraire" type="number" min="0" /></div>
          <div class="field"><label>Description / présentation</label><textarea v-model="form.description" rows="4" placeholder="Présentez-vous et votre expérience..."></textarea></div>
          <div class="checkboxes-inline">
            <label class="checkbox-item"><input v-model="form.materielOK" type="checkbox" /> Je dispose de mon propre matériel</label>
            <label class="checkbox-item"><input v-model="form.isEntrepreneur" type="checkbox" /> Je suis auto-entrepreneur / entreprise</label>
            <label class="checkbox-item"><input v-model="form.qualifElagage" type="checkbox" /> J'ai une qualification en élagage</label>
          </div>
          <div v-if="form.isEntrepreneur" class="field"><label>Numéro SIRET</label><input v-model="form.siret" type="text" maxlength="14" /></div>
        </div>

        <!-- Étape 3 — Localisation -->
        <div v-if="step === 3" class="form-step">
          <h2>Votre zone d'intervention</h2>
          <div class="field"><label>Adresse *</label><input v-model="form.adresse" type="text" placeholder="15 rue des Jardins" /></div>
          <div class="field-row">
            <div class="field"><label>Code postal *</label><input v-model="form.codePostal" type="text" maxlength="5" /></div>
            <div class="field"><label>Ville *</label><input v-model="form.ville" type="text" /></div>
          </div>
          <label class="checkbox-item">
            <input v-model="form.contactCom" type="checkbox" />
            J'accepte de recevoir des informations commerciales de Gardee
          </label>
        </div>

        <!-- Étape 4 — Photo + CGU -->
        <div v-if="step === 4" class="form-step">
          <h2>Photo de profil & finalisation</h2>
          <div class="field">
            <label>Photo de profil (optionnelle)</label>
            <div class="photo-upload">
              <div class="photo-preview">
                <img v-if="photoPreview" :src="photoPreview" alt="Aperçu" />
                <span v-else class="photo-placeholder">👤</span>
              </div>
              <input type="file" accept="image/*" @change="onPhotoChange" id="photo-input" class="visually-hidden" />
              <label for="photo-input" class="btn-outline-sm">Choisir une photo</label>
            </div>
          </div>
          <div class="field">
            <label class="checkbox-item required">
              <input v-model="form.cgu" type="checkbox" />
              J'accepte les <a href="/cgu" target="_blank">conditions générales d'utilisation</a> *
            </label>
            <label class="checkbox-item">
              <input v-model="form.consentDataProcessing" type="checkbox" />
              J'accepte le traitement de mes données personnelles conformément au RGPD
            </label>
          </div>
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <div class="step-nav">
          <button v-if="step > 1" class="btn-outline" @click="step--; error = ''">← Retour</button>
          <button v-if="step < 4" class="btn-primary" @click="nextStep">Suivant →</button>
          <button v-else class="btn-primary" :disabled="loading" @click="submit">
            {{ loading ? 'Envoi en cours...' : 'Envoyer mon dossier' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.postuler-wrapper { max-width: 640px; margin: 0 auto; padding: 2rem; }
.postuler-card { background: #fff; border-radius: 16px; padding: 2.5rem; box-shadow: 0 4px 24px rgba(0,0,0,0.07); }
h1 { font-size: 1.75rem; font-weight: 800; text-align: center; margin-bottom: 1.5rem; }
.stepper { display: flex; justify-content: center; gap: 0.5rem; margin-bottom: 2rem; }
.step-dot {
  width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 0.875rem; font-weight: 700; background: #f3f4f6; color: #9ca3af; border: 2px solid #e5e7eb;
}
.step-dot.active { background: #16a34a; color: #fff; border-color: #16a34a; }
.step-dot.done { background: #dcfce7; color: #16a34a; border-color: #16a34a; }
h2 { font-size: 1.2rem; margin-bottom: 1.25rem; color: #111827; }
.form-step { min-height: 280px; }
.field { margin-bottom: 1rem; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.3rem; color: #374151; }
input[type="text"], input[type="email"], input[type="password"], input[type="tel"], input[type="number"], textarea {
  width: 100%; padding: 0.6rem 0.875rem; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box;
}
input:focus, textarea:focus { outline: none; border-color: #16a34a; }
.checkboxes { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem; }
.checkboxes-inline { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
.checkbox-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; cursor: pointer; font-weight: 400; }
.photo-upload { display: flex; align-items: center; gap: 1rem; margin-top: 0.5rem; }
.photo-preview { width: 72px; height: 72px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; overflow: hidden; font-size: 1.75rem; flex-shrink: 0; }
.photo-preview img { width: 100%; height: 100%; object-fit: cover; }
.visually-hidden { position: absolute; opacity: 0; pointer-events: none; }
.btn-outline-sm { padding: 0.4rem 1rem; border: 1.5px solid #d1d5db; border-radius: 8px; cursor: pointer; font-size: 0.875rem; }
.error { color: #ef4444; font-size: 0.875rem; margin-bottom: 0.75rem; }
.step-nav { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }
.btn-primary { padding: 0.65rem 1.75rem; background: #16a34a; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.95rem; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-primary:hover:not(:disabled) { background: #15803d; }
.btn-outline { padding: 0.65rem 1.75rem; background: #fff; color: #374151; border: 1.5px solid #d1d5db; border-radius: 8px; cursor: pointer; font-weight: 500; }
.success { text-align: center; padding: 2rem 0; }
.success-icon { font-size: 3.5rem; margin-bottom: 1rem; }
.success h2 { font-size: 1.5rem; margin-bottom: 0.75rem; }
.success p { color: #6b7280; margin-bottom: 1.5rem; }
.success .btn-primary { display: inline-block; text-decoration: none; }
a { color: #16a34a; }
</style>
