// pages/dashboard-super.js
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import { Tabs, Tab, ThemeProvider, createTheme } from '@mui/material';
import DashboardData from '../components/DashboardData';
import GraphData from '../components/GraphData';
import HelpTopicsData from '../components/HelpTopicsData';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Swal from 'sweetalert2';
import styles from '../styles/DashboardSuper.module.css';

const theme = createTheme({
  components: {
    MuiTabs: {
      styleOverrides: {
        root: {
          backgroundColor: 'var(--tab-menu-bg)',
          borderRadius: '12px',
          marginBottom: '32px',
          marginTop: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
        },
        indicator: {
          backgroundColor: 'var(--color-primary)',
          height: '4px',
          borderRadius: '4px 4px 0 0',
        },
        flexContainer: {
          height: '100%'
        }
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: 'var(--text-color2)',
          fontSize: '16px',
          fontWeight: 500,
          textTransform: 'none',
          transition: 'all 0.3s ease',
          padding: '16px 28px',
          minHeight: '64px',
          '&.Mui-selected': {
            color: 'var(--color-primary)',
            backgroundColor: 'var(--box-color)',
            fontWeight: 600
          },
          '&:hover': {
            backgroundColor: 'var(--color-trodd)',
            color: 'var(--title-color)'
          }
        },
      },
    },
  },
});

export default function DashboardSuper({ user }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [greeting, setGreeting] = useState('');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const router = useRouter();

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
    // Carregar lista de usuários ao montar o componente
    const loadUsers = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/get-users');
        if (!res.ok) throw new Error('Erro ao carregar usuários');
        const data = await res.json();
        setUsers(data.users.filter(user => ['analyst', 'tax'].includes(user.role.toLowerCase())));
      } catch (err) {
        console.error('Erro ao carregar usuários:', err);
        Swal.fire('Erro', 'Erro ao carregar usuários.', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();

    // Simulando um pequeno atraso para exibir o loader
    setTimeout(() => {
      const hash = window.location.hash;
      if (hash === '#Dashboard') {
        setCurrentTab(0);
      } else if (hash === '#DataChart') {
        setCurrentTab(1);
      } else if (hash === '#HelpTopics') {
        setCurrentTab(2);
      }
    }, 500);
  }, []);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    let hash = '';
    switch (newValue) {
      case 0:
        hash = '#Dashboard';
        break;
      case 1:
        hash = '#DataChart';
        break;
      case 2:
        hash = '#HelpTopics';
        break;
      default:
        break;
    }
    router.push(`${window.location.pathname}${hash}`, undefined, { shallow: true });
  };

  if (loading) {
    return (
      <div className="loaderOverlay">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard Supervisor</title>
        <meta name="description" content="Painel de controle para supervisores visualizarem métricas de desempenho" />
      </Head>

      <Navbar user={user} />

      <main className={styles.dashboardMain}>
        {/* Container principal com largura limitada */}
        <div className={styles.mainContainer}>
          {/* Header da página */}
          <header className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <div className={styles.welcomeSection}>
                <div className={styles.greetingText}>
                  {greeting}, <span className={styles.userName}>{user.name.split(' ')[0]}</span>
                </div>
                <p className={styles.dashboardSubtitle}>
                  Bem-vindo ao seu painel de controle. Aqui você pode monitorar o desempenho da sua equipe.
                </p>
              </div>
              
              <div className={styles.profileSection}>
                <div className={styles.profileCard}>
                  <img src={user.image} alt={user.name} className={styles.profileImage} />
                  <div className={styles.profileInfo}>
                    <h2 className={styles.profileName}>{user.name}</h2>
                    <p className={styles.profileEmail}>{user.email}</p>
                    <span className={styles.roleBadge}>
                      <i className="fa-solid fa-crown"></i>
                      Supervisor
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Sistema de navegação por abas */}
          <section className={styles.navigationSection}>
            <ThemeProvider theme={theme}>
              <div className={styles.tabsContainer}>
                <Tabs 
                  value={currentTab} 
                  onChange={handleTabChange} 
                  variant="fullWidth"
                  aria-label="Dashboard navigation tabs"
                >
                  <Tab label="📊 Dashboard Individual" />
                  <Tab label="📈 Comparativo de Equipe" />
                  <Tab label="❓ Temas de Dúvidas" />
                </Tabs>
              </div>
            </ThemeProvider>
          </section>

          {/* Conteúdo das abas */}
          <section className={styles.contentSection}>
            <div className={styles.tabContent}>
              {currentTab === 0 && (
                <div className={styles.tabPanel}>
                  <div className={styles.tabPanelHeader}>
                    <h3 className={styles.tabPanelTitle}>
                      <i className="fa-solid fa-user-check"></i>
                      Dashboard Individual
                    </h3>
                    <p className={styles.tabPanelDescription}>
                      Análise detalhada de performance individual dos colaboradores
                    </p>
                  </div>
                  <DashboardData user={user} />
                </div>
              )}
              
              {currentTab === 1 && (
                <div className={styles.tabPanel}>
                  <div className={styles.tabPanelHeader}>
                    <h3 className={styles.tabPanelTitle}>
                      <i className="fa-solid fa-chart-column"></i>
                      Comparativo de Equipe
                    </h3>
                    <p className={styles.tabPanelDescription}>
                      Análise comparativa de performance entre membros da equipe
                    </p>
                  </div>
                  <GraphData users={users} />
                </div>
              )}
              
              {currentTab === 2 && (
                <div className={styles.tabPanel}>
                  <div className={styles.tabPanelHeader}>
                    <h3 className={styles.tabPanelTitle}>
                      <i className="fa-solid fa-question-circle"></i>
                      Temas de Dúvidas
                    </h3>
                    <p className={styles.tabPanelDescription}>
                      Análise dos principais temas de dúvidas e oportunidades de melhoria
                    </p>
                  </div>
                  <HelpTopicsData />
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session || session.role !== 'super') {
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