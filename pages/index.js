import { signIn, signOut, useSession } from 'next-auth/react';
import LoginButton from '../components/LoginButton';

export default function Home() {
  const { data: session } = useSession();

  return (
    <div>
      {!session ? (
        <LoginButton onClick={() => signIn('google')} />
      ) : (
        <div>
          <p>Bem-vindo, {session.user.name}!</p>
          <button onClick={() => signOut()}>Deslogar</button>
          <a href="/form">Ir para Formulário</a>
        </div>
      )}
    </div>
  );
}
