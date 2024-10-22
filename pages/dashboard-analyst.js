import { getSession } from 'next-auth/react';
import dynamic from 'next/dynamic';

const AnalystDashboardPage = dynamic(() => import('../components/AnalystDashboardPage'), {
  ssr: false,
});

export async function getServerSideProps(context) {
  const session = await getSession(context);

  // Se o usuário não está autenticado ou não é "analyst", redireciona para a página inicial
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
