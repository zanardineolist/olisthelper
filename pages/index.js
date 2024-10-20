import { getSession, signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <h2>Login</h2>
        <button
          onClick={() => signIn('google')}
          style={{ backgroundColor: '#4285F4', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
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
