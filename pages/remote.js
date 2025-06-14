import Head from 'next/head';
import { useState, useEffect } from 'react';
import { Tabs, Tab, ThemeProvider, createTheme } from '@mui/material';
import { getSession } from 'next-auth/react';
import Layout from '../components/Layout';
import { useLoading } from '../components/LoadingIndicator';
import RegisterAccess from '../components/RegisterAccess';
import MyAccessRecords from '../components/MyAccessRecords';
import AllAccessRecords from '../components/AllAccessRecords';
import GoogleCalendar from '../components/GoogleCalendar';
import styles from '../styles/Remote.module.css';

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

export default function RemotePage({ user }) {
  const [currentTab, setCurrentTab] = useState(0);
  const { loading: routerLoading } = useLoading();

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Layout user={user}>
      <Head>
        <title>Acesso Remoto</title>
      </Head>

      <div className={`${styles.container} ${routerLoading ? styles.blurred : ''}`}>
        <main className={styles.main}>
          <ThemeProvider theme={theme}>
            <Tabs value={currentTab} onChange={handleTabChange} centered>
              {user.role === 'support+' && <Tab label="Registrar" />}
              {user.role === 'support+' && <Tab label="Meus Acessos" />}
              {user.role === 'super' && <Tab label="Todos os Acessos" />}
              {user.role === 'super' && <Tab label="Agenda" />}
            </Tabs>
          </ThemeProvider>

          <div className={styles.tabContent}>
            {user.role === 'support+' && currentTab === 0 && (
              <RegisterAccess user={user} />
            )}
            {user.role === 'support+' && currentTab === 1 && (
              <MyAccessRecords user={user} />
            )}
            {user.role === 'super' && currentTab === 0 && (
              <AllAccessRecords user={user} currentTab={currentTab} />
            )}
            {user.role === 'super' && currentTab === 1 && (
              <GoogleCalendar />
            )}
          </div>
        </main>
      </div>
    </Layout>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session || !['support+', 'super'].includes(session.role)) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return {
    props: {
      user: {
        ...session.user,
        role: session.role,
        id: session.id,
        name: session.user.name,
        email: session.user.email,
      },
    },
  };
}
