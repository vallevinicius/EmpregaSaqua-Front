import { useSyncExternalStore } from 'react';

/**
 * Vagas salvas: só neste navegador (localStorage), sem depender do back.
 * Guardamos um resumo da vaga, então a lista abre mesmo se a vaga sair do ar (aí aparece como indisponível ao abrir).
 */
export interface SavedJob {
  id: string;
  title: string;
  company: string;
  address: string;
  saved_at: string;
}

const KEY = 'es.saved-jobs.v1';
const MAX = 100;
const listeners = new Set<() => void>();
let cache: SavedJob[] | null = null;

function read(): SavedJob[] {
  if (cache) return cache;
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    cache = Array.isArray(raw)
      ? raw.filter((j): j is SavedJob => !!j && typeof j.id === 'string' && typeof j.title === 'string').slice(0, MAX)
      : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: SavedJob[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* armazenamento indisponível: fica só em memória nesta sessão */
  }
  listeners.forEach((l) => l());
}

export function toggleSavedJob(job: Omit<SavedJob, 'saved_at'>) {
  const list = read();
  write(list.some((j) => j.id === job.id) ? list.filter((j) => j.id !== job.id) : [{ ...job, saved_at: new Date().toISOString() }, ...list].slice(0, MAX));
}

export function removeSavedJob(id: string) {
  write(read().filter((j) => j.id !== id));
}

export function useSavedJobs(): SavedJob[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    read,
  );
}

/** Só para testes. */
export function __resetSavedJobs() {
  cache = null;
}
