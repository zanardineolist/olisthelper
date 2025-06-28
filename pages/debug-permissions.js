import Head from 'next/head';
import { getSession } from 'next-auth/react';
import { getUserPermissions, getUserWithPermissions } from '../utils/supabase/supabaseClient';

export default function DebugPermissions({ userPermissions, userComplete, session }) {
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <Head>
        <title>Debug Permissões</title>
      </Head>
      
      <h1>Debug de Permissões do Usuário</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Session Data:</h2>
        <pre>{JSON.stringify(session, null, 2)}</pre>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>getUserPermissions():</h2>
        <pre>{JSON.stringify(userPermissions, null, 2)}</pre>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>getUserWithPermissions():</h2>
        <pre>{JSON.stringify(userComplete, null, 2)}</pre>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Verificações:</h2>
        <p>can_register_help (getUserPermissions): {userPermissions?.can_register_help ? 'TRUE' : 'FALSE'}</p>
        <p>can_register_help (getUserWithPermissions): {userComplete?.can_register_help ? 'TRUE' : 'FALSE'}</p>
        <p>can_remote_access (getUserPermissions): {userPermissions?.can_remote_access ? 'TRUE' : 'FALSE'}</p>
        <p>can_remote_access (getUserWithPermissions): {userComplete?.can_remote_access ? 'TRUE' : 'FALSE'}</p>
      </div>
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

  // Buscar com ambas as funções
  const userPermissions = await getUserPermissions(session.id);
  const userComplete = await getUserWithPermissions(session.id);

  return {
    props: {
      session: {
        ...session,
        // Remover dados sensíveis se houver
      },
      userPermissions,
      userComplete,
    },
  };
} 