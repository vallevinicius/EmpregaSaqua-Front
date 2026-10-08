import { useState } from 'react';
import { adminApi } from '@/api/endpoints';
import { Button } from '@/components/ui';
import { useToast } from '@/components/feedback';
import { FileTextIcon } from '@/components/icons';
import { errorMessage } from '@/lib/http';

/** Abre o documento de verificação (CNPJ/contrato social) numa aba nova — só existe via endpoint autenticado de ADMIN. */
export function VerificationDocumentButton({ companyId }: { companyId: string }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const open = async () => {
    setLoading(true);
    try {
      const blob = await adminApi.verificationDocument(companyId);
      if (blob.type && blob.type !== 'application/pdf') throw new Error('Resposta inesperada do servidor.');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      toast(errorMessage(e), 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="button" size="sm" variant="secondary" onClick={() => void open()} loading={loading}>
      <FileTextIcon size={14} /> Ver documento
    </Button>
  );
}
