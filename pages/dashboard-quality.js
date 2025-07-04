import Head from 'next/head';
import { useState, useEffect } from 'react';
import { getSession } from 'next-auth/react';
import Layout from '../components/Layout';
import HelpTopicsData from '../components/HelpTopicsData';
import styles from '../styles/DashboardSuper.module.css';

export default function DashboardQuality({ user }) {
  const [greeting, setGreeting] = useState('');
  const [loading, setLoading] = useState(false);

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
    // Configuração inicial se necessário
  }, []);



  return (
    <Layout user={user}>
      <Head>
        <title>Dashboard Qualidade</title>
        <meta name="description" content="Painel de controle para equipe de qualidade visualizar temas de dúvidas" />
      </Head>

      <div className={styles.container}>
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
      </div>
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

  // Buscar dados completos do usuário incluindo permissões modulares
  const { getUserWithPermissions } = await import('../utils/supabase/supabaseClient');
  const userData = await getUserWithPermissions(session.id);

  const name = session.user?.name ?? 'Unknown';

  return {
    props: {
      user: {
        ...session.user,
        role: session.role,
        id: session.id,
        name: name,
        
        // PERMISSÕES TRADICIONAIS
        admin: userData?.admin || false,
        can_ticket: userData?.can_ticket || false,
        can_phone: userData?.can_phone || false,
        can_chat: userData?.can_chat || false,
        
        // NOVAS PERMISSÕES MODULARES
        can_register_help: userData?.can_register_help || false,
        can_remote_access: userData?.can_remote_access || false,
      },
    },
  };
} 