import { getSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState } from 'react';

export default function MyPage({ user }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNavigation = (path) => {
    router.push(path);
  };

  return (
    <div
      style={{
        backgroundColor: '#121212', // Dark mode background
        minHeight: '100vh',
        color: '#fff',
      }}
    >
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#1E1E1E',
          padding: '10px 20px',
        }}
      >
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#F0A028' }}>
          Olist Helper
        </div>
        <div>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              backgroundColor: 'transparent',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: '24px',
            }}
          >
            ☰
          </button>
        </div>
      </nav>
      {menuOpen && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: '#1E1E1E',
            padding: '10px 0',
          }}
        >
          <button
            onClick={() => handleNavigation('/my')}
            style={menuButtonStyle}
          >
            Página Inicial
          </button>
          <button
            onClick={() => handleNavigation('/registrar')}
            style={menuButtonStyle}
          >
            Registrar Dúvida
          </button>
          {user.role === 'analyst' && (
            <button
              onClick={() => handleNavigation('/dashboard-analyst')}
              style={menuButtonStyle}
            >
              Dashboard do Analista
            </button>
          )}
          <button
            onClick={() => signOut()}
            style={menuButtonStyle}
          >
            Logout
          </button>
        </div>
      )}
      <main style={{ padding: '20px' }}>
        <h1>Bem-vindo, {user.name}!</h1>
      </main>
    </div>
  );
}

const menuButtonStyle = {
  backgroundColor: '#E64E36',
  color: '#fff',
  padding: '10px 20px',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  marginBottom: '10px',
  transition: 'background-color 0.3s ease',
  width: '80%',
  textAlign: 'center',
};

// Server-side authentication
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
      user: {
        ...session.user,
        role: session.role,
      },
    },
  };
}