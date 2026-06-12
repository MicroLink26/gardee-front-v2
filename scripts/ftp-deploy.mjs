/**
 * Déploiement FTP du dossier dist/ vers OVH.
 *
 * Credentials via variables d'environnement (jamais en dur — GitHub Secrets en CI) :
 *   FTP_HOST, FTP_USER, FTP_PASSWORD  (obligatoires)
 *   FTP_REMOTE_DIR                    (défaut: /www/front — staging: /www/v2)
 *   SITE_BASE_URL                     (défaut: https://gardee.fr — pour le sitemap)
 *
 * Régénère aussi le sitemap.xml à partir des pages réellement présentes dans
 * dist/ (incluant les fiches prestataires prérendues) avant l'upload.
 */
import { Client } from 'basic-ftp';
import { readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCAL_DIR = join(ROOT, 'dist');
const REMOTE_DIR = process.env.FTP_REMOTE_DIR ?? '/www/front';
const BASE_URL = process.env.SITE_BASE_URL ?? 'https://gardee.fr';
const TODAY = new Date().toISOString().split('T')[0];

const { FTP_HOST, FTP_USER, FTP_PASSWORD } = process.env;
if (!FTP_HOST || !FTP_USER || !FTP_PASSWORD) {
  console.error('FTP_HOST, FTP_USER et FTP_PASSWORD sont requis dans l\'environnement.');
  process.exit(1);
}

// --- Génération du sitemap à partir de dist/ ---

const EXCLUDE = new Set([
  '/app/admin',
  '/app/admin/pending',
  '/app/admin/users',
  '/app/dashboard',
  '/app/forgot-password',
  '/app/mes-demandes',
  '/app/profil',
  '/app/requests/confirm',
  '/app/requests/rate',
  '/prestataires',
  '/recherche',
]);

function scanPages(dir, base = '') {
  const pages = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = base + '/' + entry.name;
    if (entry.isDirectory()) {
      pages.push(...scanPages(join(dir, entry.name), rel));
    } else if (entry.name === 'index.html') {
      const slug = base || '/';
      if (!EXCLUDE.has(slug)) pages.push(slug);
    }
  }
  return pages;
}

function priority(slug) {
  if (slug === '/') return '1.0';
  if (slug === '/classement' || slug === '/carte') return '0.9';
  if (slug === '/recherche' || slug.startsWith('/prestataires/')) return '0.8';
  if (slug === '/postuler') return '0.7';
  if (slug === '/contact') return '0.5';
  return '0.4';
}

function changefreq(slug) {
  if (slug === '/classement' || slug === '/carte') return 'daily';
  if (slug.startsWith('/prestataires/') || slug === '/' || slug === '/recherche') return 'weekly';
  return 'monthly';
}

const pages = scanPages(LOCAL_DIR).sort();
const urls = pages.map(slug => {
  const loc = BASE_URL + (slug === '/' ? '/' : slug + '/');
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>${changefreq(slug)}</changefreq>\n    <priority>${priority(slug)}</priority>\n  </url>`;
}).join('\n\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n${urls}\n\n</urlset>\n`;

writeFileSync(join(LOCAL_DIR, 'sitemap.xml'), xml);
writeFileSync(join(ROOT, 'public', 'sitemap.xml'), xml);
console.log(`Sitemap régénéré : ${pages.length} URLs (${TODAY})`);

// --- Déploiement FTP ---

const client = new Client();
client.ftp.verbose = false;

let uploaded = 0;
client.trackProgress(info => {
  if (info.name) uploaded++;
});

try {
  await client.access({
    host: FTP_HOST,
    user: FTP_USER,
    password: FTP_PASSWORD,
    port: 21,
    secure: false,
  });

  console.log(`Connexion FTP OK — upload vers ${REMOTE_DIR}`);
  await client.ensureDir(REMOTE_DIR);
  await client.uploadFromDir(LOCAL_DIR);

  console.log(`\nDéploiement terminé (${uploaded} transferts).`);
} catch (err) {
  console.error('Erreur FTP :', err.message);
  process.exit(1);
} finally {
  client.close();
}
