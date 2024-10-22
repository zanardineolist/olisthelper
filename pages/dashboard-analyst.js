import { getSession } from 'next-auth/react';
import dynamic from 'next/dynamic';

const AnalystDashboardPage = dynamic(() => import('../components/AnalystDashboardPage'), {
  ssr: false,
});

export async function getServerSideProps(context) {
  const session = await getSession(context);

  // Verifica se o usuário não está autenticado ou se não é um "analyst"
  if (!session || session.role !== 'analyst') {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return {
    props: { session },
  };
}

export default function DashboardAnalyst({ session }) {
  return <AnalystDashboardPage session={session} />;
}
