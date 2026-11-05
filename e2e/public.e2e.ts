import { expect, test, type Page } from '@playwright/test';

const job = {
  id: '11111111-1111-1111-1111-111111111111',
  employer_id: 'e1',
  title: 'Atendente de loja',
  description: 'Atender clientes e organizar a loja.',
  address: 'Rua das Flores, 10',
  bairro: 'Itaúna',
  work_schedule: '8h às 17h',
  salary_range: null,
  mandatory_qualifications: [],
  differential_qualifications: [],
  benefits: [],
  work_model: 'ON_SITE',
  contract_type: 'PARCIAL',
  is_salary_visible: false,
  is_pcd: false,
  expires_at: null,
  contact_whatsapp: null,
  contact_email: null,
  status: 'ACTIVE',
  created_at: '2026-11-01T10:00:00.000Z',
  updated_at: '2026-11-01T10:00:00.000Z',
  employer: { id: 'e1', company_profile: { nome_fantasia: 'Loja Modelo', logo_url: null } },
};

const json = (body: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });

/** Tudo que não for mockado devolve 401 (visitante sem sessão); rotas específicas registradas depois têm prioridade. */
async function mockApi(page: Page, overrides: (p: Page) => Promise<void> = async () => {}) {
  await page.route('**/api/**', (r) => r.fulfill(json({ message: 'Unauthorized' }, 401)));
  await overrides(page);
}

test('home lista as vagas vindas da API', async ({ page }) => {
  await mockApi(page, async (p) => {
    await p.route('**/api/jobs?*', (r) => r.fulfill(json({ data: [job], meta: { total_items: 1, total_pages: 1, current_page: 1, per_page: 12 } })));
  });
  await page.goto('/');
  await expect(page.getByText('Atendente de loja').first()).toBeVisible();
});

test('API fora do ar mostra mensagem de erro, nunca tela em branco', async ({ page }) => {
  await mockApi(page, async (p) => {
    await p.route('**/api/jobs?*', (r) => r.fulfill(json({ message: 'falha' }, 500)));
  });
  await page.goto('/');
  await expect(page.locator('#conteudo')).toBeVisible();
  await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 15_000 });
});

test('rota inexistente mostra a página 404', async ({ page }) => {
  await mockApi(page);
  await page.goto('/isso-nao-existe');
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
});

test('página da vaga publica dados estruturados JobPosting válidos', async ({ page }) => {
  await mockApi(page, async (p) => {
    await p.route(`**/api/jobs/${job.id}`, (r) => r.fulfill(json(job)));
  });
  await page.goto(`/vagas/${job.id}`);
  await expect(page.getByRole('heading', { name: /Atendente de loja/ }).first()).toBeVisible();
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
  const data = JSON.parse(ld ?? '{}');
  expect(data['@type']).toBe('JobPosting');
  expect(data.title).toBe('Atendente de loja');
});

test('vaga inexistente (404) não vaza detalhes e não quebra a página', async ({ page }) => {
  await mockApi(page, async (p) => {
    await p.route('**/api/jobs/*', (r) => r.fulfill(json({ message: 'Not Found' }, 404)));
  });
  await page.goto('/vagas/99999999-9999-9999-9999-999999999999');
  await expect(page.locator('#conteudo')).toBeVisible();
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
});

test('área restrita redireciona visitante para o login', async ({ page }) => {
  await mockApi(page);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/entrar/);
});

test('páginas legais abrem e linkadas no rodapé', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'Privacidade' }).click();
  await expect(page.getByRole('heading', { name: 'Política de privacidade' })).toBeVisible();
  await page.getByRole('link', { name: 'Termos de uso' }).click();
  await expect(page.getByRole('heading', { name: 'Termos de uso' })).toBeVisible();
});

test('CSP de produção não gera violações na home', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', (m) => {
    if (m.text().includes('Content Security Policy')) violations.push(m.text());
  });
  await mockApi(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(violations).toEqual([]);
});

// Acessibilidade automática (WCAG A/AA). Pega só o que máquina detecta; não substitui teste com leitor de tela.
import AxeBuilder from '@axe-core/playwright';

for (const [nome, path] of [['home', '/'], ['ajuda', '/ajuda'], ['termos', '/termos'], ['privacidade', '/privacidade'], ['entrar', '/entrar'], ['404', '/nada']] as const) {
  test(`acessibilidade: ${nome} sem violações graves`, async ({ page }) => {
    await mockApi(page, async (p) => {
      await p.route('**/api/jobs?*', (r) => r.fulfill(json({ data: [job], meta: { total_items: 1, total_pages: 1, current_page: 1, per_page: 12 } })));
    });
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600); // espera as animações de entrada: contraste no meio do fade é falso positivo
    const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const grave = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(grave.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
  });
}
