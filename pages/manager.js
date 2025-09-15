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

// Tema personalizado para as abas seguindo o padrão moderno
const theme = createTheme({
  components: {
    MuiTabs: {
      styleOverrides: {
        root: {
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          position: 'sticky',
          top: '64px',
          zIndex: 100,
          boxShadow: 'var(--shadow-sm)',
          transition: 'box-shadow 0.3s ease',
          minHeight: '56px',
          padding: '0 20px',
        },
        indicator: {
          backgroundColor: 'var(--color-primary)',
          height: '3px',
          borderRadius: '2px 2px 0 0',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.95rem',
          color: 'var(--text-secondary)',
          minHeight: '56px',
          padding: '12px 24px',
          margin: '0',
          borderRadius: '0',
          transition: 'all 0.2s ease',
          position: 'relative',
          '&:hover': {
            backgroundColor: 'rgba(var(--color-primary-rgb), 0.08)',
            color: 'var(--color-primary)',
          },
          '&.Mui-selected': {
            color: 'var(--color-primary)',
            fontWeight: 700,
            backgroundColor: 'transparent',
          },
          '&:not(:last-child)::after': {
            content: '""',
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: '1px',
            height: '24px',
            backgroundColor: 'var(--border-color)',
            opacity: 0.5,
          },
        },
      },
    },
  },
});

export default function ManagerPage({ user }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
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

  // Detectar scroll para efeito nas abas
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
        <title>Gerenciamento - Olist Helper</title>
        <meta name="description" content="Painel de gerenciamento do Olist Helper" />
      </Head>

      <div className={`${styles.container} ${routerLoading ? styles.blurred : ''}`}>
        {/* Header da página */}
        <div className={styles.pageHeader}>
          <h1 className={styles.mainTitle}>Gerenciamento</h1>
          <p className={styles.mainDescription}>
            Gerencie usuários, categorias e registros do sistema Olist Helper
          </p>
        </div>

        {/* Sistema de abas moderno */}
        <ThemeProvider theme={theme}>
          <div className={`${styles.tabsWrapper} ${isScrolled ? styles.scrolled : ''}`}>
            <div className={styles.tabsContainer}>
              <Tabs
                value={currentTab}
                onChange={handleTabChange}
                aria-label="Abas de gerenciamento"
                variant="standard"
                scrollButtons={false}
              >
                <Tab label="Usuários" />
                <Tab label="Categorias" />
                {(user.role === 'analyst' || user.role === 'tax') && (
                  <Tab label="Registros" />
                )}
              </Tabs>
            </div>
          </div>

          {/* Conteúdo das abas */}
          <div className={styles.contentSection}>
            <div className={styles.tabContent}>
              {currentTab === 0 && <ManageUsers user={user} />}
              {currentTab === 1 && <ManageCategories user={user} />}
              {currentTab === 2 && (user.role === 'analyst' || user.role === 'tax') && (
                <ManageRecords user={user} />
              )}
            </div>
          </div>
        </ThemeProvider>
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
