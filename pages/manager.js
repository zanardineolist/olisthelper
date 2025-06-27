import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import { Tabs, Tab, ThemeProvider, createTheme } from '@mui/material';
import Layout from '../components/Layout';
import ManageUsers from '../components/ManageUsers';
import ManageCategories from '../components/ManageCategories';
import ManageRecords from '../components/ManageRecords';
import { useLoading } from '../components/LoadingIndicator';
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
  const { loading: routerLoading } = useLoading();
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#Usuarios') {
      setCurrentTab(0);
    } else if (hash === '#Categorias') {
      setCurrentTab(1);
    } else if (hash === '#Registros' && (user.role === 'analyst' || user.role === 'tax')) {
      setCurrentTab(2);
    }
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

  return (
    <Layout user={user}>
      <Head>
        <title>Gerenciar Dados</title>
      </Head>

      <div className={`${styles.container} ${routerLoading ? styles.blurred : ''}`}>
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
        admin: userData?.admin || false,
        name: name,
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
