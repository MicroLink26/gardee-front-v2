<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../../../stores/auth';
import { getMyProfile, updateMyProfile } from '../../../services/users';
import { useCategoriesStore } from '../../../stores/categories';

const auth = useAuthStore();
const categories = useCategoriesStore();

const loading = ref(true);
const saving = ref(false);
const saved = ref(false);
const error = ref('');

const form = ref({
  nom: '', prenom: '', telephone: '',
  prestations: [] as string[],
  tarifHoraire: '',
  description: '',
  adresse: '', codePostal: '', ville: '',
  materielOK: false, isEntrepreneur: false,
  siret: '', qualifElagage: false, contactCom: false,
  consentDataProcessing: false,
});

const photoFile = ref<File | null>(null);
const photoPreview = ref('');

onMounted(async () => {
  const [user] = await Promise.all([getMyProfile(), categories.load()]);
  form.value = {
    nom: user.nom, prenom: user.prenom, telephone: user.telephone,
    prestations: [...user.prestations],
    tarifHoraire: user.tarifHoraire?.toString() ?? '',
    description: user.description ?? '',
    adresse: user.adresse ?? '', codePostal: user.codePostal ?? '', ville: user.ville ?? '',
    materielOK: (user as Record<string, unknown>).materielOK as boolean ?? false,
    isEntrepreneur: (user as Record<string, unknown>).isEntrepreneur as boolean ?? false,
    siret: (user as Record<string, unknown>).siret as string ?? '',
    qualifElagage: (user as Record<string, unknown>).qualifElagage as boolean ?? false,
    contactCom: (user as Record<string, unknown>).contactCom as boolean ?? false,
    consentDataProcessing: (user as Record<string, unknown>).consentDataProcessing as boolean ?? false,
  };
  photoPreview.value = user.profil_image?.secure_url ?? '';
  loading.value = false;
});

function togglePrestation(name: string) {
  const idx = form.value.prestations.indexOf(name);
  if (idx >= 0) form.value.prestations.splice(idx, 1);
  else form.value.prestations.push(name);
}

function onPhotoChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  photoFile.value = file;
  photoPreview.value = URL.createObjectURL(file);
}

async function save() {
  error.value = '';
  saving.value = true;
  try {
    const fd = new FormData();
    const data = { ...form.value, tarifHoraire: form.value.tarifHoraire || undefined };
    for (const [k, v] of Object.entries(data)) {
      if (Array.isArray(v)) v.forEach(i => fd.append(k, i));
      else if (v !== undefined) fd.append(k, String(v));
    }
    if (photoFile.value) fd.append('photo', photoFile.value);
    await updateMyProfile(fd as unknown as Parameters<typeof updateMyProfile>[0]);
    saved.value = true;
    setTimeout(() => (saved.value = false), 3000);
  } catch {
    error.value = 'Impossible de sauvegarder.';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="profil-page">
    <div class="page-header">
      <h1>Mon profil</h1>
      <p class="header-sub">Gérez vos informations personnelles et professionnelles</p>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      Chargement...
    </div>

    <form v-else @submit.prevent="save" class="profil-form">

      <!-- Photo -->
      <div class="section-card">
        <div class="section-header">
          <h2>Photo de profil</h2>
        </div>
        <div class="photo-section">
          <div class="photo-preview">
            <img v-if="photoPreview" :src="photoPreview" alt="Photo de profil" />
            <span v-else class="photo-initials">{{ form.prenom[0] }}{{ form.nom[0] }}</span>
          </div>
          <div class="photo-actions">
            <input type="file" id="photo-input" accept="image/*" class="sr-only" @change="onPhotoChange" />
            <label for="photo-input" class="btn-outline">Changer la photo</label>
            <p class="hint">JPG ou PNG · Max 5 Mo</p>
          </div>
        </div>
      </div>

      <!-- Informations personnelles -->
      <div class="section-card">
        <div class="section-header">
          <h2>Informations personnelles</h2>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Prénom</label>
            <input v-model="form.prenom" type="text" autocomplete="given-name" />
          </div>
          <div class="field">
            <label>Nom</label>
            <input v-model="form.nom" type="text" autocomplete="family-name" />
          </div>
        </div>
        <div class="field">
          <label>Téléphone</label>
          <input v-model="form.telephone" type="tel" autocomplete="tel" placeholder="06 12 34 56 78" />
        </div>
      </div>

      <!-- Activité prestataire -->
      <template v-if="auth.isPrestataire">
        <div class="section-card">
          <div class="section-header">
            <h2>Activité</h2>
            <span class="section-badge">Prestataire</span>
          </div>

          <div class="field">
            <label>Services proposés</label>
            <div class="chip-group">
              <button
                v-for="cat in categories.categories"
                :key="cat._id"
                type="button"
                :class="['service-chip', { active: form.prestations.includes(cat.name) }]"
                @click="togglePrestation(cat.name)"
              >{{ cat.name }}</button>
            </div>
          </div>

          <div class="field">
            <label>Tarif horaire</label>
            <div class="input-suffix">
              <input v-model="form.tarifHoraire" type="number" min="0" placeholder="ex : 35" />
              <span class="suffix">€/h</span>
            </div>
          </div>

          <div class="field">
            <label>Description</label>
            <textarea v-model="form.description" rows="4" placeholder="Décrivez votre expérience, vos spécialités..."></textarea>
          </div>

          <div class="checkbox-group">
            <label class="checkbox-item">
              <input v-model="form.materielOK" type="checkbox" />
              <span class="checkbox-box"></span>
              Matériel disponible
            </label>
            <label class="checkbox-item">
              <input v-model="form.isEntrepreneur" type="checkbox" />
              <span class="checkbox-box"></span>
              Auto-entrepreneur / entreprise
            </label>
            <label class="checkbox-item">
              <input v-model="form.qualifElagage" type="checkbox" />
              <span class="checkbox-box"></span>
              Qualification élagage
            </label>
          </div>

          <div v-if="form.isEntrepreneur" class="field">
            <label>Numéro SIRET</label>
            <input v-model="form.siret" type="text" maxlength="14" placeholder="14 chiffres" />
          </div>
        </div>

        <!-- Adresse -->
        <div class="section-card">
          <div class="section-header">
            <h2>Adresse d'activité</h2>
            <span class="section-note">Utilisée pour votre géolocalisation sur la carte</span>
          </div>
          <div class="field">
            <label>Adresse</label>
            <input v-model="form.adresse" type="text" placeholder="12 rue des jardins" />
          </div>
          <div class="field-row">
            <div class="field">
              <label>Code postal</label>
              <input v-model="form.codePostal" type="text" maxlength="5" placeholder="75001" />
            </div>
            <div class="field">
              <label>Ville</label>
              <input v-model="form.ville" type="text" placeholder="Paris" />
            </div>
          </div>
        </div>
      </template>

      <!-- Save -->
      <div class="save-row">
        <div v-if="saved" class="saved-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Profil enregistré avec succès
        </div>
        <p v-if="error" class="error-msg">{{ error }}</p>
        <button type="submit" class="btn-primary" :disabled="saving">
          {{ saving ? 'Enregistrement...' : 'Enregistrer les modifications' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.profil-page { display: flex; flex-direction: column; gap: 1.5rem; max-width: 680px; }

.page-header h1 { font-size: 1.5rem; font-weight: 900; color: #1a1a0e; margin: 0 0 0.25rem; }
.header-sub { font-size: 0.875rem; color: #9ca3af; margin: 0; }

.loading {
  display: flex; align-items: center; gap: 0.75rem;
  color: #9ca3af; font-size: 0.875rem; padding: 2rem 0;
}
.spinner {
  width: 20px; height: 20px;
  border: 2px solid #e5e2d3;
  border-top-color: #515F37;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.profil-form { display: flex; flex-direction: column; gap: 1.25rem; }

/* Section card */
.section-card {
  background: #fff;
  border: 1.5px solid #e5e2d3;
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 0.875rem;
  border-bottom: 1px solid #f0ede3;
}
.section-header h2 { font-size: 0.95rem; font-weight: 700; color: #1a1a0e; margin: 0; }
.section-badge {
  font-size: 0.7rem; font-weight: 700;
  background: #f0ede3; color: #515F37;
  padding: 0.15rem 0.55rem; border-radius: 999px;
  border: 1px solid #d6cda4;
}
.section-note { font-size: 0.75rem; color: #9ca3af; margin-left: auto; }

/* Photo */
.photo-section { display: flex; align-items: center; gap: 1.25rem; }
.photo-preview {
  width: 76px; height: 76px;
  border-radius: 50%;
  overflow: hidden;
  background: #f0ede3;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  border: 3px solid #e5e2d3;
}
.photo-preview img { width: 100%; height: 100%; object-fit: cover; }
.photo-initials { font-size: 1.5rem; font-weight: 800; color: #515F37; }
.sr-only { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; }
.btn-outline {
  display: inline-block;
  padding: 0.45rem 1rem;
  border: 1.5px solid #d6cda4;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  background: #fff;
  color: #515F37;
  font-weight: 600;
  transition: all 0.15s;
}
.btn-outline:hover { background: #f0ede3; }
.hint { font-size: 0.75rem; color: #9ca3af; margin-top: 0.35rem; margin-bottom: 0; }

/* Fields */
.field { display: flex; flex-direction: column; gap: 0.35rem; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.875rem; }

label { font-size: 0.825rem; font-weight: 600; color: #374151; }

input, textarea {
  width: 100%;
  padding: 0.6rem 0.875rem;
  border: 1.5px solid #e5e2d3;
  border-radius: 10px;
  font-size: 0.9rem;
  font-family: inherit;
  color: #1a1a0e;
  background: #faf8f2;
  transition: border-color 0.15s, background 0.15s;
}
input:focus, textarea:focus { outline: none; border-color: #515F37; background: #fff; }
textarea { resize: vertical; }

.input-suffix { position: relative; }
.input-suffix input { padding-right: 3rem; }
.suffix {
  position: absolute;
  right: 0.875rem; top: 50%;
  transform: translateY(-50%);
  font-size: 0.875rem; font-weight: 700; color: #9ca3af;
  pointer-events: none;
}

/* Service chips */
.chip-group { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.service-chip {
  padding: 0.3rem 0.8rem;
  border: 1.5px solid #e5e2d3;
  border-radius: 999px;
  background: #faf8f2;
  color: #6b7280;
  font-size: 0.8rem; font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.service-chip:hover { border-color: #515F37; color: #515F37; }
.service-chip.active { background: #515F37; border-color: #515F37; color: #fff; font-weight: 700; }

/* Checkboxes */
.checkbox-group { display: flex; flex-direction: column; gap: 0.6rem; }
.checkbox-item {
  display: flex; align-items: center; gap: 0.6rem;
  font-size: 0.875rem; cursor: pointer;
  color: #374151; font-weight: 400;
}
.checkbox-item input[type="checkbox"] { display: none; }
.checkbox-box {
  width: 18px; height: 18px;
  border: 1.5px solid #d1d5db;
  border-radius: 5px;
  background: #fff;
  flex-shrink: 0;
  transition: all 0.15s;
  position: relative;
}
.checkbox-item input:checked ~ .checkbox-box {
  background: #515F37;
  border-color: #515F37;
}
.checkbox-item input:checked ~ .checkbox-box::after {
  content: '';
  position: absolute;
  left: 4px; top: 1px;
  width: 6px; height: 10px;
  border: 2px solid #fff;
  border-left: none; border-top: none;
  transform: rotate(45deg);
}

/* Save row */
.save-row { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }

.saved-banner {
  display: flex; align-items: center; gap: 0.5rem;
  background: #f0ede3; color: #515F37;
  padding: 0.6rem 1rem; border-radius: 8px;
  font-weight: 700; font-size: 0.875rem;
  border: 1px solid #d6cda4;
}
.saved-banner svg { width: 16px; height: 16px; }

.error-msg { color: #ef4444; font-size: 0.875rem; margin: 0; }

.btn-primary {
  padding: 0.7rem 2rem;
  background: #515F37; color: #fff;
  border: none; border-radius: 10px;
  cursor: pointer; font-weight: 700;
  font-size: 0.95rem;
  transition: background 0.15s;
}
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
.btn-primary:hover:not(:disabled) { background: #3d4a28; }

@media (max-width: 600px) {
  .field-row { grid-template-columns: 1fr; }
  .photo-section { flex-direction: column; align-items: flex-start; }
  .save-row { flex-direction: column; align-items: stretch; }
  .btn-primary { width: 100%; text-align: center; }
}
</style>
