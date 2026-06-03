<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../../../stores/auth';
import { getMyProfile, updateMyProfile, changePassword } from '../../../services/users';
import { useCategoriesStore } from '../../../stores/categories';
import { useToastStore } from '../../../stores/toast';

const auth = useAuthStore();
const categories = useCategoriesStore();
const toast = useToastStore();

const loading = ref(true);
const loadError = ref(false);
const saving = ref(false);
const saved = ref(false);
const error = ref('');

const form = ref({
  email: '',
  nom: '', prenom: '', telephone: '',
  prestations: [] as string[],
  tarifHoraire: '',
  description: '',
  adresse: '', codePostal: '', ville: '',
  materielOK: false, isEntrepreneur: false,
  siret: '', qualifElagage: false, contactCom: false,
  consentDataProcessing: false,
});

const pwForm = ref({ current: '', newPwd: '', confirm: '' });
const pwSaving = ref(false);
const pwSaved = ref(false);
const pwError = ref('');

const photoFile = ref<File | null>(null);
const photoPreview = ref('');

onMounted(async () => {
  try {
    const [user] = await Promise.all([getMyProfile(), categories.load()]);
    const prest = user.prestataire;
    form.value = {
      email: user.email ?? '',
      nom: user.nom ?? '', prenom: user.prenom ?? '', telephone: user.telephone ?? '',
      prestations: [...(prest?.prestations ?? [])],
      tarifHoraire: prest?.tarifHoraire?.toString() ?? '',
      description: prest?.description ?? '',
      adresse: prest?.adresse ?? '', codePostal: prest?.codePostal ?? '', ville: prest?.ville ?? '',
      materielOK: (prest as Record<string, unknown> | undefined)?.materielOK as boolean ?? false,
      isEntrepreneur: (prest as Record<string, unknown> | undefined)?.isEntrepreneur as boolean ?? false,
      siret: (prest as Record<string, unknown> | undefined)?.siret as string ?? '',
      qualifElagage: (prest as Record<string, unknown> | undefined)?.qualifElagage as boolean ?? false,
      contactCom: (prest as Record<string, unknown> | undefined)?.contactCom as boolean ?? false,
      consentDataProcessing: (user as Record<string, unknown>).consentDataProcessing as boolean ?? false,
    };
    photoPreview.value = prest?.profil_image?.secure_url ?? '';
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
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
    toast.show('Profil enregistré avec succès', 'success');
  } catch {
    error.value = 'Impossible de sauvegarder.';
    toast.show('Erreur lors de la sauvegarde', 'error');
  } finally {
    saving.value = false;
  }
}

async function savePassword() {
  pwError.value = '';
  if (pwForm.value.newPwd !== pwForm.value.confirm) {
    pwError.value = 'Les mots de passe ne correspondent pas.';
    return;
  }
  if (pwForm.value.newPwd.length < 8) {
    pwError.value = 'Le mot de passe doit contenir au moins 8 caractères.';
    return;
  }
  pwSaving.value = true;
  try {
    await changePassword(pwForm.value.current, pwForm.value.newPwd);
    pwForm.value = { current: '', newPwd: '', confirm: '' };
    pwSaved.value = true;
    setTimeout(() => (pwSaved.value = false), 3000);
    toast.show('Mot de passe mis à jour', 'success');
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
    pwError.value = msg ?? 'Impossible de changer le mot de passe.';
    toast.show(pwError.value, 'error');
  } finally {
    pwSaving.value = false;
  }
}
</script>

<template>
  <div class="profil-page">
    <div class="page-header">
      <p class="page-header-eyebrow">Espace personnel</p>
      <h1>Mon profil</h1>
      <p class="header-sub">
        Gérez vos informations personnelles et professionnelles
        <span v-if="auth.user" class="role-badge">
          {{ auth.isPrestataire ? 'Prestataire' : auth.isStaff ? 'Staff' : 'Client' }}
        </span>
      </p>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      Chargement...
    </div>

    <div v-else-if="loadError" class="load-error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      Impossible de charger le profil.
      <button type="button" @click="() => window.location.reload()">Réessayer</button>
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
          <label>Adresse email</label>
          <input v-model="form.email" type="email" autocomplete="email" placeholder="votre@email.fr" />
        </div>
        <div class="field">
          <label>Téléphone</label>
          <input v-model="form.telephone" type="tel" autocomplete="tel" placeholder="06 12 34 56 78" />
        </div>
      </div>

      <!-- Activité -->
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
      </template>

      <!-- Localisation (tous les utilisateurs) -->
      <div class="section-card">
        <div class="section-header">
          <h2>Localisation</h2>
          <span v-if="auth.isPrestataire" class="section-note">Utilisée pour votre géolocalisation sur la carte</span>
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

      <!-- Sécurité -->
      <div class="section-card">
        <div class="section-header">
          <h2>Sécurité</h2>
        </div>
        <div class="field">
          <label>Mot de passe actuel</label>
          <input v-model="pwForm.current" type="password" autocomplete="current-password" placeholder="••••••••" />
        </div>
        <div class="field-row">
          <div class="field">
            <label>Nouveau mot de passe</label>
            <input v-model="pwForm.newPwd" type="password" autocomplete="new-password" placeholder="8 caractères min." />
          </div>
          <div class="field">
            <label>Confirmer</label>
            <input v-model="pwForm.confirm" type="password" autocomplete="new-password" placeholder="••••••••" />
          </div>
        </div>
        <div class="pw-save-row">
          <div v-if="pwSaved" class="saved-banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Mot de passe mis à jour
          </div>
          <p v-if="pwError" class="error-msg">{{ pwError }}</p>
          <button type="button" class="btn-secondary" :disabled="pwSaving || !pwForm.current || !pwForm.newPwd || !pwForm.confirm" @click="savePassword">
            {{ pwSaving ? 'Enregistrement...' : 'Changer le mot de passe' }}
          </button>
        </div>
      </div>

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

.page-header {
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e9e5d6;
}
.page-header-eyebrow {
  font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em;
  text-transform: uppercase; color: #a8c47a; margin: 0 0 0.35rem; display: block;
}
.page-header h1 { font-size: 1.5rem; font-weight: 900; color: #1a1a0e; margin: 0 0 0.25rem; letter-spacing: -0.02em; }
.header-sub { font-size: 0.85rem; color: #9ca3af; margin: 0; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.role-badge {
  font-size: 0.7rem; font-weight: 700;
  background: rgba(168,196,122,0.15); color: #3a5020;
  padding: 0.15rem 0.55rem; border-radius: 999px;
  border: 1px solid rgba(168,196,122,0.3);
}

.loading {
  display: flex; align-items: center; gap: 0.75rem;
  color: #9ca3af; font-size: 0.875rem; padding: 2rem 0;
}

.load-error {
  display: flex; align-items: center; gap: 0.75rem;
  color: #dc2626; font-size: 0.875rem; padding: 2rem 0;
}
.load-error svg { width: 18px; height: 18px; flex-shrink: 0; }
.load-error button {
  padding: 0.35rem 0.875rem; background: #FCFAF5; color: #dc2626;
  border: 1.5px solid #dc2626; border-radius: 8px; cursor: pointer;
  font-size: 0.8rem; font-weight: 600;
}
.spinner {
  width: 20px; height: 20px;
  border: 2px solid #e9e5d6;
  border-top-color: #3a5020;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.profil-form { display: flex; flex-direction: column; gap: 1.25rem; }

/* Section card */
.section-card {
  background: #FCFAF5;
  border: 1.5px solid #e9e5d6;
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
  border-bottom: 1px solid #e9e5d6;
}
.section-header h2 {
  font-size: 0.8rem; font-weight: 700; color: #3a5020; margin: 0;
  text-transform: uppercase; letter-spacing: 0.07em;
  display: flex; align-items: center; gap: 0.4rem;
}
.section-header h2::before {
  content: ''; display: inline-block;
  width: 3px; height: 0.85em;
  background: #a8c47a; border-radius: 2px;
}
.section-badge {
  font-size: 0.7rem; font-weight: 700;
  background: rgba(168,196,122,0.15); color: #3a5020;
  padding: 0.15rem 0.55rem; border-radius: 999px;
  border: 1px solid rgba(168,196,122,0.3);
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
  border: 3px solid #c8d9a6;
}
.photo-preview img { width: 100%; height: 100%; object-fit: cover; }
.photo-initials { font-size: 1.5rem; font-weight: 800; color: #515F37; }
.sr-only { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; }
.btn-outline {
  display: inline-block;
  padding: 0.45rem 1rem;
  border: 1.5px solid #e9e5d6;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  background: #f5f2eb;
  color: #515F37;
  font-weight: 600;
  transition: all 0.15s;
}
.btn-outline:hover { background: #eef2e8; border-color: #a8c47a; }
.hint { font-size: 0.75rem; color: #9ca3af; margin-top: 0.35rem; margin-bottom: 0; }

/* Fields */
.field { display: flex; flex-direction: column; gap: 0.35rem; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.875rem; }

label { font-size: 0.8rem; font-weight: 600; color: #515F37; }

input, textarea {
  width: 100%;
  padding: 0.6rem 0.875rem;
  border: 1.5px solid #e9e5d6;
  border-radius: 10px;
  font-size: 0.9rem;
  font-family: inherit;
  color: #1a1a0e;
  background: #f5f2eb;
  transition: border-color 0.15s, background 0.15s;
}
input:focus, textarea:focus { outline: none; border-color: #515F37; background: #FCFAF5; }
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
  border: 1.5px solid #e9e5d6;
  border-radius: 999px;
  background: #f5f2eb;
  color: #515F37;
  font-size: 0.8rem; font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}
.service-chip:hover { border-color: #a8c47a; background: #eef2e8; }
.service-chip.active { background: #3a5020; border-color: #3a5020; color: #fff; font-weight: 700; }

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
  border: 1.5px solid #e9e5d6;
  border-radius: 5px;
  background: #FCFAF5;
  flex-shrink: 0;
  transition: all 0.15s;
  position: relative;
}
.checkbox-item input:checked ~ .checkbox-box {
  background: #3a5020;
  border-color: #3a5020;
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

/* Password save row */
.pw-save-row { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; margin-top: 0.25rem; }

.btn-secondary {
  padding: 0.6rem 1.5rem;
  background: #FCFAF5; color: #515F37;
  border: 1.5px solid #515F37; border-radius: 10px;
  cursor: pointer; font-weight: 700;
  font-size: 0.9rem;
  transition: background 0.15s, color 0.15s;
}
.btn-secondary:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-secondary:hover:not(:disabled) { background: #515F37; color: #fff; }

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
  background: #3a5020; color: #fff;
  border: none; border-radius: 10px;
  cursor: pointer; font-weight: 700;
  font-size: 0.95rem;
  font-family: inherit;
  transition: background 0.15s, transform 0.15s;
}
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
.btn-primary:hover:not(:disabled) { background: #253515; transform: translateY(-1px); }

@media (max-width: 600px) {
  .section-card { padding: 1.125rem; border-radius: 12px; }
  .field-row { grid-template-columns: 1fr; }
  .photo-section { flex-direction: column; align-items: flex-start; }
  .save-row { flex-direction: column; align-items: stretch; }
  .pw-save-row { flex-direction: column; align-items: stretch; }
  .btn-primary { width: 100%; text-align: center; }
  .btn-secondary { width: 100%; text-align: center; }
  .chip-group { gap: 0.4rem; }
  .service-chip { font-size: 0.78rem; padding: 0.28rem 0.65rem; }
}
</style>
