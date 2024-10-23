import { getSession, signIn } from 'next-auth/react';
import Image from 'next/image';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        router.push('/my');
      }
    };
    checkSession();
  }, [router]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#121212', // Background dark mode
        padding: '0',
        margin: '0',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          maxWidth: '400px',
          width: '100%',
          backgroundColor: '#1E1E1E', // Background para a caixa de login, mais escuro
          borderRadius: '10px',
          boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.5)',
          padding: '40px',
        }}
      >
        <div style={{ marginBottom: '20px' }}>
          <Image
            src="/images/logos/olist_helper_logo.png"
            alt="Olist Helper Logo"
            width={150}
            height={150}
            onError={(e) => (e.target.style.display = 'none')}
          />
        </div>
        <h2 style={{ color: '#F0A028', marginBottom: '20px' }}>Login</h2>
        <button
          onClick={() => signIn('google')}
          style={{
            backgroundColor: '#E64E36',
            color: '#fff',
            padding: '15px 30px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            width: '100%',
            transition: 'background-color 0.3s ease',
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = '#F0A028')}
          onMouseOut={(e) => (e.target.style.backgroundColor = '#E64E36')}
        >
          Login com Google
        </button>
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (session) {
    return {
      redirect: {
        destination: '/my',
        permanent: false,
      },
    };
  }
  return {
    props: {},
  };
}
