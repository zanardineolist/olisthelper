import { getSession, signOut } from 'next-auth/react';

export default function MyPage({ user }) {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Bem-vindo, {user.name}!</h1>
      <button onClick={() => signOut()}>Sair</button>
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }
  return {
    props: {
      user: session.user,
    },
  };
}
