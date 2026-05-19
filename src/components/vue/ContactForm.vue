<script setup lang="ts">
import { ref } from 'vue';
import { api } from '../../services/api';

const form = ref({ name: '', email: '', subject: '', message: '' });
const loading = ref(false);
const sent = ref(false);
const error = ref('');

const SUBJECTS = [
  { id: 'question',    label: 'Question générale',     icon: '💬' },
  { id: 'probleme',    label: 'Problème technique',    icon: '🔧' },
  { id: 'prestataire', label: 'Devenir prestataire',   icon: '🌿' },
  { id: 'partenariat', label: 'Partenariat',           icon: '🤝' },
];

async function submit() {
  if (!form.value.name || !form.value.email || !form.value.message) {
    error.value = 'Veuillez remplir tous les champs obligatoires.'; return;
  }
  error.value = '';
  loading.value = true;
  try {
    await api.post('/contact', form.value);
    sent.value = true;
  } catch {
    error.value = 'Une erreur est survenue. Veuillez réessayer.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="contact-page">

    <!-- ── HERO ── -->
    <div class="hero">
      <div class="hero-inner">
        <span class="eyebrow">Support & questions</span>
        <h1>Nous contacter</h1>
        <p>Une question, une suggestion ou besoin d'aide ?<br />Notre équipe vous répond sous 24h.</p>
      </div>
    </div>

    <!-- ── BODY ── -->
    <div class="body-layout">

      <!-- Left: infos -->
      <aside class="contact-aside">
        <div class="info-card">
          <div class="info-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <div>
            <p class="info-label">Email</p>
            <a href="mailto:contact@gardee.fr" class="info-value">contact@gardee.fr</a>
          </div>
        </div>

        <div class="info-card">
          <div class="info-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div>
            <p class="info-label">Délai de réponse</p>
            <p class="info-value">Sous 24h ouvrées</p>
          </div>
        </div>

        <div class="info-card">
          <div class="info-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div>
            <p class="info-label">Siège</p>
            <p class="info-value">France</p>
          </div>
        </div>

        <div class="faq-shortcut">
          <p class="faq-title">Questions fréquentes</p>
          <a href="/#questions" class="faq-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            Comment utiliser Gardee ?
          </a>
          <a href="/#questions" class="faq-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            Pourquoi postuler ?
          </a>
          <a href="/#questions" class="faq-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            Faire confiance aux jardiniers ?
          </a>
        </div>

        <div class="aside-tree">
          <img src="/arbreContacter.png" alt="" aria-hidden="true" />
        </div>
      </aside>

      <!-- Right: form -->
      <div class="form-panel">

        <!-- Succès -->
        <div v-if="sent" class="success">
          <div class="success-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#515F37" stroke-width="2.5" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <h2>Message envoyé !</h2>
          <p>Merci de nous avoir contactés. Nous vous répondrons sous 24h ouvrées à l'adresse <strong>{{ form.email }}</strong>.</p>
          <button class="btn-reset" @click="sent = false; form.name = ''; form.email = ''; form.message = ''; form.subject = ''">
            Envoyer un autre message
          </button>
        </div>

        <template v-else>
          <h2 class="form-title">Envoyer un message</h2>

          <!-- Subject chips -->
          <div class="field">
            <label class="field-label">Sujet</label>
            <div class="subject-chips">
              <button
                v-for="s in SUBJECTS" :key="s.id"
                type="button"
                :class="['subject-chip', { active: form.subject === s.id }]"
                @click="form.subject = form.subject === s.id ? '' : s.id"
              >
                <span>{{ s.icon }}</span>
                {{ s.label }}
              </button>
            </div>
          </div>

          <!-- Name + email -->
          <div class="field-row">
            <div class="field">
              <label class="field-label">Nom <span class="req">*</span></label>
              <input v-model="form.name" type="text" placeholder="Jean Dupont" />
            </div>
            <div class="field">
              <label class="field-label">Email <span class="req">*</span></label>
              <input v-model="form.email" type="email" placeholder="jean@email.fr" />
            </div>
          </div>

          <!-- Message -->
          <div class="field">
            <label class="field-label">Message <span class="req">*</span></label>
            <textarea v-model="form.message" rows="6" placeholder="Décrivez votre demande en détail…"></textarea>
          </div>

          <!-- Error -->
          <p v-if="error" class="form-error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {{ error }}
          </p>

          <div class="form-footer">
            <p class="form-note">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Vos données ne sont jamais partagées avec des tiers.
            </p>
            <button type="submit" class="btn-submit" :disabled="loading" @click="submit">
              <span v-if="loading" class="spinner"></span>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              {{ loading ? 'Envoi…' : 'Envoyer le message' }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; margin: 0; padding: 0; }

/* ── HERO ── */
.hero {
  background: linear-gradient(150deg, #faf8f2 0%, #f2ede0 100%);
  border-bottom: 1px solid #e8e0cc;
  padding: 3.5rem 0 3rem;
}

.hero-inner {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 3rem;
}

.eyebrow {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #515F37;
  margin-bottom: 0.75rem;
}

h1 {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 900;
  color: #1a1a0e;
  letter-spacing: -0.03em;
  margin-bottom: 0.6rem;
}

.hero p {
  font-size: 0.95rem;
  color: #6b6347;
  line-height: 1.7;
}

/* ── BODY ── */
.body-layout {
  max-width: 1000px;
  margin: 0 auto;
  padding: 3rem;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 3.5rem;
  align-items: start;
}

/* ── ASIDE ── */
.contact-aside {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  position: sticky;
  top: 72px;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.875rem 1rem;
  background: #fff;
  border: 1.5px solid #e8e0cc;
  border-radius: 12px;
  transition: border-color 0.15s;
}

.info-card:hover { border-color: #c9bfa0; }

.info-icon {
  width: 40px;
  height: 40px;
  background: #f5f2ea;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #515F37;
  flex-shrink: 0;
}

.info-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #9ca3af;
  margin-bottom: 0.15rem;
}

.info-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1a1a0e;
  text-decoration: none;
}

a.info-value:hover { color: #515F37; }

/* FAQ shortcut */
.faq-shortcut {
  background: #d6cda4;
  border-radius: 12px;
  padding: 1rem;
  margin-top: 0.25rem;
}

.faq-title {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #515F37;
  margin-bottom: 0.75rem;
}

.faq-link {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: #3d3820;
  text-decoration: none;
  padding: 0.35rem 0;
  border-bottom: 1px solid rgba(81,95,55,0.1);
  transition: color 0.15s;
}

.faq-link:last-child { border-bottom: none; }
.faq-link:hover { color: #515F37; }
.faq-link svg { color: #515F37; flex-shrink: 0; }

/* Tree decoration */
.aside-tree {
  text-align: center;
  margin-top: 0.5rem;
  opacity: 0.85;
}

.aside-tree img {
  width: 140px;
  height: auto;
  filter: drop-shadow(0 4px 12px rgba(81,95,55,0.15));
}

/* ── FORM PANEL ── */
.form-panel {
  background: #fff;
  border: 1.5px solid #e8e0cc;
  border-radius: 20px;
  padding: 2.25rem;
  box-shadow: 0 4px 24px rgba(81,95,55,0.06);
}

.form-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #1a1a0e;
  margin-bottom: 1.75rem;
  letter-spacing: -0.01em;
}

/* Fields */
.field { margin-bottom: 1.25rem; }

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.875rem;
  margin-bottom: 1.25rem;
}

.field-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 800;
  color: #5a5234;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 0.4rem;
}

.req { color: #515F37; }

input, textarea {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border: 1.5px solid #e0d8c2;
  border-radius: 10px;
  font-size: 0.9rem;
  color: #1a1a0e;
  background: #faf8f2;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  font-family: inherit;
}

input:focus, textarea:focus {
  border-color: #515F37;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(81,95,55,0.08);
}

textarea { resize: vertical; }

/* Subject chips */
.subject-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.subject-chip {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.9rem;
  border: 1.5px solid #e0d8c2;
  border-radius: 999px;
  background: #faf8f2;
  color: #5a5234;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.subject-chip:hover { border-color: #515F37; color: #515F37; background: #fff; }
.subject-chip.active { background: #515F37; border-color: #515F37; color: #d6cda4; }

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
}

/* Form footer */
.form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.form-note {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: #9ca3af;
}

.form-note svg { color: #515F37; flex-shrink: 0; }

.btn-submit {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.75rem;
  background: #515F37;
  color: #d6cda4;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, transform 0.15s;
  white-space: nowrap;
}

.btn-submit:hover:not(:disabled) { background: #3d4829; transform: translateY(-1px); }
.btn-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

.spinner {
  width: 15px; height: 15px;
  border: 2px solid rgba(214,205,164,0.35);
  border-top-color: #d6cda4;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── SUCCÈS ── */
.success {
  text-align: center;
  padding: 3rem 1rem;
}

.success-icon {
  width: 72px; height: 72px;
  background: #f0fdf4;
  border: 2px solid #bbf7d0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
}

.success h2 {
  font-size: 1.5rem;
  font-weight: 900;
  color: #1a1a0e;
  margin-bottom: 0.75rem;
}

.success p {
  font-size: 0.875rem;
  color: #6b6347;
  line-height: 1.7;
  margin-bottom: 1.75rem;
}

.success strong { color: #1a1a0e; }

.btn-reset {
  padding: 0.6rem 1.5rem;
  border: 1.5px solid #e0d8c2;
  border-radius: 10px;
  background: #fff;
  color: #5a5234;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.btn-reset:hover { border-color: #515F37; color: #515F37; }

/* ── RESPONSIVE ── */
@media (max-width: 768px) {
  .body-layout {
    grid-template-columns: 1fr;
    padding: 2rem 1.5rem;
    gap: 2rem;
  }
  .contact-aside { position: static; }
  .aside-tree { display: none; }
  .field-row { grid-template-columns: 1fr; }
  .form-footer { flex-direction: column; align-items: stretch; }
  .btn-submit { justify-content: center; }
  .hero-inner { padding: 0 1.5rem; }
}
</style>
