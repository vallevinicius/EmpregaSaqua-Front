import { describe, expect, it } from 'vitest';
import type { Job } from '@/api/types';
import { buildJobPostingJsonLd, toJsonLdScript } from './jobPosting';

const NOW = new Date('2026-11-04T12:00:00Z');
const job = (over: Partial<Job> = {}): Job =>
  ({
    id: 'abc-123',
    employer_id: 'e1',
    title: 'Garçom &amp; Atendente',
    description: 'Atender clientes',
    address: 'Rua A, 10',
    bairro: 'Itaúna',
    work_schedule: '8h',
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
    created_at: '2026-11-01T10:00:00Z',
    updated_at: '2026-11-01T10:00:00Z',
    employer: { id: 'e1', company_profile: { nome_fantasia: 'Bar &amp; Cia', logo_url: null } },
    ...over,
  }) as Job;

describe('buildJobPostingJsonLd', () => {
  it('gera JobPosting com texto decodificado e URL da vaga', () => {
    const d = buildJobPostingJsonLd(job(), 'https://site.com', NOW)!;
    expect(d['@type']).toBe('JobPosting');
    expect(d.title).toBe('Garçom & Atendente');
    expect((d.hiringOrganization as { name: string }).name).toBe('Bar & Cia');
    expect(d.url).toBe('https://site.com/vagas/abc-123');
    expect(d.employmentType).toBe('PART_TIME');
  });
  it('não gera para vaga encerrada, removida ou expirada', () => {
    expect(buildJobPostingJsonLd(job({ status: 'FILLED' }), 'https://s', NOW)).toBeNull();
    expect(buildJobPostingJsonLd(job({ deleted_at: '2026-11-02T00:00:00Z' }), 'https://s', NOW)).toBeNull();
    expect(buildJobPostingJsonLd(job({ expires_at: '2026-11-03T00:00:00Z' }), 'https://s', NOW)).toBeNull();
  });
  it('vaga remota marca TELECOMMUTE e expiração futura vira validThrough', () => {
    const d = buildJobPostingJsonLd(job({ work_model: 'REMOTE', expires_at: '2026-12-01T00:00:00Z' }), 'https://s', NOW)!;
    expect(d.jobLocationType).toBe('TELECOMMUTE');
    expect(d.validThrough).toBe('2026-12-01T00:00:00Z');
  });
  it('logo só entra se for URL http(s) segura', () => {
    const bad = buildJobPostingJsonLd(job({ employer: { id: 'e', company_profile: { nome_fantasia: 'X', logo_url: 'javascript:alert(1)' } } }), 'https://s', NOW)!;
    expect(JSON.stringify(bad)).not.toContain('javascript:');
  });
});

describe('toJsonLdScript', () => {
  it('escapa "<" para o conteúdo nunca fechar a tag script', () => {
    const out = toJsonLdScript({ t: '</script><img src=x onerror=alert(1)>' });
    expect(out).not.toContain('<');
    expect(JSON.parse(out).t).toContain('</script>');
  });
});
