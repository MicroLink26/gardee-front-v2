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
  prenom: '', nom: '', email: '', password: '', telephone: '',
  prestations: [] as string[],
  tarifHoraire: '',
  description: '',
  materielOK: false,
  isEntrepreneur: false,
  siret: '',
  qualifElagage: false,
  adresse: '',
  codePostal: '',
  ville: '',
  contactCom: false,
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
  error.value = '';
  if (step.value === 1) {
    if (!form.value.prenom || !form.value.nom || !form.value.email || !form.value.password || !form.value.telephone) {
      error.value = 'Veuillez remplir tous les champs obligatoires.'; return;
    }
    if (form.value.password.length < 8) {
      error.value = 'Le mot de passe doit contenir au moins 8 caractères.'; return;
    }
  }
  if (step.value === 2 && form.value.prestations.length === 0) {
    error.value = 'Sélectionnez au moins un service.'; return;
  }
  if (step.value === 3 && (!form.value.adresse || !form.value.codePostal || !form.value.ville)) {
    error.value = 'Veuillez renseigner votre adresse complète.'; return;
  }
  step.value++;
}

async function submit() {
  if (!form.value.cgu) { error.value = 'Vous devez accepter les CGU.'; return; }
  error.value = '';
  loading.value = true;
  try {
    const fd = new FormData();
    const fields = { ...form.value } as Record<string, unknown>;
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
    error.value = msg ?? 'Une erreur est survenue. Veuillez réessayer.';
  } finally {
    loading.value = false;
  }
}

const STEPS = [
  { label: 'Identité' },
  { label: 'Activité' },
  { label: 'Localisation' },
  { label: 'Finalisation' },
];

const BENEFITS = [
  { icon: '📍', text: 'Visibilité locale immédiate' },
  { icon: '⭐', text: 'Avis clients vérifiés' },
  { icon: '📅', text: 'Gestion simplifiée des réservations' },
  { icon: '🏆', text: 'Accès au classement régional' },
];
</script>

<template>
  <div class="postuler-layout">

    <!-- ── PANNEAU GAUCHE ── -->
    <aside class="postuler-aside">
      <div class="aside-top">
        <a href="/" class="aside-logo">
          <img src="/logo.png" alt="Gardee" height="40" style="background:#d6cda4;border-radius:6px;padding:3px 8px" />
        </a>
        <h2>Rejoignez Gardee</h2>
        <p>Proposez vos services à des milliers de particuliers près de chez vous et développez votre activité.</p>
        <ul class="benefits">
          <li v-for="b in BENEFITS" :key="b.text">
            <span class="benefit-icon">{{ b.icon }}</span>
            {{ b.text }}
          </li>
        </ul>
      </div>
      <div class="aside-illus">
        <img src="/fondPostuler.svg" alt="" />
      </div>
    </aside>

    <!-- ── PANNEAU DROIT ── -->
    <main class="postuler-main">

      <!-- Succès -->
      <div v-if="done" class="success-screen">
        <div class="success-circle">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#515F37" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <h2>Dossier envoyé !</h2>
        <p>Votre candidature est en cours de validation par notre équipe. Vous recevrez un email dès qu'elle sera approuvée.</p>
        <a href="/" class="btn-primary">Retour à l'accueil</a>
      </div>

      <template v-else>
        <!-- Header -->
        <div class="form-header">
          <h1>Devenir prestataire</h1>
          <p>Étape {{ step }} sur 4 — {{ STEPS[step - 1].label }}</p>
        </div>

        <!-- Stepper -->
        <div class="stepper">
          <div
            v-for="(s, i) in STEPS" :key="i"
            :class="['step-item', { active: step === i + 1, done: step > i + 1 }]"
          >
            <div class="step-circle">
              <svg v-if="step > i + 1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span v-else>{{ i + 1 }}</span>
            </div>
            <span class="step-label">{{ s.label }}</span>
            <div v-if="i < 3" class="step-line"></div>
          </div>
        </div>

        <!-- Progress bar -->
        <div class="progress-bar">
          <div class="progress-fill" :style="`width: ${(step - 1) / 3 * 100}%`"></div>
        </div>

        <!-- ── ÉTAPE 1 — Identité ── -->
        <div v-if="step === 1" class="form-step">
          <div class="field-row">
            <div class="field">
              <label>Prénom <span class="req">*</span></label>
              <input v-model="form.prenom" type="text" placeholder="Jean" />
            </div>
            <div class="field">
              <label>Nom <span class="req">*</span></label>
              <input v-model="form.nom" type="text" placeholder="Dupont" />
            </div>
          </div>
          <div class="field">
            <label>Email <span class="req">*</span></label>
            <input v-model="form.email" type="email" placeholder="jean.dupont@email.fr" />
          </div>
          <div class="field">
            <label>Mot de passe <span class="req">*</span></label>
            <input v-model="form.password" type="password" placeholder="8 caractères minimum" />
          </div>
          <div class="field">
            <label>Téléphone <span class="req">*</span></label>
            <input v-model="form.telephone" type="tel" placeholder="06 12 34 56 78" />
          </div>
        </div>

        <!-- ── ÉTAPE 2 — Activité ── -->
        <div v-if="step === 2" class="form-step">
          <div class="field">
            <label>Services proposés <span class="req">*</span></label>
            <p class="field-hint">Sélectionnez au moins un service</p>
            <div class="service-chips">
              <button
                v-for="cat in categoriesStore.categories" :key="cat._id"
                type="button"
                :class="['chip', { active: form.prestations.includes(cat.name) }]"
                @click="togglePrestation(cat.name)"
              >{{ cat.name }}</button>
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Tarif horaire (€/h)</label>
              <input v-model="form.tarifHoraire" type="number" min="0" placeholder="Ex : 35" />
            </div>
          </div>
          <div class="field">
            <label>Présentation</label>
            <textarea v-model="form.description" rows="4" placeholder="Présentez votre expérience, vos spécialités, votre approche…"></textarea>
          </div>
          <div class="checkboxes">
            <label class="checkbox-label">
              <input v-model="form.materielOK" type="checkbox" />
              <span>Je dispose de mon propre matériel</span>
            </label>
            <label class="checkbox-label">
              <input v-model="form.qualifElagage" type="checkbox" />
              <span>J'ai une qualification en élagage</span>
            </label>
            <label class="checkbox-label">
              <input v-model="form.isEntrepreneur" type="checkbox" />
              <span>Je suis auto-entrepreneur / entreprise</span>
            </label>
          </div>
          <div v-if="form.isEntrepreneur" class="field">
            <label>Numéro SIRET</label>
            <input v-model="form.siret" type="text" maxlength="14" placeholder="14 chiffres" />
          </div>
        </div>

        <!-- ── ÉTAPE 3 — Localisation ── -->
        <div v-if="step === 3" class="form-step">
          <div class="field">
            <label>Adresse <span class="req">*</span></label>
            <input v-model="form.adresse" type="text" placeholder="15 rue des Jardins" />
          </div>
          <div class="field-row">
            <div class="field">
              <label>Code postal <span class="req">*</span></label>
              <input v-model="form.codePostal" type="text" maxlength="5" placeholder="75001" />
            </div>
            <div class="field">
              <label>Ville <span class="req">*</span></label>
              <input v-model="form.ville" type="text" placeholder="Paris" />
            </div>
          </div>
          <div class="info-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Votre adresse sera utilisée pour géolocaliser votre zone d'intervention sur la carte.
          </div>
          <label class="checkbox-label">
            <input v-model="form.contactCom" type="checkbox" />
            <span>J'accepte de recevoir des informations commerciales de Gardee</span>
          </label>
        </div>

        <!-- ── ÉTAPE 4 — Photo + CGU ── -->
        <div v-if="step === 4" class="form-step">
          <div class="field">
            <label>Photo de profil <span class="optional">(optionnelle)</span></label>
            <div class="photo-upload">
              <div class="photo-preview">
                <img v-if="photoPreview" :src="photoPreview" alt="Aperçu" />
                <span v-else class="photo-placeholder">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </span>
              </div>
              <div>
                <input type="file" accept="image/*" @change="onPhotoChange" id="photo-input" class="visually-hidden" />
                <label for="photo-input" class="btn-upload">Choisir une photo</label>
                <p class="upload-hint">JPG, PNG — 5 Mo max</p>
              </div>
            </div>
          </div>

          <div class="cgu-block">
            <label class="checkbox-label checkbox-label--required">
              <input v-model="form.cgu" type="checkbox" />
              <span>J'accepte les <a href="/cgu" target="_blank">conditions générales d'utilisation</a> <span class="req">*</span></span>
            </label>
            <label class="checkbox-label">
              <input v-model="form.consentDataProcessing" type="checkbox" />
              <span>J'accepte le traitement de mes données personnelles conformément au RGPD</span>
            </label>
          </div>

          <div class="recap">
            <h3>Récapitulatif</h3>
            <div class="recap-grid">
              <div class="recap-item"><span>Nom</span><strong>{{ form.prenom }} {{ form.nom }}</strong></div>
              <div class="recap-item"><span>Email</span><strong>{{ form.email }}</strong></div>
              <div class="recap-item"><span>Ville</span><strong>{{ form.ville }}</strong></div>
              <div class="recap-item"><span>Services</span><strong>{{ form.prestations.join(', ') || '—' }}</strong></div>
            </div>
          </div>
        </div>

        <!-- Error -->
        <p v-if="error" class="form-error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ error }}
        </p>

        <!-- Navigation -->
        <div class="step-nav">
          <button v-if="step > 1" class="btn-back" @click="step--; error = ''">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            Retour
          </button>
          <div v-else></div>

          <button v-if="step < 4" class="btn-primary" @click="nextStep">
            Continuer
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button v-else class="btn-primary" :disabled="loading" @click="submit">
            <span v-if="loading" class="spinner-sm"></span>
            {{ loading ? 'Envoi en cours…' : 'Envoyer mon dossier' }}
          </button>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

/* ── LAYOUT ── */
.postuler-layout {
  display: flex;
  min-height: calc(100vh - 56px);
}

/* ── PANNEAU GAUCHE ── */
.postuler-aside {
  width: 380px;
  flex-shrink: 0;
  background: #d6cda4;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 56px;
  height: calc(100vh - 56px);
  overflow: hidden;
}

.aside-top {
  padding: 2.5rem 2rem 1.5rem;
  flex: 1;
}

.aside-logo { display: inline-block; margin-bottom: 2rem; }

.postuler-aside h2 {
  font-size: 1.6rem;
  font-weight: 900;
  color: #1a1a0e;
  letter-spacing: -0.02em;
  margin-bottom: 0.75rem;
  line-height: 1.2;
}

.postuler-aside > .aside-top > p {
  font-size: 0.875rem;
  color: #5a5234;
  line-height: 1.7;
  margin-bottom: 1.75rem;
}

.benefits {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.benefits li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #3d3820;
}

.benefit-icon {
  width: 34px;
  height: 34px;
  background: rgba(255,255,255,0.5);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}

.aside-illus {
  flex-shrink: 0;
  overflow: hidden;
  line-height: 0;
}

.aside-illus img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
  object-position: top center;
}

/* ── PANNEAU DROIT ── */
.postuler-main {
  flex: 1;
  background: #faf8f2;
  padding: 3rem 3rem 4rem;
  overflow-y: auto;
}

/* ── SUCCÈS ── */
.success-screen {
  max-width: 480px;
  margin: 4rem auto;
  text-align: center;
}

.success-circle {
  width: 80px;
  height: 80px;
  background: #f0fdf4;
  border: 2px solid #bbf7d0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
}

.success-screen h2 {
  font-size: 1.75rem;
  font-weight: 900;
  color: #1a1a0e;
  margin-bottom: 0.75rem;
}

.success-screen p {
  font-size: 0.9rem;
  color: #6b6347;
  line-height: 1.7;
  margin-bottom: 2rem;
}

/* ── HEADER ── */
.form-header {
  max-width: 540px;
  margin: 0 auto 2rem;
}

.form-header h1 {
  font-size: 1.75rem;
  font-weight: 900;
  color: #1a1a0e;
  letter-spacing: -0.02em;
  margin-bottom: 0.25rem;
}

.form-header p {
  font-size: 0.82rem;
  color: #9ca3af;
  font-weight: 500;
}

/* ── STEPPER ── */
.stepper {
  display: flex;
  align-items: center;
  max-width: 540px;
  margin: 0 auto 1rem;
}

.step-item {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 0;
}

.step-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #e0d8c2;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: #b0a480;
  flex-shrink: 0;
  transition: all 0.2s;
  z-index: 1;
}

.step-item.active .step-circle {
  border-color: #515F37;
  background: #515F37;
  color: #d6cda4;
}

.step-item.done .step-circle {
  border-color: #515F37;
  background: #f0f7ea;
  color: #515F37;
}

.step-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: #b0a480;
  margin-left: 0.5rem;
  white-space: nowrap;
  transition: color 0.2s;
}

.step-item.active .step-label,
.step-item.done .step-label {
  color: #515F37;
}

.step-line {
  flex: 1;
  height: 2px;
  background: #e0d8c2;
  margin: 0 0.5rem;
  transition: background 0.2s;
}

.step-item.done .step-line { background: #515F37; }

/* Progress bar */
.progress-bar {
  max-width: 540px;
  margin: 0 auto 2.5rem;
  height: 3px;
  background: #e0d8c2;
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #515F37;
  border-radius: 999px;
  transition: width 0.4s ease;
}

/* ── FORM STEP ── */
.form-step {
  max-width: 540px;
  margin: 0 auto;
}

.field { margin-bottom: 1.25rem; }

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.875rem;
  margin-bottom: 1.25rem;
}

label {
  display: block;
  font-size: 0.78rem;
  font-weight: 700;
  color: #5a5234;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.4rem;
}

.req { color: #515F37; }
.optional { font-weight: 400; text-transform: none; letter-spacing: 0; color: #9ca3af; font-size: 0.75rem; }
.field-hint { font-size: 0.78rem; color: #9ca3af; margin: -0.2rem 0 0.6rem; font-weight: 400; text-transform: none; letter-spacing: 0; }

input[type="text"],
input[type="email"],
input[type="password"],
input[type="tel"],
input[type="number"],
textarea {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border: 1.5px solid #e0d8c2;
  border-radius: 10px;
  font-size: 0.9rem;
  color: #1a1a0e;
  background: #fff;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  font-family: inherit;
}

input:focus, textarea:focus {
  border-color: #515F37;
  box-shadow: 0 0 0 3px rgba(81,95,55,0.1);
}

textarea { resize: vertical; }

/* Services chips */
.service-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.chip {
  padding: 0.35rem 0.875rem;
  border: 1.5px solid #e0d8c2;
  border-radius: 999px;
  background: #fff;
  color: #5a5234;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.chip:hover { border-color: #515F37; color: #515F37; }
.chip.active { background: #515F37; border-color: #515F37; color: #d6cda4; }

/* Checkboxes */
.checkboxes {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 1.25rem;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  font-size: 0.875rem;
  color: #3d3820;
  cursor: pointer;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  margin-bottom: 0;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  border: 1.5px solid #c9bfa0;
  border-radius: 4px;
  accent-color: #515F37;
  flex-shrink: 0;
  margin-top: 2px;
  cursor: pointer;
}

.checkbox-label a { color: #515F37; }

/* Info box */
.info-box {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  background: #f5f2ea;
  border: 1px solid #e0d8c2;
  border-radius: 10px;
  padding: 0.875rem 1rem;
  font-size: 0.8rem;
  color: #6b6347;
  line-height: 1.6;
  margin-bottom: 1.25rem;
}
.info-box svg { flex-shrink: 0; margin-top: 1px; color: #515F37; }

/* Photo upload */
.photo-upload {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-top: 0.5rem;
}

.photo-preview {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 2px solid #e0d8c2;
  overflow: hidden;
  background: #f5f2ea;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #c9bfa0;
}

.photo-preview img { width: 100%; height: 100%; object-fit: cover; }
.photo-placeholder { display: flex; align-items: center; justify-content: center; }

.visually-hidden { position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0; }

.btn-upload {
  display: inline-block;
  padding: 0.45rem 1rem;
  border: 1.5px solid #c9bfa0;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #3d3820;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-upload:hover { border-color: #515F37; color: #515F37; }
.upload-hint { font-size: 0.72rem; color: #9ca3af; margin-top: 0.4rem; font-weight: 400; text-transform: none; letter-spacing: 0; }

/* CGU block */
.cgu-block {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 2rem;
}

/* Récap */
.recap {
  background: #fff;
  border: 1.5px solid #e0d8c2;
  border-radius: 14px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.recap h3 {
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #515F37;
  margin-bottom: 1rem;
}

.recap-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.recap-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.recap-item span {
  font-size: 0.7rem;
  color: #9ca3af;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.recap-item strong {
  font-size: 0.875rem;
  color: #1a1a0e;
  font-weight: 600;
}

/* Error */
.form-error {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: #dc2626;
  font-size: 0.8rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 0.6rem 0.875rem;
  margin-bottom: 1rem;
  max-width: 540px;
}

/* Navigation */
.step-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 540px;
  margin-top: 1.5rem;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.7rem 1.25rem;
  background: #fff;
  border: 1.5px solid #e0d8c2;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #5a5234;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-back:hover { border-color: #515F37; color: #515F37; }

.btn-primary {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.75rem 1.75rem;
  background: #515F37;
  color: #d6cda4;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
  text-decoration: none;
}
.btn-primary:hover:not(:disabled) { background: #3d4829; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.spinner-sm {
  width: 15px; height: 15px;
  border: 2px solid rgba(214,205,164,0.4);
  border-top-color: #d6cda4;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── RESPONSIVE ── */
@media (max-width: 900px) {
  .postuler-layout { flex-direction: column; }
  .postuler-aside { width: 100%; height: auto; position: static; }
  .aside-illus { display: none; }
  .postuler-main { padding: 2rem 1.5rem 3rem; }
  .field-row, .recap-grid { grid-template-columns: 1fr; }
  .stepper { display: none; }
}
</style>
