import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import { Tabs, Tab, ThemeProvider, createTheme } from '@mui/material';
import ManageUsers from '../components/ManageUsers';
import ManageCategories from '../components/ManageCategories';
import ManageRecords from '../components/ManageRecords';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import styles from '../styles/Manager.module.css';

// Criação do tema com as cores personalizadas
const theme = createTheme({
  components: {
    MuiTabs: {
      styleOverrides: {
        root: {
          backgroundColor: 'var(--manager-menu-bg)',
          borderRadius: '5px',
          marginBottom: '20px',
          marginTop: '20px',
        },
        indicator: {
          backgroundColor: 'var(--manager-menu-indicator)',
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
  const router = useRouter();
  const { tab } = router.query;

  useEffect(() => {
    // Definir a aba inicial com base na rota da URL
    if (tab === 'Usuarios') {
      setCurrentTab(0);
    } else if (tab === 'Categorias') {
      setCurrentTab(1);
    } else if (tab === 'Registros' && (user.role === 'analyst' || user.role === 'tax')) {
      setCurrentTab(2);
    } else {
      // Caso não tenha um tab válido, redireciona para a primeira aba
      router.push('/manager/Usuarios', undefined, { shallow: true });
    }
  }, [tab, user.role, router]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    // Atualizar a URL com o caminho correspondente à aba selecionada
    let path = '';
    switch (newValue) {
      case 0:
        path = '/manager/Usuarios';
        break;
      case 1:
        path = '/manager/Categorias';
        break;
      case 2:
        path = '/manager/Registros';
        break;
      default:
        break;
    }
    router.push(path, undefined, { shallow: true });
  };

  return (
    <>
      <Head>
        <title>Gerenciar Dados</title>
      </Head>

      <Navbar user={user} />

      <main className={styles.main}>
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
      </main>

      <Footer />
    </>
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
