// pages/tools.js
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import { Tabs, Tab, ThemeProvider, createTheme } from '@mui/material';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import TicketCounter from '../components/TicketCounter';
import SharedMessages from '../components/SharedMessages';
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
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      const hash = window.location.hash;
      if (hash === '#TicketCounter') {
        setCurrentTab(0);
      } else if (hash === '#SharedMessages') {
        setCurrentTab(1);
      }
      setLoading(false);
    }, 500);
  }, []);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    let hash = '';
    switch (newValue) {
      case 0:
        hash = '#TicketCounter';
        break;
      case 1:
        hash = '#SharedMessages';
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
        <title>Ferramentas</title>
      </Head>

      <Navbar user={user} />

      <main className={styles.main}>
        <ThemeProvider theme={theme}>
          <div className={styles.tabsContainer}>
            <Tabs value={currentTab} onChange={handleTabChange} centered>
              {['support', 'support+', 'analyst', 'super'].includes(user.role) && (
                <Tab label="Contador de Chamados" />
              )}
              <Tab label="Respostas Compartilhadas" />
            </Tabs>
          </div>
        </ThemeProvider>

        <div className={styles.tabContent}>
          {currentTab === 0 && ['support', 'support+', 'analyst', 'super'].includes(user.role) && (
            <TicketCounter />
          )}
          {currentTab === 1 && <SharedMessages user={user} />}
        </div>
      </main>

      <Footer />
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session) {
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
      },
    },
  };
}