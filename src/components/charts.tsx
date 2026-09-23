import { useState } from 'react';

/** Stat tile: número-herói. Sem plot => sem tooltip. */
export function StatTile({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/**
 * Barras horizontais de série única (magnitude por categoria).
 * - Uma cor (primária); categorias identificadas pelo rótulo, não pela cor.
 * - Tooltip por barra no hover/foco; hit target = linha inteira.
 * - Tabela equivalente para leitores de tela.
 */
export function BarList({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <figure className="rounded-xl border border-border bg-surface p-5">
      <figcaption className="mb-4 text-sm font-semibold">{title}</figcaption>
      <ul className="flex flex-col gap-1" aria-hidden>
        {rows.map((r, i) => {
          const pct = total ? Math.round((r.value / total) * 100) : 0;
          return (
            <li
              key={r.label}
              tabIndex={0}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="relative grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-3 rounded-md px-1 py-1.5 hover:bg-surface-2 focus:bg-surface-2 focus:outline-none"
            >
              <span className="truncate text-sm text-muted">{r.label}</span>
              <span className="h-3 rounded-r-[4px] bg-surface-2">
                <span className="block h-full rounded-r-[4px] bg-primary transition-[width]" style={{ width: `${(r.value / max) * 100}%` }} />
              </span>
              <span className="text-right text-sm font-medium tabular-nums">{r.value}</span>
              {hover === i && (
                <span role="tooltip" className="pointer-events-none absolute -top-8 left-36 z-10 rounded-md border border-border bg-surface px-2 py-1 text-xs shadow">
                  {r.label}: <strong>{r.value}</strong> ({pct}%)
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead><tr><th>Categoria</th><th>Quantidade</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.label}><td>{r.label}</td><td>{r.value}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
