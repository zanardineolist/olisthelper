import { getSession, signOut } from 'next-auth/react';

export default function MyPage({ user }) {
  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: '#121212', // Dark mode background
        minHeight: '100vh',
        color: '#fff',
      }}
    >
      <h1>Bem-vindo, {user.name}!</h1>
      <button
        onClick={() => signOut()}
        style={{
          backgroundColor: '#E64E36',
          color: '#fff',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          transition: 'background-color 0.3s ease',
        }}
        onMouseOver={(e) => (e.target.style.backgroundColor = '#F0A028')}
        onMouseOut={(e) => (e.target.style.backgroundColor = '#E64E36')}
      >
        Sair
      </button>
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
