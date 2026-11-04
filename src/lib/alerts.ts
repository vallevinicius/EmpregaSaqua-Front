import type { JobAlert } from '@/api/types';
import { CONTRACT_LABEL, WORK_MODEL_LABEL } from './format';

/** Teto do back (MAX_ALERTS_PER_CANDIDATE): usado só para avisar antes de bater no 409. */
export const MAX_ALERTS = 10;

type Criteria = Pick<JobAlert, 'keyword' | 'address' | 'work_model' | 'contract_type' | 'is_pcd'>;

/** Alerta sem nenhum critério nunca casa com vaga (o back recusa): o front nem oferece criar. */
export function hasAlertCriteria(c: Partial<{ keyword: string | null; address: string | null; work_model: string | null; contract_type: string | null; is_pcd: boolean | null }>): boolean {
  return Boolean(c.keyword?.trim() || c.address?.trim() || c.work_model || c.contract_type || c.is_pcd);
}

/** Frases curtas ("Bairro: Bacaxá", "Presencial"…) para listar o que o alerta observa. */
export function alertCriteria(a: Criteria): string[] {
  const out: string[] = [];
  if (a.keyword) out.push(`Palavra-chave: ${a.keyword}`);
  if (a.address) out.push(`Bairro: ${a.address}`);
  if (a.work_model) out.push(WORK_MODEL_LABEL[a.work_model] ?? a.work_model);
  if (a.contract_type) out.push(CONTRACT_LABEL[a.contract_type] ?? a.contract_type);
  if (a.is_pcd) out.push('Vaga para PcD');
  return out;
}
