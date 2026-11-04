import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/api/endpoints';
import { Button, EmptyState, Field, Input, PageHeader, Skeleton } from '@/components/ui';
import { ErrorState, useToast } from '@/components/feedback';
import { BarList, StatTile } from '@/components/charts';
import { APPLICATION_STATUS_LABEL, CONTRACT_LABEL, JOB_AREA_LABEL } from '@/lib/format';
import { defaultRange, formatMonthKey, labelRows, validateRange } from '@/lib/indicators';
import { errorMessage } from '@/lib/http';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const TOP_BAIRROS = 12;

/** Indicadores para a Prefeitura: números agregados do período, sem dado pessoal, com exportação em CSV. */
export default function AdminIndicatorsPage() {
  useDocumentTitle('Indicadores');
  const toast = useToast();
  const initial = defaultRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [applied, setApplied] = useState(initial);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const q = useQuery({
    queryKey: ['analytics', 'indicators', applied.from, applied.to],
    queryFn: ({ signal }) => analyticsApi.indicators(applied, signal),
    retry: false,
  });

  const apply = (e: FormEvent) => {
    e.preventDefault();
    const err = validateRange(from, to);
    setRangeError(err);
    if (!err) setApplied({ from, to });
  };

  const downloadCsv = async () => {
    setDownloading(true);
    try {
      const blob = await analyticsApi.indicatorsCsv(applied);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `indicadores-${applied.from}_a_${applied.to}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      toast(errorMessage(e), 'danger');
    } finally {
      setDownloading(false);
    }
  };

  const d = q.data;
  const bairros = d ? labelRows(d.jobs_by_bairro, {}) : [];
  const candBairros = d ? labelRows(d.candidates_by_bairro, {}) : [];

  return (
    <div>
      <PageHeader
        title="Indicadores"
        description="Números do portal no período escolhido. Só dados agregados: nenhuma informação pessoal."
        actions={
          <Button variant="secondary" onClick={() => void downloadCsv()} loading={downloading} disabled={!d}>
            Baixar CSV
          </Button>
        }
      />

      <form onSubmit={apply} noValidate className="mb-8 flex flex-wrap items-end gap-3">
        <Field label="De" error={rangeError ?? undefined}>
          {({ id, invalid }) => <Input id={id} type="date" value={from} invalid={invalid} onChange={(e) => setFrom(e.target.value)} className="w-44" />}
        </Field>
        <Field label="Até">
          {({ id }) => <Input id={id} type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />}
        </Field>
        <Button type="submit" loading={q.isFetching && !q.isPending}>Atualizar</Button>
      </form>

      {q.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <div className="flex flex-col gap-10">
          <section aria-labelledby="ind-hoje">
            <h2 id="ind-hoje" className="mb-3 text-lg font-bold">Situação hoje</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile label="Vagas ativas" value={d!.totals.active_jobs} />
              <StatTile label="Empresas aprovadas" value={d!.totals.approved_companies} />
              <StatTile label="Candidatos cadastrados" value={d!.totals.candidates} />
              <StatTile label="Candidaturas (total)" value={d!.totals.applications} />
            </div>
          </section>

          <section aria-labelledby="ind-periodo">
            <h2 id="ind-periodo" className="mb-3 text-lg font-bold">No período</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatTile label="Vagas criadas" value={d!.in_period.new_jobs} />
              <StatTile label="Candidaturas" value={d!.in_period.new_applications} />
              <StatTile label="Contratações" value={d!.in_period.hires} />
              <StatTile label="Novos candidatos" value={d!.in_period.new_candidates} />
              <StatTile label="Novas empresas" value={d!.in_period.new_companies} />
            </div>
          </section>

          <section aria-labelledby="ind-cat" className="grid gap-4 lg:grid-cols-2">
            <h2 id="ind-cat" className="sr-only">Vagas e candidaturas por categoria</h2>
            {d!.jobs_by_bairro.length === 0 ? (
              <div className="lg:col-span-2"><EmptyState title="Sem vagas criadas neste período" description="Escolha um período maior para ver os detalhes." /></div>
            ) : (
              <>
                <BarList title={`Vagas por bairro${bairros.length > TOP_BAIRROS ? ` (top ${TOP_BAIRROS}; o CSV traz todos)` : ''}`} rows={bairros.slice(0, TOP_BAIRROS)} />
                {candBairros.length > 0 && (
                  <BarList title={`Candidatos por bairro (hoje${candBairros.length > TOP_BAIRROS ? `; top ${TOP_BAIRROS}` : ''})`} rows={candBairros.slice(0, TOP_BAIRROS)} />
                )}
                <BarList title="Vagas por área" rows={labelRows(d!.jobs_by_area, JOB_AREA_LABEL)} />
                <BarList title="Vagas por tipo de contrato" rows={labelRows(d!.jobs_by_contract_type, CONTRACT_LABEL)} />
                <BarList title="Candidaturas por situação" rows={labelRows(d!.applications_by_status, APPLICATION_STATUS_LABEL)} />
              </>
            )}
          </section>

          <section aria-labelledby="ind-mes">
            <h2 id="ind-mes" className="mb-3 text-lg font-bold">Evolução mês a mês</h2>
            <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-card">
              <table className="w-full min-w-[32rem] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th scope="col" className="px-4 py-3 font-semibold">Mês</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Vagas</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Candidaturas</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Contratações</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Novos candidatos</th>
                  </tr>
                </thead>
                <tbody>
                  {d!.monthly.map((m) => (
                    <tr key={m.month} className="border-b border-border last:border-0">
                      <th scope="row" className="px-4 py-2.5 text-left font-medium">{formatMonthKey(m.month)}</th>
                      <td className="px-4 py-2.5 text-right tabular-nums">{m.jobs}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{m.applications}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{m.hires}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{m.candidates}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
