import Head from 'next/head';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import TicketCounter from '../components/TicketCounter';
import SharedMessages from '../components/SharedMessages';
import CepIbgeValidator from '../components/CepIbgeValidator';
import CepIbgeInfo from '../components/CepIbgeInfo';
import ErrosComuns from '../components/ErrosComuns';
import SheetSplitter from '../components/SheetSplitter';
import MinhaBase from '../components/MinhaBase';
import BibliotecaVideos from '../components/BibliotecaVideos';
import styles from '../styles/Tools.module.css';

// Constantes para roles de usuário
const ROLES_WITH_TICKET_ACCESS = ['support', 'support+', 'analyst', 'super', 'tax'];

// Configuração centralizada das abas
const TAB_CONFIG = [
  {
    id: 'MyBase',
    label: 'Minha Base',
    icon: '📊',
    hash: '#MyBase',
    component: MinhaBase,
    requiresTicketAccess: false,
    description: 'Gerencie sua base de conhecimento pessoal'
  },
  {
    id: 'ErrosComuns',
    label: 'Base de Erros',
    icon: '🔍',
    hash: '#ErrosComuns',
    component: ErrosComuns,
    requiresTicketAccess: false,
    description: 'Consulte erros comuns e suas soluções'
  },
  {
    id: 'TicketCounter',
    label: 'Contador de Chamados',
    icon: '📈',
    hash: '#TicketCounter',
    component: TicketCounter,
    requiresTicketAccess: true,
    description: 'Acompanhe seus chamados e estatísticas'
  },
  {
    id: 'SharedMessages',
    label: 'Respostas Compartilhadas',
    icon: '💬',
    hash: '#SharedMessages',
    component: SharedMessages,
    requiresTicketAccess: false,
    description: 'Acesse respostas padronizadas da equipe'
  },
  {
    id: 'CepIbgeValidator',
    label: 'Validador CEP',
    icon: '📍',
    hash: '#CepIbgeValidator',
    component: CepIbgeValidator,
    requiresTicketAccess: false,
    hasCustomContent: true,
    description: 'Valide correspondência CEP x IBGE'
  },
  {
    id: 'SheetSplitter',
    label: 'Divisor de Planilhas',
    icon: '📋',
    hash: '#SheetSplitter',
    component: SheetSplitter,
    requiresTicketAccess: false,
    description: 'Divida planilhas grandes em arquivos menores'
  },
  {
    id: 'BibliotecaVideos',
    label: 'Biblioteca de Vídeos',
    icon: '🎥',
    hash: '#BibliotecaVideos',
    component: BibliotecaVideos,
    requiresTicketAccess: false,
    description: 'Acesse vídeos educativos e tutoriais'
  }
];

export default function ToolsPage({ user }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
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

  // Detecta se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const handleTabChange = (newValue) => {
    setCurrentTab(newValue);
    setShowMobileMenu(false);
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

  const currentTabConfig = availableTabs[currentTab];

  return (
    <>
      <Head>
        <title>Ferramentas - {currentTabConfig?.label || 'OlistHelper'}</title>
        <meta name="description" content={currentTabConfig?.description || 'Ferramentas do OlistHelper'} />
      </Head>

      <Navbar user={user} />

      <main className={styles.main}>
        {/* Header da página */}
        <div className={styles.pageHeader}>
          <h1 className={styles.mainTitle}>Ferramentas</h1>
          <p className={styles.mainDescription}>
            Acesse todas as ferramentas disponíveis para otimizar seu trabalho
          </p>
        </div>

        {/* Sistema de Tabs Moderno */}
        <div className={styles.tabsWrapper}>
          {/* Mobile Menu Button */}
          {isMobile && (
            <button 
              className={styles.mobileMenuButton}
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-label="Menu de ferramentas"
            >
              <span className={styles.mobileMenuIcon}>
                {currentTabConfig?.icon}
              </span>
              <span className={styles.mobileMenuText}>
                {currentTabConfig?.label}
              </span>
              <span className={styles.mobileMenuArrow}>
                {showMobileMenu ? '▲' : '▼'}
              </span>
            </button>
          )}

          {/* Tabs Container */}
          <div className={`${styles.tabsContainer} ${isMobile && showMobileMenu ? styles.mobileMenuOpen : ''}`}>
            <div className={styles.tabsList}>
              {availableTabs.map((tab, index) => (
                <button
                  key={tab.id}
                  className={`${styles.tabButton} ${currentTab === index ? styles.tabActive : ''}`}
                  onClick={() => handleTabChange(index)}
                  title={tab.description}
                >
                  <span className={styles.tabIcon}>{tab.icon}</span>
                  <span className={styles.tabLabel}>{tab.label}</span>
                  {currentTab === index && <div className={styles.tabIndicator} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className={styles.tabContent}>
          <div className={styles.tabPanel}>
            {renderTabContent()}
          </div>
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