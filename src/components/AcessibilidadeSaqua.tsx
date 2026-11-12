import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { atualizarMenu, type OpcoesMenuAcessibilidade } from '@/lib/acessibilidade';

const OPCOES: OpcoesMenuAcessibilidade = {
  cor: '#015AA6',
  corEscura: '#014A8A',
  suave: '#E5F0FA',
};

/**
 * Menu de acessibilidade (Libras, ajustes de leitura e ouvir a página),
 * igual ao da Agenda Saquarema. Não aparece no /admin.
 */
export function AcessibilidadeSaqua() {
  const { pathname } = useLocation();

  useEffect(() => {
    atualizarMenu(document, pathname, OPCOES);
  }, [pathname]);

  return null;
}
