import { useSyncExternalStore } from 'react';
import { CONTRACT_LABEL, JOB_AREA_LABEL, WORK_MODEL_LABEL } from '@/lib/format';

/**
 * Buscas salvas e recentes: só neste navegador (localStorage), sem depender do back.
 * Guardamos a query string normalizada (a mesma da URL da lista de vagas), então reabrir a busca é só navegar para ela.
 * Tudo que vem do localStorage é re-normalizado na leitura: valor adulterado ou antigo é descartado.
 */
export interface StoredSearch {
  /** Query string normalizada, ex.: `area=VENDAS&q=padaria`. É também a identidade da busca. */
  qs: string;
  at: string;
}

const SAVED_KEY = 'es.saved-searches.v1';
const RECENT_KEY = 'es.recent-searches.v1';
const MAX_SAVED = 20;
const MAX_RECENT = 6;

const MODELS = Object.keys(WORK_MODEL_LABEL);
const CONTRACTS = Object.keys(CONTRACT_LABEL);
const AREAS = Object.keys(JOB_AREA_LABEL);

/** Mantém só os filtros conhecidos e válidos, em ordem fixa. Vazio = busca sem filtro (não vale guardar). */
export function normalizeSearch(input: URLSearchParams | string): string {
  const sp = typeof input === 'string' ? new URLSearchParams(input) : input;
  const out = new URLSearchParams();
  const q = (sp.get('q') ?? '').trim().slice(0, 100);
  const local = (sp.get('local') ?? '').trim().slice(0, 100);
  const modelo = sp.get('modelo') ?? '';
  const contrato = sp.get('contrato') ?? '';
  const area = sp.get('area') ?? '';
  if (area && AREAS.includes(area)) out.set('area', area);
  if (contrato && CONTRACTS.includes(contrato)) out.set('contrato', contrato);
  if (local) out.set('local', local);
  if (modelo && MODELS.includes(modelo)) out.set('modelo', modelo);
  if (sp.get('pcd') === '1') out.set('pcd', '1');
  if (q) out.set('q', q);
  return out.toString();
}

/** Texto curto para o chip: `padaria · Bacaxá · CLT`. */
export function describeSearch(qs: string): string {
  const sp = new URLSearchParams(qs);
  const parts = [
    sp.get('q') && `“${sp.get('q')}”`,
    sp.get('local'),
    WORK_MODEL_LABEL[sp.get('modelo') as keyof typeof WORK_MODEL_LABEL],
    CONTRACT_LABEL[sp.get('contrato') as keyof typeof CONTRACT_LABEL],
    sp.get('pcd') === '1' && 'PcD',
    JOB_AREA_LABEL[sp.get('area') as keyof typeof JOB_AREA_LABEL],
  ].filter((p): p is string => !!p);
  return parts.join(' · ') || 'Todas as vagas';
}

function createStore(key: string, max: number) {
  const listeners = new Set<() => void>();
  let cache: StoredSearch[] | null = null;

  const read = (): StoredSearch[] => {
    if (cache) return cache;
    const seen = new Set<string>();
    const list: StoredSearch[] = [];
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
      if (Array.isArray(raw)) {
        for (const item of raw) {
          if (!item || typeof item.qs !== 'string') continue;
          const qs = normalizeSearch(item.qs);
          if (!qs || seen.has(qs)) continue;
          seen.add(qs);
          list.push({ qs, at: typeof item.at === 'string' ? item.at : '' });
          if (list.length >= max) break;
        }
      }
    } catch {
      /* JSON quebrado ou storage indisponível: começa vazio */
    }
    cache = list;
    return list;
  };

  const write = (next: StoredSearch[]) => {
    cache = next;
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* armazenamento indisponível: fica só em memória nesta sessão */
    }
    listeners.forEach((l) => l());
  };

  return {
    read,
    /** Põe no topo; se já existia, só sobe. */
    add(qs: string) {
      const n = normalizeSearch(qs);
      if (!n) return;
      write([{ qs: n, at: new Date().toISOString() }, ...read().filter((s) => s.qs !== n)].slice(0, max));
    },
    remove(qs: string) {
      const n = normalizeSearch(qs);
      write(read().filter((s) => s.qs !== n));
    },
    clear() {
      write([]);
    },
    use(): StoredSearch[] {
      return useSyncExternalStore(
        (cb) => {
          listeners.add(cb);
          return () => listeners.delete(cb);
        },
        read,
        read,
      );
    },
    reset() {
      cache = null;
    },
  };
}

const saved = createStore(SAVED_KEY, MAX_SAVED);
const recent = createStore(RECENT_KEY, MAX_RECENT);

export const useSavedSearches = saved.use;
export const useRecentSearches = recent.use;
export const saveSearch = saved.add;
export const removeSavedSearch = saved.remove;
export const recordRecentSearch = recent.add;
export const clearRecentSearches = recent.clear;

/** Alterna: salva se ainda não está salva, remove se já está. Devolve o novo estado. */
export function toggleSavedSearch(qs: string): boolean {
  const n = normalizeSearch(qs);
  if (!n) return false;
  if (saved.read().some((s) => s.qs === n)) {
    saved.remove(n);
    return false;
  }
  saved.add(n);
  return true;
}

/** Só para testes. */
export function __resetSavedSearches() {
  saved.reset();
  recent.reset();
}
