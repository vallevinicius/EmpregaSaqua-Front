import { describe, expect, it } from 'vitest';
import type { Job } from '@/api/types';
import { isAreaBlocked, normalizeText, recommendJobs, scoreJob, similarJobs, tokens } from './recommend';

function job(over: Partial<Job> & { id: string }): Job {
  return {
    title: 'Auxiliar administrativo',
    description: '',
    area: null,
    contract_type: 'CLT',
    work_model: 'PRESENCIAL',
    is_pcd: false,
    address: 'Centro, Saquarema',
    mandatory_qualifications: [],
    differential_qualifications: [],
    created_at: '2026-01-01T00:00:00.000Z',
    ...over,
  } as unknown as Job;
}

describe('normalizeText / tokens', () => {
  it('tira acento, caixa e pontuação', () => {
    expect(normalizeText('  Atendente de Padaria — Bacaxá! ')).toBe('atendente de padaria bacaxa');
  });
  it('ignora palavras curtas e conectivos e não repete', () => {
    expect(tokens('Auxiliar de cozinha e auxiliar')).toEqual(['auxiliar', 'cozinha']);
  });
  it('aceita null/undefined', () => {
    expect(tokens(null)).toEqual([]);
    expect(normalizeText(undefined)).toBe('');
  });
});

describe('isAreaBlocked', () => {
  it('só bloqueia quando os dois têm área e ela difere', () => {
    expect(isAreaBlocked({ area: 'VENDAS' as never }, { area: 'SAUDE' } as never)).toBe(true);
    expect(isAreaBlocked({ area: 'VENDAS' as never }, { area: 'VENDAS' } as never)).toBe(false);
    expect(isAreaBlocked({ area: null as never }, { area: 'SAUDE' } as never)).toBe(false);
    expect(isAreaBlocked({ area: 'VENDAS' as never }, { area: null } as never)).toBe(false);
    expect(isAreaBlocked({ area: 'VENDAS' as never }, null)).toBe(false);
  });
});

describe('scoreJob', () => {
  it('sem perfil não recomenda', () => {
    expect(scoreJob(job({ id: '1' }), null)).toBeNull();
  });
  it('vaga de outra área é descartada mesmo com cargo igual', () => {
    const r = scoreJob(job({ id: '1', area: 'VENDAS' as never }), { area: 'SAUDE', cargo_interesse: 'Auxiliar administrativo' } as never);
    expect(r).toBeNull();
  });
  it('soma área, cargo de interesse e habilidades e explica os motivos', () => {
    const r = scoreJob(
      job({ id: '1', area: 'ADMINISTRATIVO' as never, description: 'Rotina com Excel e atendimento', mandatory_qualifications: ['Pacote Office'] }),
      { area: 'ADMINISTRATIVO', cargo_interesse: 'administrativo', skills: ['Excel', 'Atendimento'] } as never,
    );
    expect(r?.score).toBe(3 + 4 + 2);
    expect(r?.reasons).toEqual(['Combina com a sua área', 'Parecida com o cargo que você procura', 'Pede Excel, Atendimento']);
  });
  it('habilidade curta demais (<3 letras) não conta', () => {
    expect(scoreJob(job({ id: '1', description: 'usa C e R' }), { skills: ['C', 'R'] } as never)).toBeNull();
  });
  it('limita o peso das habilidades a 5', () => {
    const skills = ['alfa', 'beta', 'gama', 'delta', 'epsilon', 'zeta', 'eta'];
    const r = scoreJob(job({ id: '1', description: skills.join(' ') }), { skills } as never);
    expect(r?.score).toBe(5);
  });
  it('PcD e proximidade entram como bônus', () => {
    const r = scoreJob(job({ id: '1', is_pcd: true, address: 'Bacaxá, Saquarema' }), { is_pcd: true, address: 'Bacaxá' } as never);
    expect(r?.reasons).toEqual(['Vaga PcD', 'Perto de você']);
  });
});

describe('recommendJobs', () => {
  const profile = { area: 'ADMINISTRATIVO', cargo_interesse: 'recepcionista', skills: [] } as never;
  const a = job({ id: 'a', title: 'Recepcionista', area: 'ADMINISTRATIVO' as never, created_at: '2026-01-01T00:00:00Z' });
  const b = job({ id: 'b', title: 'Recepcionista noturno', area: 'ADMINISTRATIVO' as never, created_at: '2026-02-01T00:00:00Z' });
  const c = job({ id: 'c', title: 'Cozinheiro', area: 'VENDAS' as never });
  const d = job({ id: 'd', title: 'Qualquer coisa' });

  it('ordena por pontuação e, no empate, pela mais nova; descarta outra área e sem relação', () => {
    expect(recommendJobs([a, b, c, d], profile).map((r) => r.job.id)).toEqual(['b', 'a']);
  });
  it('respeita limit e excludeIds', () => {
    expect(recommendJobs([a, b], profile, { limit: 1 }).map((r) => r.job.id)).toEqual(['b']);
    expect(recommendJobs([a, b], profile, { excludeIds: new Set(['b']) }).map((r) => r.job.id)).toEqual(['a']);
    expect(recommendJobs([a, b], profile, { limit: 0 })).toEqual([]);
  });
  it('lista vazia e perfil nulo devolvem vazio', () => {
    expect(recommendJobs([], profile)).toEqual([]);
    expect(recommendJobs([a], null)).toEqual([]);
  });
});

describe('similarJobs', () => {
  const current = job({ id: 'x', title: 'Auxiliar de cozinha', area: 'ALIMENTACAO' as never });
  const same = job({ id: 'y', title: 'Auxiliar de cozinha noturno', area: 'ALIMENTACAO' as never });
  const area = job({ id: 'z', title: 'Garçom', area: 'ALIMENTACAO' as never });
  const other = job({ id: 'w', title: 'Motorista', area: 'TRANSPORTE' as never });

  it('nunca devolve a própria vaga', () => {
    expect(similarJobs(current, [current, same]).map((j) => j.id)).toEqual(['y']);
  });
  it('prioriza título parecido na mesma área e descarta o que só tem contrato igual', () => {
    expect(similarJobs(current, [other, area, same]).map((j) => j.id)).toEqual(['y', 'z']);
  });
  it('respeita o limite', () => {
    expect(similarJobs(current, [same, area], 1).map((j) => j.id)).toEqual(['y']);
  });
});
