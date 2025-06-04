import Head from 'next/head';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import { Tabs, Tab, ThemeProvider, createTheme } from '@mui/material';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import TicketCounter from '../components/TicketCounter';
import SharedMessages from '../components/SharedMessages';
import CepIbgeValidator from '../components/CepIbgeValidator';
import CepIbgeInfo from '../components/CepIbgeInfo';
import ErrosComuns from '../components/ErrosComuns';
import SheetSplitter from '../components/SheetSplitter';
import MinhaBase from '../components/MinhaBase';
import styles from '../styles/Tools.module.css';

// Constantes para roles de usuário
const ROLES_WITH_TICKET_ACCESS = ['support', 'support+', 'analyst', 'super', 'tax'];

// Configuração centralizada das abas
const TAB_CONFIG = [
  {
    id: 'MyBase',
    label: 'Minha Base',
    hash: '#MyBase',
    component: MinhaBase,
    requiresTicketAccess: false
  },
  {
    id: 'ErrosComuns',
    label: 'Base de Erros',
    hash: '#ErrosComuns',
    component: ErrosComuns,
    requiresTicketAccess: false
  },
  {
    id: 'TicketCounter',
    label: 'Contador de Chamados',
    hash: '#TicketCounter',
    component: TicketCounter,
    requiresTicketAccess: true
  },
  {
    id: 'SharedMessages',
    label: 'Respostas Compartilhadas',
    hash: '#SharedMessages',
    component: SharedMessages,
    requiresTicketAccess: false
  },
  {
    id: 'CepIbgeValidator',
    label: 'Validador CEP',
    hash: '#CepIbgeValidator',
    component: CepIbgeValidator,
    requiresTicketAccess: false,
    hasCustomContent: true
  },
  {
    id: 'SheetSplitter',
    label: 'Divisor de Planilhas',
    hash: '#SheetSplitter',
    component: SheetSplitter,
    requiresTicketAccess: false
  }
];

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
  
  // Verifica se o usuário tem acesso ao contador de chamados
  const hasTicketCounterAccess = useMemo(() => 
    ROLES_WITH_TICKET_ACCESS.includes(user.role), 
    [user.role]
  );

  // Filtra as abas baseado nas permissões do usuário
  const availableTabs = useMemo(() => 
    TAB_CONFIG.filter(tab => !tab.requiresTicketAccess || hasTicketCounterAccess),
    [hasTicketCounterAccess]
  );

  // Mapeia hash para índice da aba
  const hashToTabIndex = useMemo(() => {
    const mapping = {};
    availableTabs.forEach((tab, index) => {
      mapping[tab.hash] = index;
    });
    return mapping;
  }, [availableTabs]);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      const hash = window.location.hash;
      const tabIndex = hashToTabIndex[hash];
      
      if (tabIndex !== undefined) {
        setCurrentTab(tabIndex);
      } else {
        setCurrentTab(0); // Primeira aba disponível
      }
      
      setLoading(false);
    }, 500);
  }, [hashToTabIndex]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    const selectedTab = availableTabs[newValue];
    
    if (selectedTab) {
      router.push(`${window.location.pathname}${selectedTab.hash}`, undefined, { shallow: true });
    }
  };

  // Renderiza o conteúdo da aba atual
  const renderTabContent = () => {
    const currentTabConfig = availableTabs[currentTab];
    if (!currentTabConfig) return null;

    const Component = currentTabConfig.component;

    // Tratamento especial para CepIbgeValidator
    if (currentTabConfig.id === 'CepIbgeValidator') {
      return (
        <>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Validador CEP</h1>
            <p className={styles.pageDescription}>
              Ferramenta para verificar a correspondência entre a cidade retornada pelos Correios e a nomenclatura 
              oficial do IBGE que é utilizada pela SEFAZ para validação de notas fiscais.
            </p>
          </div>
          <Component />
          <CepIbgeInfo />
        </>
      );
    }

    // Renderização padrão para outros componentes
    return <Component user={user} />;
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
              {availableTabs.map((tab) => (
                <Tab key={tab.id} label={tab.label} />
              ))}
            </Tabs>
          </div>
        </ThemeProvider>

        <div className={styles.tabContent}>
          {renderTabContent()}
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