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
  <div>
    <h2>Mon profil</h2>
    <div v-if="loading" class="loading">Chargement...</div>
    <form v-else @submit.prevent="save" class="profil-form">

      <!-- Photo -->
      <div class="photo-section">
        <div class="photo-preview">
          <img v-if="photoPreview" :src="photoPreview" alt="Photo de profil" />
          <span v-else class="placeholder">{{ form.prenom[0] }}{{ form.nom[0] }}</span>
        </div>
        <div>
          <input type="file" id="photo-input" accept="image/*" class="sr-only" @change="onPhotoChange" />
          <label for="photo-input" class="btn-outline-sm">Changer la photo</label>
          <p class="hint">JPG, PNG — max 5 Mo</p>
        </div>
      </div>

      <!-- Informations personnelles -->
      <fieldset>
        <legend>Informations personnelles</legend>
        <div class="field-row">
          <div class="field"><label>Prénom</label><input v-model="form.prenom" type="text" /></div>
          <div class="field"><label>Nom</label><input v-model="form.nom" type="text" /></div>
        </div>
        <div class="field"><label>Téléphone</label><input v-model="form.telephone" type="tel" /></div>
      </fieldset>

      <!-- Activité (prestataires uniquement) -->
      <fieldset v-if="auth.isPrestataire">
        <legend>Activité</legend>
        <div class="field">
          <label>Services proposés</label>
          <div class="checkboxes">
            <label v-for="cat in categories.categories" :key="cat._id" class="checkbox-item">
              <input type="checkbox" :checked="form.prestations.includes(cat.name)" @change="togglePrestation(cat.name)" />
              {{ cat.name }}
            </label>
          </div>
        </div>
        <div class="field"><label>Tarif horaire (€/h)</label><input v-model="form.tarifHoraire" type="number" min="0" /></div>
        <div class="field"><label>Description</label><textarea v-model="form.description" rows="4"></textarea></div>
        <div class="checkboxes-col">
          <label class="checkbox-item"><input v-model="form.materielOK" type="checkbox" /> Matériel disponible</label>
          <label class="checkbox-item"><input v-model="form.isEntrepreneur" type="checkbox" /> Auto-entrepreneur / entreprise</label>
          <label class="checkbox-item"><input v-model="form.qualifElagage" type="checkbox" /> Qualification élagage</label>
        </div>
        <div v-if="form.isEntrepreneur" class="field"><label>SIRET</label><input v-model="form.siret" type="text" maxlength="14" /></div>
      </fieldset>

      <!-- Adresse (prestataires uniquement) -->
      <fieldset v-if="auth.isPrestataire">
        <legend>Adresse</legend>
        <div class="field"><label>Adresse</label><input v-model="form.adresse" type="text" /></div>
        <div class="field-row">
          <div class="field"><label>Code postal</label><input v-model="form.codePostal" type="text" maxlength="5" /></div>
          <div class="field"><label>Ville</label><input v-model="form.ville" type="text" /></div>
        </div>
      </fieldset>

      <div v-if="saved" class="saved-banner">✓ Profil enregistré avec succès</div>
      <p v-if="error" class="error">{{ error }}</p>

      <button type="submit" class="btn-primary" :disabled="saving">
        {{ saving ? 'Enregistrement...' : 'Enregistrer les modifications' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
h2 { margin-bottom: 1.5rem; font-size: 1.5rem; }
.loading { color: #6b7280; }
.profil-form { display: flex; flex-direction: column; gap: 1.5rem; max-width: 680px; }
.photo-section { display: flex; align-items: center; gap: 1.25rem; }
.photo-preview { width: 72px; height: 72px; border-radius: 50%; overflow: hidden; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; color: #9ca3af; }
.photo-preview img { width: 100%; height: 100%; object-fit: cover; }
.sr-only { position: absolute; width: 1px; height: 1px; opacity: 0; }
.btn-outline-sm { padding: 0.4rem 1rem; border: 1.5px solid #d1d5db; border-radius: 8px; cursor: pointer; font-size: 0.875rem; background: #fff; }
.hint { font-size: 0.8rem; color: #9ca3af; margin-top: 0.3rem; }
fieldset { border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.25rem; background: #fff; }
legend { font-weight: 700; color: #374151; padding: 0 0.5rem; font-size: 0.95rem; }
.field { margin-bottom: 0.875rem; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.3rem; color: #374151; }
input, textarea { width: 100%; padding: 0.6rem 0.875rem; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box; }
input:focus, textarea:focus { outline: none; border-color: #16a34a; }
.checkboxes { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; margin-top: 0.4rem; }
.checkboxes-col { display: flex; flex-direction: column; gap: 0.4rem; }
.checkbox-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; cursor: pointer; font-weight: 400; }
.saved-banner { background: #dcfce7; color: #16a34a; padding: 0.75rem 1rem; border-radius: 8px; font-weight: 600; }
.error { color: #ef4444; font-size: 0.875rem; }
.btn-primary { padding: 0.75rem 2rem; background: #16a34a; color: #fff; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 1rem; align-self: flex-start; }
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
.btn-primary:hover:not(:disabled) { background: #15803d; }
</style>
