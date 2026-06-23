/**
 * Smoke test post-deploy — vérifie que les pages principales du site
 * se chargent sans erreur JS et que les éléments critiques sont rendus.
 *
 * Usage :
 *   node scripts/smoke-test.mjs                          # prod (https://gardee.fr)
 *   BASE_URL=https://staging.example node scripts/smoke-test.mjs
 *
 * Sort avec un code non nul si au moins une page échoue.
 * Contexte : régression du 11/06/2026 (import getAvatar manquant → carte vide)
 * détectée uniquement au runtime navigateur — d'où ce test headless.
 */
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'https://gardee.fr';
const API_URL = process.env.PUBLIC_API_URL ?? 'https://site--gardee-backend--fg6zdpvl2w9z.code.run/api';
const TIMEOUT = 40000;

/** Pages statiques + vérifications spécifiques (sélecteur → nombre minimum attendu) */
const PAGES = [
  { path: '/', expect: {} },
  { path: '/classement/', expect: { 'img,.avatar-initials': 3 } },
  { path: '/carte/', expect: { '.leaflet-marker-icon': 1 } },
  { path: '/postuler/', expect: {} },
  { path: '/contact/', expect: { 'textarea': 1 } },
  { path: '/prestataires/', expect: {} },
  { path: '/app/login/', expect: { 'input[type=password]': 1 } },
];

/** Récupère une fiche prestataire avec photo pour tester une page dynamique */
async function findPrestataireWithPhoto() {
  try {
    const res = await fetch(`${API_URL}/prestataires/ranking?pageSize=100`);
    const data = await res.json();
    const withPhoto = data.items?.find((p) => p.profil_image?.secure_url);
    return withPhoto ?? data.items?.[0] ?? null;
  } catch {
    return null;
  }
}

async function checkPage(ctx, { path, expect }) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('JS: ' + String(e).split('\n')[0].slice(0, 150)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 150));
  });

  let status = null;
  try {
    const resp = await page.goto(BASE_URL + path, { waitUntil: 'networkidle', timeout: TIMEOUT });
    status = resp?.status() ?? null;
    await page.waitForTimeout(2500);

    for (const [selector, min] of Object.entries(expect)) {
      const count = await page.locator(selector).count();
      if (count < min) errors.push(`éléments: "${selector}" attendu ≥${min}, trouvé ${count}`);
    }
  } catch (e) {
    errors.push('navigation: ' + String(e).split('\n')[0].slice(0, 150));
  }
  await page.close();

  const ok = status === 200 && errors.length === 0;
  const uniq = [...new Set(errors)].slice(0, 3);
  console.log(`${ok ? '✓' : '✗'} ${path} [${status ?? '—'}]${uniq.length ? ' → ' + uniq.join(' | ') : ''}`);
  return ok;
}

const browser = await chromium.launch();
const ctx = await browser.newContext();

console.log(`Smoke test sur ${BASE_URL}\n`);
let failures = 0;

for (const p of PAGES) {
  if (!(await checkPage(ctx, p))) failures++;
}

// Page dynamique : fiche prestataire (photo Cloudinary si disponible)
const prest = await findPrestataireWithPhoto();
if (prest) {
  const expect = prest.profil_image?.secure_url ? { 'img[src*=cloudinary]': 1 } : {};
  if (!(await checkPage(ctx, { path: `/prestataires/${prest._id}/`, expect }))) failures++;
} else {
  console.log('⚠ aucun prestataire récupéré depuis l\'API — fiche dynamique non testée');
  failures++;
}

await browser.close();

if (failures > 0) {
  console.log(`\n${failures} page(s) en échec`);
  process.exit(1);
}
console.log('\nToutes les pages sont saines.');
