import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="mt-2 text-2xl font-semibold">Página não encontrada</h1>
      <Link to="/" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">Voltar para vagas</Link>
    </div>
  );
}
