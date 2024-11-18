import Head from 'next/head';
import { useState, useEffect } from 'react';
import { Tabs, Tab, ThemeProvider, createTheme } from '@mui/material';
import { getSession } from 'next-auth/react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
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

export default function RemotePage({ user }) {
  const [currentTab, setCurrentTab] = useState(user.role === 'super' ? 2 : 0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <>
      <Head>
        <title>Acesso Remoto</title>
      </Head>

      <Navbar user={user} />

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
          {currentTab === 0 && user.role === 'support+' && (
            <RegisterAccess user={user} />
          )}
          {currentTab === 1 && user.role === 'support+' && (
            <MyAccessRecords user={user} />
          )}
          {currentTab === 2 && user.role === 'super' && (
            <AllAccessRecords user={user} currentTab={currentTab} />
          )}
          {currentTab === 3 && user.role === 'super' && (
            <GoogleCalendar />
          )}
        </div>
      </main>

      <Footer />
    </>
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
