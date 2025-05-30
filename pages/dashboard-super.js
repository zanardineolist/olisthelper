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
          borderRadius: '8px',
          marginBottom: '25px',
          marginTop: '20px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden'
        },
        indicator: {
          backgroundColor: 'var(--color-primary)',
          height: '3px',
          borderRadius: '3px 3px 0 0',
        },
        flexContainer: {
          height: '100%'
        }
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: 'var(--text-color)',
          fontSize: '15px',
          fontWeight: 500,
          textTransform: 'none',
          transition: 'all 0.3s ease',
          padding: '12px 24px',
          minHeight: '54px',
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
        <div className={styles.pageHeader}>
          <div className={styles.welcomeContainer}>
            <div className={styles.greetingText}>
              {greeting}, <span>{user.name.split(' ')[0]}</span>
            </div>
            <p className={styles.dashboardSubtitle}>
              Bem-vindo ao seu painel de controle. Aqui você pode monitorar o desempenho da sua equipe.
            </p>
          </div>
          
          <div className={styles.profileSummary}>
            <img src={user.image} alt={user.name} className={styles.profileImage} />
            <div className={styles.profileInfo}>
              <h2>{user.name}</h2>
              <p>{user.email}</p>
              <span className={styles.roleBadge}>Supervisor</span>
            </div>
          </div>
        </div>

        <ThemeProvider theme={theme}>
          <div className={styles.tabsContainer}>
            <Tabs 
              value={currentTab} 
              onChange={handleTabChange} 
              centered
              variant="fullWidth"
              aria-label="Dashboard navigation tabs"
            >
              <Tab 
                label="Dashboard Individual" 
                icon={<i className="fa-solid fa-user-check" style={{marginRight: '8px'}}></i>}
                iconPosition="start"
              />
              <Tab 
                label="Comparativo de Equipe" 
                icon={<i className="fa-solid fa-chart-column" style={{marginRight: '8px'}}></i>}
                iconPosition="start"
              />
              <Tab 
                label="Temas de Dúvidas" 
                icon={<i className="fa-solid fa-question-circle" style={{marginRight: '8px'}}></i>}
                iconPosition="start"
              />
            </Tabs>
          </div>
        </ThemeProvider>

        <div className={styles.tabContent}>
          {currentTab === 0 && <DashboardData user={user} />}
          {currentTab === 1 && <GraphData users={users} />}
          {currentTab === 2 && <HelpTopicsData />}
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