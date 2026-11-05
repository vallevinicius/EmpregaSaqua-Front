// Falha se algum dado institucional obrigatório ainda estiver vazio. Rode antes de publicar: npm run check:launch
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/lib/siteInfo.ts', import.meta.url), 'utf8');
const required = ['controlador', 'cnpj', 'emailDpo', 'emailContato'];
const missing = required.filter((k) => new RegExp(`${k}:\\s*(''|"")`).test(src));
if (missing.length) {
  console.error(`✗ Preencha em src/lib/siteInfo.ts: ${missing.join(', ')}`);
  process.exit(1);
}
console.log('✓ Dados institucionais preenchidos');
