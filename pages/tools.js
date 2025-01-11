import Head from 'next/head';
import { useState, useEffect } from 'react';
import { getSession } from 'next-auth/react';
import { Tabs, Tab, ThemeProvider, createTheme } from '@mui/material';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import MessagesManager from '../components/tools/MessagesManager';
import { initializeUser } from '../utils/supabase';
import styles from '../styles/Tools.module.css';

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

export default function ToolsPage({ user }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initUser = async () => {
      setLoading(true);
      try {
        await initializeUser(user);
      } catch (error) {
        console.error('Error initializing user:', error);
      } finally {
        setLoading(false);
      }
    };

    initUser();
  }, [user]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
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
        <title>Ferramentas</title>
      </Head>

      <Navbar user={user} />

      <main className={styles.main}>
        <ThemeProvider theme={theme}>
          <div className={styles.tabsContainer}>
            <Tabs value={currentTab} onChange={handleTabChange} centered>
              <Tab label="Mensagens" />
              {/* Futuras ferramentas serão adicionadas aqui */}
            </Tabs>
          </div>
        </ThemeProvider>

        <div className={styles.tabContent}>
          {currentTab === 0 && <MessagesManager user={user} />}
        </div>
      </main>

      <Footer />
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session || !['support', 'analyst', 'tax'].includes(session.role)) {
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
      },
    },
  };
}