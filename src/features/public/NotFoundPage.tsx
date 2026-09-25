import { Link } from 'react-router';
import { buttonClass } from '@/components/ui';

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <p className="text-7xl font-extrabold tracking-tight text-primary">404</p>
      <h1 className="mt-4 text-2xl font-extrabold">Página não encontrada</h1>
      <p className="mt-2 text-muted">O endereço pode ter mudado ou a página não existe mais.</p>
      <Link to="/" className={buttonClass('primary', 'md', 'mt-8')}>Voltar para vagas</Link>
    </div>
  );
}
