import Head from 'next/head';
import { getSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import styles from '../styles/DashboardQuality.module.css';
import HelpTopicsData from '../components/HelpTopicsData';

export default function DashboardQuality({ user }) {
  const [greeting, setGreeting] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Definir a saudação com base na hora do dia
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 18) {
      setGreeting('Boa tarde');
    } else if (hour >= 18) {
      setGreeting('Boa noite');
    } else {
      setGreeting('Bom dia');
    }
  }, []);

  useEffect(() => {
    // Simular um pequeno atraso para exibir o loader
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div className="loaderOverlay">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <Layout user={user}>
      <Head>
        <title>Dashboard Qualidade</title>
        <meta name="description" content="Painel de controle para equipe de qualidade visualizar temas de dúvidas" />
      </Head>

      <main className={styles.dashboardMain}>
        <div className={styles.pageHeader}>
          <div className={styles.welcomeContainer}>
            <div className={styles.greetingText}>
              {greeting}, <span>{user.name.split(' ')[0]}</span>
            </div>
            <p className={styles.dashboardSubtitle}>
              Bem-vindo ao seu painel de controle. Aqui você pode monitorar os temas de dúvidas mais frequentes.
            </p>
          </div>
          
          <div className={styles.profileSummary}>
            <img src={user.image} alt={user.name} className={styles.profileImage} />
            <div className={styles.profileInfo}>
              <h2>{user.name}</h2>
              <p>{user.email}</p>
              <span className={styles.roleBadge}>Qualidade</span>
            </div>
          </div>
        </div>

        <div className={styles.dashboardTitle}>
          <h1>Análise de Temas de Dúvidas</h1>
          <p>Visualize e analise os temas de dúvidas mais frequentes para orientar melhorias na documentação e treinamentos.</p>
        </div>

        <div className={styles.tabContent}>
          <HelpTopicsData />
        </div>
      </main>
    </Layout>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  
  if (!session || session.role !== 'quality') {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  const name = session.user?.name ?? 'Unknown';

  return {
    props: {
      user: {
        ...session.user,
        role: session.role,
        id: session.id,
        name: name,
      },
    },
  };
} 