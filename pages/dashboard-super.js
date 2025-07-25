// pages/dashboard-super.js
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import { Tabs, Tab, ThemeProvider, createTheme } from '@mui/material';
import DashboardData from '../components/DashboardData';
import GraphData from '../components/GraphData';
import HelpTopicsData from '../components/HelpTopicsData';
import TicketLoggerDashboard from '../components/TicketLoggerDashboard';
import Layout from '../components/Layout';
import { ThreeDotsLoader } from '../components/LoadingIndicator';
import { useLoading } from '../components/LoadingIndicator';
import Swal from 'sweetalert2';
import styles from '../styles/DashboardSuper.module.css';

const theme = createTheme({
  components: {
    MuiTabs: {
      styleOverrides: {
        root: {
          backgroundColor: 'var(--tab-menu-bg)',
          borderRadius: '5px',
          marginBottom: '20px',
          marginTop: '20px',
        },
        indicator: {
          backgroundColor: 'var(--tab-menu-indicator)',
          height: '4px',
          borderRadius: '5px',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: 'var(--text-color)',
          fontSize: '16px',
          textTransform: 'none',
          transition: 'color 0.3s ease, background-color 0.3s ease',
          '&.Mui-selected': {
            color: 'var(--color-white)',
            backgroundColor: 'var(--color-primary)',
          },
        },
      },
    },
  },
});

export default function DashboardSuper({ user }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [greeting, setGreeting] = useState('');
  const { loading: routerLoading } = useLoading();
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
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
        setUsersLoading(true);
        const res = await fetch('/api/get-users');
        if (!res.ok) throw new Error('Erro ao carregar usuários');
        const data = await res.json();
        setUsers(data.users.filter(user => ['analyst', 'tax'].includes(user.role.toLowerCase())));
      } catch (err) {
        console.error('Erro ao carregar usuários:', err);
        Swal.fire('Erro', 'Erro ao carregar usuários.', 'error');
      } finally {
        setUsersLoading(false);
      }
    };

    loadUsers();

    const hash = window.location.hash;
    if (hash === '#Dashboard') {
      setCurrentTab(0);
    } else if (hash === '#TicketLogger') {
      setCurrentTab(1);
    } else if (hash === '#DataChart') {
      setCurrentTab(2);
    } else if (hash === '#HelpTopics') {
      setCurrentTab(3);
    }
  }, []);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    let hash = '';
    switch (newValue) {
      case 0:
        hash = '#Dashboard';
        break;
      case 1:
        hash = '#TicketLogger';
        break;
      case 2:
        hash = '#DataChart';
        break;
      case 3:
        hash = '#HelpTopics';
        break;
      default:
        break;
    }
    router.push(`${window.location.pathname}${hash}`, undefined, { shallow: true });
  };

  return (
    <Layout user={user}>
      <Head>
        <title>Dashboard Supervisor</title>
        <meta name="description" content="Painel de controle para supervisores visualizarem métricas de desempenho" />
      </Head>

      <div className={`${styles.container} ${routerLoading ? styles.blurred : ''}`}>
        {/* Header da página */}
        <header className={styles.header}>
          <div className={styles.greetingText}>
            {greeting}, <span className={styles.userName}>{user.name.split(' ')[0]}</span>
          </div>
          <p className={styles.subtitle}>
            Bem-vindo ao seu painel de controle. Aqui você pode monitorar o desempenho da sua equipe.
          </p>
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
                <Tab label="Dashboard Individual" />
                <Tab label="Registro de Chamados" />
                <Tab label="Comparativo de Equipe" />
                <Tab label="Temas de Dúvidas" />
              </Tabs>
            </div>
          </ThemeProvider>
        </section>

        {/* Conteúdo das abas */}
        <section className={styles.contentSection}>
          <div className={styles.tabContent}>
            {currentTab === 0 && (
              <div className={styles.tabPanel}>
                <DashboardData user={user} />
              </div>
            )}
            
            {currentTab === 1 && (
              <div className={styles.tabPanel}>
                <TicketLoggerDashboard user={user} />
              </div>
            )}
            
            {currentTab === 2 && (
              <div className={styles.tabPanel}>
                {usersLoading ? (
                  <ThreeDotsLoader message="Carregando dados da equipe..." />
                ) : (
                  <GraphData users={users} />
                )}
              </div>
            )}
            
            {currentTab === 3 && (
              <div className={styles.tabPanel}>
                <HelpTopicsData />
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
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

  // Buscar dados completos do usuário incluindo campo admin
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
        admin: userData?.admin || false,
        // Incluir outros campos importantes se necessário
        profile: userData?.profile,
        can_ticket: userData?.can_ticket,
        can_phone: userData?.can_phone,
        can_chat: userData?.can_chat,
        // NOVAS PERMISSÕES MODULARES
        can_register_help: userData?.can_register_help || false,
        can_remote_access: userData?.can_remote_access || false,
      },
    },
  };
}