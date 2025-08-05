import Head from 'next/head';
import { useState, useEffect } from 'react';
import { getSession } from 'next-auth/react';
import Layout from '../components/Layout';
import HelpTopicsData from '../components/HelpTopicsData';
import styles from '../styles/DashboardQuality.module.css';

export default function DashboardQuality({ user }) {
  const [greeting, setGreeting] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Definir a saudação com base na hora do dia
    const brtDate = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    const currentHour = new Date(brtDate).getHours();
    
    let greetingMessage = '';
    if (currentHour >= 5 && currentHour < 12) {
      greetingMessage = 'Bom dia';
    } else if (currentHour >= 12 && currentHour < 18) {
      greetingMessage = 'Boa tarde';
    } else {
      greetingMessage = 'Boa noite';
    }

    setGreeting(greetingMessage);
  }, []);

  useEffect(() => {
    // Configuração inicial se necessário
  }, []);

  const firstName = user.name.split(' ')[0];

  return (
    <Layout user={user}>
      <Head>
        <title>Dashboard Qualidade</title>
        <meta name="description" content="Painel de controle para equipe de qualidade visualizar temas de dúvidas" />
      </Head>

      <div className={styles.container}>
        {/* Header seguindo padrão do profile-analyst */}
        <header className={styles.header}>
          <h1 className={styles.greeting}>{greeting}, {firstName}!</h1>
          <p className={styles.subtitle}>Painel de controle para análise de temas de dúvidas</p>
        </header>

        {/* Seção de Overview */}
        <section className={styles.overviewSection}>
          {/* Card de Perfil */}
          <div className={styles.profileCard}>
            <div className={styles.profileMainInfo}>
              <img 
                src={user.image} 
                alt={user.name} 
                className={styles.profileImage} 
              />
              <div className={styles.profileDetails}>
                <h3>{user.name}</h3>
                <p>{user.email}</p>
                <div className={styles.profileTags}>
                  <div className={styles.roleTag}>
                    <i className="fa-solid fa-shield-halved"></i>
                    Qualidade
                  </div>
                </div>
              </div>
            </div>
            
            {/* Informações do Dashboard */}
            <div className={styles.dashboardInfo}>
              <div className={styles.infoItem}>
                <div className={styles.infoIcon}>
                  <i className="fa-solid fa-chart-line"></i>
                </div>
                <div className={styles.infoContent}>
                  <span className={styles.infoValue}>Análise</span>
                  <span className={styles.infoLabel}>Temas de Dúvidas</span>
                </div>
              </div>
              
              <div className={styles.infoItem}>
                <div className={styles.infoIcon}>
                  <i className="fa-solid fa-lightbulb"></i>
                </div>
                <div className={styles.infoContent}>
                  <span className={styles.infoValue}>Oportunidades</span>
                  <span className={styles.infoLabel}>Melhorias</span>
                </div>
              </div>
              
              <div className={styles.infoItem}>
                <div className={styles.infoIcon}>
                  <i className="fa-solid fa-file-lines"></i>
                </div>
                <div className={styles.infoContent}>
                  <span className={styles.infoValue}>Relatórios</span>
                  <span className={styles.infoLabel}>Exportáveis</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Card de Estatísticas */}
          <div className={styles.statsCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                <i className="fa-solid fa-chart-pie"></i>
                Visão Geral
              </h3>
            </div>
            
            <div className={styles.statsContent}>
              <div className={styles.statItem}>
                <div className={styles.statIcon}>
                  <i className="fa-solid fa-magnifying-glass"></i>
                </div>
                <div className={styles.statData}>
                  <span className={styles.statValue}>Análise</span>
                  <span className={styles.statLabel}>Temas Frequentes</span>
                </div>
              </div>
              
              <div className={styles.statItem}>
                <div className={styles.statIcon}>
                  <i className="fa-solid fa-arrow-trend-up"></i>
                </div>
                <div className={styles.statData}>
                  <span className={styles.statValue}>Tendências</span>
                  <span className={styles.statLabel}>Padrões Identificados</span>
                </div>
              </div>
              
              <div className={styles.statItem}>
                <div className={styles.statIcon}>
                  <i className="fa-solid fa-gear"></i>
                </div>
                <div className={styles.statData}>
                  <span className={styles.statValue}>Ações</span>
                  <span className={styles.statLabel}>Melhorias Sugeridas</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Seção Principal: Análise de Temas */}
        <section className={styles.analysisSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <i className="fa-solid fa-chart-line"></i>
              Análise de Temas de Dúvidas
            </h2>
            <p className={styles.sectionSubtitle}>
              Visualize e analise os temas de dúvidas mais frequentes para orientar melhorias na documentação e treinamentos.
            </p>
          </div>
          
          <div className={styles.tabContent}>
            <HelpTopicsData />
          </div>
        </section>
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