<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { registerPrestataire } from '../../services/users';
import { useCategoriesStore } from '../../stores/categories';
import EmailVerificationScreen from './EmailVerificationScreen.vue';
import ImageCropper from './ImageCropper.vue';

const categoriesStore = useCategoriesStore();

const step = ref(1);
const loading = ref(false);
const done = ref(false);
const pendingVerificationUserId = ref<string | null>(null);
const error = ref('');

const ELAGAGE_NAMES = ['élagage', 'elagage', 'Élagage'];
const JARDINAGE_VOISINS_NAMES = ['jardinage entre voisins', 'jardinage entre voisins (hors professionnel)'];

const form = ref({
  prenom: '', nom: '', email: '', password: '', telephone: '',
  phonePrefix: '+33',
  profilType: 'amateur' as 'amateur' | 'professionnel',
  prestations: [] as string[],
  tarifHoraire: '',
  description: '',
  materielOK: false,
  isEntrepreneur: false,
  siret: '',
  qualifElagage: false,
  qualifElagageFile: null as File | null,
  adresse: '',
  codePostal: '',
  ville: '',
  contactCom: false,
  photo: null as File | null,
  cgu: false,
  consentDataProcessing: false,
});

const photoPreview = ref('');
const cropperSrc = ref('');
const qualifElagagePreview = ref('');

const availableCategories = computed(() => {
  return categoriesStore.categories.filter(cat => {
    const nameLower = cat.name.toLowerCase();
    if (JARDINAGE_VOISINS_NAMES.some(n => nameLower.includes(n))) return false;
    if (form.value.profilType === 'amateur' && ELAGAGE_NAMES.some(n => nameLower.includes(n))) return false;
    return true;
  });
});

const hasElagage = computed(() =>
  form.value.prestations.some(p => ELAGAGE_NAMES.some(n => p.toLowerCase().includes(n)))
);

const contactComText = computed(() => {
  if (form.value.profilType === 'professionnel') {
    return 'J\'accepte de recevoir du contenu commercial exclusivement réservé aux jardiniers professionnels, avec des offres et des tarifs négociés.';
  }
  return 'J\'accepte de recevoir du contenu commercial sélectionné pour les jardiniers passionnés qui souhaitent s\'équiper au meilleur prix.';
});

onMounted(() => categoriesStore.load());

function setProfilType(type: 'amateur' | 'professionnel') {
  form.value.profilType = type;
  form.value.isEntrepreneur = type === 'professionnel';
  // Remove élagage from prestations if switching to amateur
  if (type === 'amateur') {
    form.value.prestations = form.value.prestations.filter(
      p => !ELAGAGE_NAMES.some(n => p.toLowerCase().includes(n))
    );
    form.value.qualifElagage = false;
  }
}

function togglePrestation(name: string) {
  const idx = form.value.prestations.indexOf(name);
  if (idx >= 0) form.value.prestations.splice(idx, 1);
  else form.value.prestations.push(name);
}

function onPhotoChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  cropperSrc.value = URL.createObjectURL(file);
  // Reset input so same file can be re-selected
  (e.target as HTMLInputElement).value = '';
}

function onCropDone(blob: Blob) {
  form.value.photo = new File([blob], 'profil.jpg', { type: 'image/jpeg' });
  photoPreview.value = URL.createObjectURL(blob);
  cropperSrc.value = '';
}

function cancelCrop() {
  cropperSrc.value = '';
}

function onQualifElagageChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  form.value.qualifElagageFile = file;
  qualifElagagePreview.value = file.name;
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
    // Merge prefix into telephone
    const fullTelephone = `${form.value.phonePrefix}${form.value.telephone.replace(/^0/, '')}`;
    for (const [key, val] of Object.entries(fields)) {
      if (key === 'photo' || key === 'qualifElagageFile' || key === 'phonePrefix') continue;
      if (key === 'telephone') { fd.append('telephone', fullTelephone); continue; }
      if (Array.isArray(val)) val.forEach(v => fd.append(key, v));
      else fd.append(key, String(val));
    }
    if (form.value.photo) fd.append('photo', form.value.photo);
    const result = await registerPrestataire(fd);
    if ((result as Record<string, unknown>)?.requiresVerification) {
      pendingVerificationUserId.value = (result as Record<string, unknown>).userId as string;
    } else {
      done.value = true;
    }
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
  { svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`, text: 'Visibilité locale immédiate' },
  { svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`, text: 'Avis clients vérifiés' },
  { svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`, text: 'Gestion simplifiée des réservations' },
  { svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/></svg>`, text: 'Accès au classement régional' },
];
</script>

<template>
  <EmailVerificationScreen v-if="pendingVerificationUserId" :userId="pendingVerificationUserId" redirect="/app/profil" />

  <ImageCropper v-else-if="cropperSrc" :src="cropperSrc" @crop="onCropDone" @cancel="cancelCrop" />

  <div v-else class="postuler-layout">

    <!-- ── PANNEAU GAUCHE ── -->
    <aside class="postuler-aside">
      <div class="aside-deco" aria-hidden="true">
        <svg class="ad-leaf ad-leaf-a" viewBox="0 0 220 300" xmlns="http://www.w3.org/2000/svg">
          <path d="M110,8 C175,8 212,65 212,150 C212,235 175,292 110,292 C45,292 8,235 8,150 C8,65 45,8 110,8Z" fill="rgba(168,196,122,0.08)"/>
        </svg>
        <svg class="ad-leaf ad-leaf-b" viewBox="0 0 180 260" xmlns="http://www.w3.org/2000/svg">
          <path d="M90,6 C148,6 174,58 174,130 C174,202 148,254 90,254 C32,254 6,202 6,130 C6,58 32,6 90,6Z" fill="rgba(255,255,255,0.04)"/>
        </svg>
        <div class="ad-ring ad-ring-a"></div>
        <div class="ad-ring ad-ring-b"></div>
      </div>
      <div class="aside-content">
        
        <h2>Rejoignez <em>Gardee</em></h2>
        <p>Proposez vos services à des milliers de particuliers près de chez vous et développez votre activité.</p>
        <ul class="benefits">
          <li v-for="b in BENEFITS" :key="b.text">
            <span class="benefit-icon" v-html="b.svg"></span>
            {{ b.text }}
          </li>
        </ul>
        <div class="aside-stat-strip">
          <div class="aside-stat">
            <strong>+500</strong>
            <span>prestataires</span>
          </div>
          <div class="aside-stat-sep"></div>
          <div class="aside-stat">
            <strong>4.7 ★</strong>
            <span>note moyenne</span>
          </div>
          <div class="aside-stat-sep"></div>
          <div class="aside-stat">
            <strong>Gratuit</strong>
            <span>inscription</span>
          </div>
        </div>
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
            <div class="phone-wrap">
              <select v-model="form.phonePrefix" class="phone-prefix">
                <option value="+33">🇫🇷 +33</option>
                <option value="+32">🇧🇪 +32</option>
                <option value="+41">🇨🇭 +41</option>
                <option value="+352">🇱🇺 +352</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+49">🇩🇪 +49</option>
                <option value="+34">🇪🇸 +34</option>
                <option value="+39">🇮🇹 +39</option>
                <option value="+351">🇵🇹 +351</option>
                <option value="+1">🇺🇸 +1</option>
              </select>
              <input v-model="form.telephone" type="tel" placeholder="06 12 34 56 78" class="phone-input" />
            </div>
          </div>
        </div>

        <!-- ── ÉTAPE 2 — Activité ── -->
        <div v-if="step === 2" class="form-step">

          <!-- Bouton Amateur / Professionnel -->
          <div class="field">
            <label>Type de profil <span class="req">*</span></label>
            <div class="profil-toggle">
              <button
                type="button"
                :class="['profil-btn', { 'profil-btn--on': form.profilType === 'amateur' }]"
                @click="setProfilType('amateur')"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Amateur
                <small>Particulier ou passionné</small>
              </button>
              <button
                type="button"
                :class="['profil-btn', { 'profil-btn--on': form.profilType === 'professionnel' }]"
                @click="setProfilType('professionnel')"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
                Professionnel
                <small>Auto-entrepreneur ou entreprise</small>
              </button>
            </div>
          </div>

          <div class="field">
            <label>Services proposés <span class="req">*</span></label>
            <p class="field-hint">Sélectionnez au moins un service</p>
            <div class="service-chips">
              <button
                v-for="cat in availableCategories" :key="cat._id"
                type="button"
                :class="['chip', { active: form.prestations.includes(cat._id) }]"
                @click="togglePrestation(cat._id)"
              >{{ cat.name }}</button>
            </div>
          </div>

          <!-- Justificatif élagage si service élagage sélectionné -->
          <div v-if="hasElagage && form.profilType === 'professionnel'" class="field elagage-doc-field">
            <label>Certification élagage ou justificatif d'assurance <span class="req">*</span></label>
            <p class="field-hint">Joignez votre certificat de qualification ou votre attestation d'assurance responsabilité civile</p>
            <div class="file-upload-wrap">
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" @change="onQualifElagageChange" id="qualif-input" class="visually-hidden" />
              <label for="qualif-input" class="btn-upload">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                {{ qualifElagagePreview || 'Joindre le document' }}
              </label>
            </div>
          </div>

          <!-- SIRET si professionnel -->
          <div v-if="form.profilType === 'professionnel'" class="field">
            <label>Numéro SIRET ou K-bis <span class="req">*</span></label>
            <p class="field-hint">Votre numéro SIRET à 14 chiffres sera vérifié</p>
            <input v-model="form.siret" type="text" maxlength="14" placeholder="Ex : 12345678901234" />
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
            <span>{{ contactComText }}</span>
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
              <div class="recap-item"><span>Services</span><strong>{{ form.prestations.map(id => categoriesStore.categories.find(c => c._id === id)?.name ?? id).join(', ') || '—' }}</strong></div>
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
  background: linear-gradient(155deg, #141f0b 0%, #253515 55%, #3a5020 100%);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 56px;
  height: calc(100vh - 56px);
  overflow: hidden;
}

/* Botanical deco */
.aside-deco { position: absolute; inset: 0; pointer-events: none; }
.ad-leaf { position: absolute; }
.ad-leaf-a { width: 260px; height: 360px; right: -80px; bottom: -80px; }
.ad-leaf-b { width: 180px; height: 260px; left: -60px; top: -40px; }
.ad-ring {
  position: absolute; border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.05);
}
.ad-ring-a { width: 420px; height: 420px; top: -180px; right: -120px; }
.ad-ring-b { width: 260px; height: 260px; bottom: -130px; left: -80px; }

.aside-content {
  position: relative; z-index: 1;
  padding: 2.5rem 2rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.aside-logo { display: inline-block; margin-bottom: 2.25rem; }

.postuler-aside h2 {
  font-size: 1.6rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: -0.03em;
  margin: 0 0 0.75rem;
  line-height: 1.15;
}
.postuler-aside h2 em { color: #a8c47a; font-style: italic; }

.aside-content > p {
  font-size: 0.875rem;
  color: rgba(255,255,255,0.55);
  line-height: 1.7;
  margin: 0 0 2rem;
}

.benefits {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  margin: 0 0 auto;
}

.benefits li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(255,255,255,0.85);
}

.benefit-icon {
  width: 36px;
  height: 36px;
  background: rgba(168,196,122,0.15);
  border: 1px solid rgba(168,196,122,0.25);
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #a8c47a;
}

/* Stats strip */
.aside-stat-strip {
  display: flex;
  align-items: center;
  gap: 0;
  margin-top: 2.5rem;
  padding: 1rem 1.25rem;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
}
.aside-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
}
.aside-stat strong {
  font-size: 1.05rem;
  font-weight: 900;
  color: #a8c47a;
  letter-spacing: -0.02em;
}
.aside-stat span {
  font-size: 0.68rem;
  color: rgba(255,255,255,0.45);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.aside-stat-sep {
  width: 1px;
  height: 32px;
  background: rgba(255,255,255,0.12);
  flex-shrink: 0;
}

/* ── PANNEAU DROIT ── */
.postuler-main {
  flex: 1;
  background: #f2efe6;
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
  background: #FCFAF5;
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
  background: #FCFAF5;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  font-family: inherit;
}

input:focus, textarea:focus {
  border-color: #515F37;
  box-shadow: 0 0 0 3px rgba(81,95,55,0.1);
}

textarea { resize: vertical; }

/* Phone field */
.phone-wrap {
  display: flex;
  gap: 0.4rem;
}
.phone-prefix {
  width: 110px;
  flex-shrink: 0;
  padding: 0.55rem 0.5rem;
  border: 1.5px solid #e0d8c2;
  border-radius: 9px;
  font-size: 0.8rem;
  color: #1a1a0e;
  background: #f5f2eb;
  outline: none;
  font-family: inherit;
  cursor: pointer;
}
.phone-prefix:focus { border-color: #3a5020; }
.phone-input { flex: 1; }

/* Profil toggle Amateur / Pro */
.profil-toggle {
  display: flex;
  gap: 0.75rem;
}
.profil-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 1rem 0.75rem;
  border: 2px solid #e9e5d6;
  border-radius: 14px;
  background: #f5f2eb;
  color: #515F37;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s;
  font-family: inherit;
}
.profil-btn small {
  font-size: 0.73rem;
  font-weight: 400;
  color: #9ca3af;
}
.profil-btn:hover { border-color: #a8c47a; background: #eef2e8; }
.profil-btn--on {
  border-color: #3a5020;
  background: linear-gradient(135deg, #eef2e8, #f5f7f0);
  color: #3a5020;
  box-shadow: 0 4px 12px rgba(58,80,32,0.12);
}
.profil-btn--on small { color: #6b8a3a; }

/* Élagage doc upload */
.elagage-doc-field {
  background: #fff8e7;
  border: 1.5px solid #fcd34d;
  border-radius: 12px;
  padding: 1rem;
}

.file-upload-wrap { margin-top: 0.25rem; }

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
  background: #FCFAF5;
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
  background: #FCFAF5;
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
  background: #FCFAF5;
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
  .aside-content { padding: 2rem 1.5rem 2rem; }
  .aside-stat-strip { display: none; }
  .postuler-main { padding: 2rem 1.5rem 3rem; }
  .field-row, .recap-grid { grid-template-columns: 1fr; }
  .stepper { display: none; }
}
@media (max-width: 480px) {
  .profil-toggle { flex-direction: column; }
  .phone-wrap { flex-direction: row; }
  .phone-prefix { width: 90px; font-size: 0.75rem; }
}
</style>
