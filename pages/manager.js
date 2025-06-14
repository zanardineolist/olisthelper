import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import { Tabs, Tab, ThemeProvider, createTheme } from '@mui/material';
import Layout from '../components/Layout';
import ManageUsers from '../components/ManageUsers';
import ManageCategories from '../components/ManageCategories';
import ManageRecords from '../components/ManageRecords';
import styles from '../styles/Manager.module.css';

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

export default function ManagerPage({ user }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Simulando um pequeno atraso para exibir o loader
    setLoading(true);
    setTimeout(() => {
      const hash = window.location.hash;
      if (hash === '#Usuarios') {
        setCurrentTab(0);
      } else if (hash === '#Categorias') {
        setCurrentTab(1);
      } else if (hash === '#Registros' && (user.role === 'analyst' || user.role === 'tax')) {
        setCurrentTab(2);
      }
      setLoading(false);
    }, 500);
  }, [user.role]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    let hash = '';
    switch (newValue) {
      case 0:
        hash = '#Usuarios';
        break;
      case 1:
        hash = '#Categorias';
        break;
      case 2:
        hash = '#Registros';
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
    <Layout user={user}>
      <Head>
        <title>Gerenciar Dados</title>
      </Head>

      <div className={styles.container}>
        {/* Header da página */}
        <div className={styles.pageHeader}>
          <h1 className={styles.mainTitle}>Gerenciador</h1>
          <p className={styles.mainDescription}>
            Gerencie usuários, categorias e registros do sistema
          </p>
        </div>

        <ThemeProvider theme={theme}>
          <Tabs value={currentTab} onChange={handleTabChange} centered>
            <Tab label="Gerenciar Usuários" />
            <Tab label="Gerenciar Categorias" />
            {(user.role === 'analyst' || user.role === 'tax') && (
              <Tab label="Gerenciar Registros" />
            )}
          </Tabs>
        </ThemeProvider>

        <div className={styles.tabContent}>
          {currentTab === 0 && <ManageUsers user={user} />}
          {currentTab === 1 && <ManageCategories user={user} />}
          {currentTab === 2 && (user.role === 'analyst' || user.role === 'tax') && (
            <ManageRecords user={user} />
          )}
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session || !['analyst', 'super', 'tax'].includes(session.role)) {
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
