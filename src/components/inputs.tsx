import { useState, type KeyboardEvent } from 'react';
import { Button, Input, cx } from './ui';
import { cepApi } from '@/api/endpoints';
import type { CepResponse } from '@/api/types';
import { formatCep } from '@/lib/format';
import { ApiError } from '@/lib/http';

/** Lista de strings (requisitos, benefícios, skills). Limites espelham os DTOs do back. */
export function StringListInput({
  id,
  value,
  onChange,
  placeholder,
  maxItems = 20,
  maxLength = 150,
  invalid,
  describedBy,
}: {
  id?: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  maxItems?: number;
  maxLength?: number;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim().slice(0, maxLength);
    if (!v || value.length >= maxItems) return;
    if (value.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...value, v]);
    setDraft('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          maxLength={maxLength}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          placeholder={placeholder}
          invalid={invalid}
          aria-describedby={describedBy}
          disabled={value.length >= maxItems}
        />
        <Button variant="secondary" onClick={add} disabled={!draft.trim() || value.length >= maxItems}>
          Adicionar
        </Button>
      </div>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((item, i) => (
            <li key={`${item}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-primary-soft py-1 pl-3 pr-1 text-xs text-primary">
              <span className="max-w-[16rem] truncate">{item}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="rounded-full px-1.5 hover:bg-primary/15"
                aria-label={`Remover ${item}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">
        {value.length}/{maxItems} itens · Enter para adicionar
      </p>
    </div>
  );
}

/** Busca de CEP via back (que faz o fetch externo com fallback + cache — o browser nunca chama ViaCEP direto). */
export function CepLookup({ onFound, className }: { onFound: (r: CepResponse) => void; className?: string }) {
  const [cep, setCep] = useState('');
  const [state, setState] = useState<{ loading: boolean; error?: string }>({ loading: false });
  const digits = cep.replace(/\D/g, '');

  const search = async () => {
    if (digits.length !== 8) {
      setState({ loading: false, error: 'Informe os 8 dígitos do CEP.' });
      return;
    }
    setState({ loading: true });
    try {
      const r = await cepApi.lookup(digits);
      onFound(r);
      setState({ loading: false });
    } catch (e) {
      setState({ loading: false, error: e instanceof ApiError && e.status === 404 ? 'CEP não encontrado.' : 'Não foi possível consultar o CEP.' });
    }
  };

  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <div className="flex gap-2">
        <Input
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="CEP (00000-000)"
          aria-label="CEP"
          value={formatCep(cep)}
          onChange={(e) => setCep(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void search();
            }
          }}
          className="max-w-[11rem]"
        />
        <Button variant="secondary" onClick={() => void search()} loading={state.loading}>
          Buscar CEP
        </Button>
      </div>
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
    </div>
  );
}

export function cepToAddress(r: CepResponse): string {
  return [r.street, r.neighborhood, `${r.city} - ${r.state}`].filter((p) => p && p.trim()).join(', ');
}
