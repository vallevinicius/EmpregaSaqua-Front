// Uso: SITE_URL=https://empregasaqua.com API_URL=https://api.empregasaqua.com node scripts/generate-sitemap.mjs
// Gera dist/sitemap.xml (ou public/ com OUT=public). Rode após o build e agende (cron/CI) para manter as vagas atuais.
import { writeFileSync } from 'node:fs';

const site = process.env.SITE_URL;
const api = (process.env.API_URL ?? '').replace(/\/+$/, '');
if (!site || !api) {
  console.error('Defina SITE_URL e API_URL');
  process.exit(1);
}
const out = `${process.env.OUT ?? 'dist'}/sitemap.xml`;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const entries = [{ path: '/' }, { path: '/eventos' }, { path: '/ajuda' }];

try {
  const res = await fetch(`${api}/jobs?limit=100`);
  if (res.ok) {
    const body = await res.json();
    const jobs = Array.isArray(body) ? body : (body.data ?? body.items ?? []);
    for (const j of jobs) if (j?.id) entries.push({ path: `/vagas/${encodeURIComponent(j.id)}`, lastmod: j.updated_at });
  } else console.warn(`API respondeu ${res.status}; sitemap só com páginas fixas`);
} catch (e) {
  console.warn('API indisponível; sitemap só com páginas fixas:', e.message);
}

const base = site.replace(/\/+$/, '');
const urls = entries
  .map((e) => `  <url><loc>${esc(base + e.path)}</loc>${e.lastmod ? `<lastmod>${esc(String(e.lastmod).slice(0, 10))}</lastmod>` : ''}</url>`)
  .join('\n');
writeFileSync(out, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
console.log(`${entries.length} URLs em ${out}`);
