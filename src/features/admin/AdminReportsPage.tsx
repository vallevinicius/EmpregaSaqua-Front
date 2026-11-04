import { useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/endpoints';
import type { AdminReport, ReportStatus } from '@/api/types';
import { Badge, Button, ConfirmDialog, EmptyState, Field, PageHeader, Pagination, Select, Skeleton, Textarea, buttonClass } from '@/components/ui';
import { ErrorState, SafeText, useToast } from '@/components/feedback';
import { JOB_STATUS_LABEL, formatDate } from '@/lib/format';
import { errorMessage } from '@/lib/http';
import { REPORT_REASON_LABEL, REPORT_STATUS_LABEL } from '@/lib/reports';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const STATUS_TONE: Record<ReportStatus, 'warning' | 'danger' | 'neutral'> = { OPEN: 'warning', RESOLVED: 'danger', DISMISSED: 'neutral' };

type Decision = { report: AdminReport; kind: 'remove' | 'dismiss' };

/** Fila de denúncias de vagas: o admin lê a justificativa, abre a vaga e decide se ela sai do ar. */
export default function AdminReportsPage() {
  useDocumentTitle('Denúncias');
  const qc = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ReportStatus | ''>('OPEN');
  const [decision, setDecision] = useState<Decision | null>(null);
  const [note, setNote] = useState('');

  const q = useQuery({
    queryKey: ['admin', 'reports', status, page],
    queryFn: ({ signal }) => adminApi.listReports({ status: status || undefined, page, limit: 10 }, signal),
    placeholderData: keepPreviousData,
    retry: false,
  });

  const resolve = useMutation({
    mutationFn: ({ report, kind }: Decision) =>
      adminApi.resolveReport(report.id, kind === 'remove' ? { status: 'RESOLVED', remove_job: true, admin_note: note.trim() || undefined } : { status: 'DISMISSED', admin_note: note.trim() || undefined }),
    onSuccess: (_d, v) => {
      toast(v.kind === 'remove' ? 'Vaga retirada do ar e denúncia encerrada.' : 'Denúncia descartada. A vaga continua no ar.', 'success');
      closeDialog();
      void qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'jobs'] });
      void qc.invalidateQueries({ queryKey: ['jobs'] });
      void qc.invalidateQueries({ queryKey: ['analytics', 'admin'] });
    },
    onError: (e) => toast(errorMessage(e), 'danger'),
  });

  const closeDialog = () => {
    setDecision(null);
    setNote('');
  };

  return (
    <div>
      <PageHeader title="Denúncias" description="Vagas denunciadas por usuários. Abra a vaga, leia a justificativa e decida." />
      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="rs" className="text-sm text-muted">Situação</label>
        <Select id="rs" className="max-w-[14rem]" value={status} onChange={(e) => { setStatus(e.target.value as ReportStatus | ''); setPage(1); }}>
          <option value="">Todas</option>
          {(Object.keys(REPORT_STATUS_LABEL) as ReportStatus[]).map((s) => <option key={s} value={s}>{REPORT_STATUS_LABEL[s]}</option>)}
        </Select>
      </div>

      {q.isPending ? (
        <div className="flex flex-col gap-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.data.length === 0 ? (
        <EmptyState title={status === 'OPEN' ? 'Nenhuma denúncia aguardando análise' : 'Nenhuma denúncia encontrada'} />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {q.data.data.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-surface p-5 shadow-card">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={STATUS_TONE[r.status]}>{REPORT_STATUS_LABEL[r.status]}</Badge>
                  <Badge tone="primary">{REPORT_REASON_LABEL[r.reason]}</Badge>
                  <span className="text-xs text-muted">{formatDate(r.created_at)}</span>
                </div>
                <p className="mt-3 font-bold">
                  {r.job ? (
                    <Link to={`/vagas/${encodeURIComponent(r.job.id)}`} className="hover:underline">
                      <SafeText>{r.job.title}</SafeText>
                    </Link>
                  ) : (
                    'Vaga removida'
                  )}
                </p>
                {r.job && (
                  <p className="text-sm text-muted">
                    <SafeText>{r.job.employer?.company_profile?.nome_fantasia ?? 'Empresa'}</SafeText>
                    {r.job.bairro && <> · <SafeText>{r.job.bairro}</SafeText></>} · Vaga: {JOB_STATUS_LABEL[r.job.status]}
                  </p>
                )}
                <blockquote className="mt-3 whitespace-pre-line rounded-xl bg-surface-2 px-4 py-3 text-sm">
                  <SafeText>{r.justification}</SafeText>
                </blockquote>
                <p className="mt-2 text-xs text-muted">
                  Denunciante: <SafeText>{r.reporter?.email ?? 'conta removida'}</SafeText>
                </p>
                {r.admin_note && (
                  <p className="mt-2 text-xs text-muted">
                    Nota do admin: <SafeText>{r.admin_note}</SafeText>
                  </p>
                )}
                {r.status === 'OPEN' && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {r.job && <Link to={`/vagas/${encodeURIComponent(r.job.id)}`} className={buttonClass('secondary', 'sm')}>Ver a vaga</Link>}
                    <Button size="sm" variant="danger" onClick={() => setDecision({ report: r, kind: 'remove' })}>Retirar a vaga</Button>
                    <Button size="sm" variant="secondary" onClick={() => setDecision({ report: r, kind: 'dismiss' })}>Manter a vaga (descartar)</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <Pagination page={page} totalPages={q.data.meta.total_pages} onChange={setPage} />
          </div>
        </>
      )}

      <ConfirmDialog
        open={decision !== null}
        title={decision?.kind === 'remove' ? 'Retirar esta vaga do ar?' : 'Descartar a denúncia?'}
        description={
          decision?.kind === 'remove'
            ? 'A vaga deixa de aparecer para os candidatos e as outras denúncias abertas dela são encerradas junto.'
            : 'A vaga continua no ar e esta denúncia fica registrada como sem fundamento.'
        }
        confirmLabel={decision?.kind === 'remove' ? 'Retirar vaga' : 'Descartar'}
        tone={decision?.kind === 'remove' ? 'danger' : 'primary'}
        loading={resolve.isPending}
        onConfirm={() => decision && resolve.mutate(decision)}
        onClose={closeDialog}
      >
        <Field label="Nota interna (opcional)" hint="Fica registrada para consulta; o denunciante não vê.">
          {({ id }) => <Textarea id={id} rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />}
        </Field>
      </ConfirmDialog>
    </div>
  );
}
