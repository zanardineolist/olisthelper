import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import { Tabs, Tab, ThemeProvider, createTheme } from '@mui/material';
import DashboardData from '../components/DashboardData';
import GraphData from '../components/GraphData';
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
      </Head>

      <Navbar user={user} />

      <main className={styles.main}>
        <div className={styles.leftAlignContainer}>
          <h1 className={styles.greeting}>
            Olá, {greeting} {user.name.split(' ')[0]}!
          </h1>

          <div className={styles.profileContainer}>
            <img src={user.image} alt={user.name} className={styles.profileImage} />
            <div className={styles.profileInfo}>
              <h2>{user.name}</h2>
              <p>{user.email}</p>
            </div>
          </div>
        </div>

        <ThemeProvider theme={theme}>
          <div className={styles.tabsContainer}>
            <Tabs value={currentTab} onChange={handleTabChange} centered>
              <Tab label="Dashboard" />
              <Tab label="Data Chart" />
            </Tabs>
          </div>
        </ThemeProvider>

        <div className={styles.tabContent}>
          {currentTab === 0 && <DashboardData user={user} />}
          {currentTab === 1 && <GraphData users={users} />}
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
