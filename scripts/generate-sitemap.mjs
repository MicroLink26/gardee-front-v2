import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, '../src/pages');
const distDir = path.join(__dirname, '../dist');

// Base URL for the site
const BASE_URL = 'https://gardee.fr';

// Pages that should always be included with specific priorities
const staticPages = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/recherche', priority: 0.9, changefreq: 'daily' },
  { path: '/classement', priority: 0.9, changefreq: 'weekly' },
  { path: '/carte', priority: 0.9, changefreq: 'daily' },
  { path: '/postuler', priority: 0.8, changefreq: 'weekly' },
  { path: '/contact', priority: 0.7, changefreq: 'monthly' },
];

// Dynamic routes (generated from prestataires)
// In production, these would come from the database
const dynamicRoutes = [
  // These will be fetched from API in a full implementation
];

function getPagePriority(filePath) {
  if (filePath.includes('/app/')) return 0.5; // App pages are private, lower priority
  if (filePath.includes('[') || filePath.includes('...')) return 0.6; // Dynamic routes
  return 0.7; // Regular pages
}

function getChangefreq(filePath) {
  if (filePath.includes('/app/')) return 'never'; // App pages don't change
  if (filePath.includes('profil') || filePath.includes('prestataires')) return 'weekly';
  if (filePath.includes('classement') || filePath.includes('recherche')) return 'daily';
  return 'monthly';
}

function scanPages(dir, prefix = '') {
  const pages = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    const relPath = path.join(prefix, file);

    if (stat.isDirectory()) {
      pages.push(...scanPages(filePath, relPath));
    } else if (file.endsWith('.astro')) {
      // Convert file path to URL route
      let route = relPath.replace(/\.astro$/, '').replace(/\\/g, '/');

      // Handle index files
      if (route.endsWith('/index')) {
        route = route.slice(0, -6);
      }

      // Skip dynamic routes with [...spreads] and non-matching patterns
      if (!route.includes('[') || route.includes('[id]')) {
        // Skip app routes and private pages
        if (!route.startsWith('app/')) {
          pages.push({
            path: route === '' ? '/' : `/${route}`,
            priority: getPagePriority(route),
            changefreq: getChangefreq(route),
          });
        }
      }
    }
  }

  return pages;
}

function generateSitemap(pages) {
  const allPages = [...staticPages];

  // Add scanned pages (avoid duplicates)
  const scannedPages = scanPages(pagesDir);
  const paths = new Set(allPages.map((p) => p.path));

  for (const page of scannedPages) {
    if (!paths.has(page.path)) {
      allPages.push(page);
    }
  }

  // Sort by path
  allPages.sort((a, b) => a.path.localeCompare(b.path));

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const page of allPages) {
    const lastmod = new Date().toISOString().split('T')[0];
    xml += '  <url>\n';
    xml += `    <loc>${BASE_URL}${page.path}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += '  </url>\n';
  }

  xml += '</urlset>\n';

  return xml;
}

async function main() {
  try {
    const pages = scanPages(pagesDir);
    const sitemap = generateSitemap(pages);

    // Write to dist (for built version)
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap);

    // Also write to public for Astro to copy
    fs.writeFileSync(path.join(__dirname, '../public/sitemap.xml'), sitemap);

    console.log(`✓ Sitemap generated with ${scanPages(pagesDir).length} pages`);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    process.exit(1);
  }
}

main();
