import { useSession } from 'next-auth/react';
import RegistrarForm from '../components/RegistrarForm';

export default function RegistrarPage() {
  const { status } = useSession();

  if (status === 'loading') {
    return <div>Carregando...</div>;
  }

  if (status === 'unauthenticated') {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
    return null;
  }

  return <RegistrarForm />;
}