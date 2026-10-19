import { beforeEach, describe, expect, it } from 'vitest';
import { __resetSavedJobs, removeSavedJob, toggleSavedJob } from './savedJobs';

const KEY = 'es.saved-jobs.v1';
const job = (id: string) => ({ id, title: `Vaga ${id}`, company: 'Loja', address: 'Centro' });
const stored = () => JSON.parse(localStorage.getItem(KEY) ?? '[]') as { id: string }[];

describe('vagas salvas', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetSavedJobs();
  });
  it('salva e remove ao alternar', () => {
    toggleSavedJob(job('a'));
    expect(stored().map((j) => j.id)).toEqual(['a']);
    toggleSavedJob(job('a'));
    expect(stored()).toEqual([]);
  });
  it('a mais recente vem primeiro', () => {
    toggleSavedJob(job('a'));
    toggleSavedJob(job('b'));
    expect(stored().map((j) => j.id)).toEqual(['b', 'a']);
  });
  it('remove por id', () => {
    toggleSavedJob(job('a'));
    toggleSavedJob(job('b'));
    removeSavedJob('a');
    expect(stored().map((j) => j.id)).toEqual(['b']);
  });
  it('ignora lixo no armazenamento', () => {
    localStorage.setItem(KEY, '{"x":1}');
    __resetSavedJobs();
    toggleSavedJob(job('a'));
    expect(stored().map((j) => j.id)).toEqual(['a']);
  });
});
