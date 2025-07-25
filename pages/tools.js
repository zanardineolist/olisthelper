import Head from 'next/head';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import { 
  FaDatabase, 
  FaSearch, 
  FaChartLine, 
  FaComments, 
  FaMapMarkerAlt, 
  FaFileExcel, 
  FaVideo,
  FaChevronLeft,
  FaChevronRight,
  FaTag,
  FaExclamationTriangle
} from 'react-icons/fa';
import Layout from '../components/Layout';
import TicketCounter from '../components/TicketCounter';
import SharedMessages from '../components/SharedMessages';
import CepIbgeValidator from '../components/CepIbgeValidator';
import CepIbgeInfo from '../components/CepIbgeInfo';
import ErrosComuns from '../components/ErrosComuns';
import SheetSplitter from '../components/SheetSplitter';
import MinhaBase from '../components/MinhaBase';
import BibliotecaVideos from '../components/BibliotecaVideos';
import TicketLogger from '../components/TicketLogger';
import ValidadorML from '../components/ValidadorML';
import Ocorrencias from '../components/Ocorrencias';
import { useLoading } from '../components/LoadingIndicator';
import styles from '../styles/Tools.module.css';

// Constantes para roles de usuário
  const ROLES_WITH_TICKET_ACCESS = ['support', 'analyst', 'super', 'tax'];

// Configuração centralizada das abas
const TAB_CONFIG = [
  {
    id: 'MyBase',
    label: 'Minha Base',
    icon: FaDatabase,
    hash: '#MyBase',
    component: MinhaBase,
    requiresTicketAccess: false,
    description: 'Gerencie sua base de conhecimento pessoal'
  },
  {
    id: 'ErrosComuns',
    label: 'Base de Erros',
    icon: FaSearch,
    hash: '#ErrosComuns',
    component: ErrosComuns,
    requiresTicketAccess: false,
    description: 'Consulte erros comuns e suas soluções'
  },
  {
    id: 'Ocorrencias',
    label: 'Ocorrências',
    icon: FaExclamationTriangle,
    hash: '#Ocorrencias',
    component: Ocorrencias,
    requiresTicketAccess: false,
    description: 'Mantenha-se atualizado sobre ocorrências do suporte'
  },
  {
    id: 'TicketCounter',
    label: 'Contador de Chamados',
    icon: FaChartLine,
    hash: '#TicketCounter',
    component: TicketCounter,
    requiresTicketAccess: true,
    description: 'Acompanhe seus chamados e estatísticas'
  },
  {
    id: 'TicketLogger',
    label: 'Registro de Chamados',
    icon: FaChartLine,
    hash: '#TicketLogger',
    component: TicketLogger,
    requiresTicketAccess: true,
    description: 'Registre chamados com links e acompanhe evolução por hora'
  },
  {
    id: 'SharedMessages',
    label: 'Respostas Compartilhadas',
    icon: FaComments,
    hash: '#SharedMessages',
    component: SharedMessages,
    requiresTicketAccess: false,
    description: 'Acesse respostas padronizadas da equipe'
  },
  {
    id: 'BibliotecaVideos',
    label: 'Biblioteca de Vídeos',
    icon: FaVideo,
    hash: '#BibliotecaVideos',
    component: BibliotecaVideos,
    requiresTicketAccess: false,
    description: 'Acesse vídeos educativos e tutoriais'
  },
  {
    id: 'CepIbgeValidator',
    label: 'Validador CEP',
    icon: FaMapMarkerAlt,
    hash: '#CepIbgeValidator',
    component: CepIbgeValidator,
    requiresTicketAccess: false,
    hasCustomContent: true,
    description: 'Valide correspondência CEP x IBGE'
  },
  {
    id: 'SheetSplitter',
    label: 'Divisor de Planilhas',
    icon: FaFileExcel,
    hash: '#SheetSplitter',
    component: SheetSplitter,
    requiresTicketAccess: false,
    description: 'Divida planilhas grandes em arquivos menores'
  },
  {
    id: 'ValidadorML',
    label: 'Validador ML',
    icon: FaTag,
    hash: '#ValidadorML',
    component: ValidadorML,
    requiresTicketAccess: false,
    description: 'Valide categorias e obtenha informações do Mercado Livre'
  }
];

export default function ToolsPage({ user }) {
  const [currentTab, setCurrentTab] = useState(0);
  const { loading: routerLoading } = useLoading();
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const router = useRouter();
  const tabsListRef = useRef(null);
  
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

  // Detecta scroll da página para aplicar efeito nas tabs
  useEffect(() => {
    const handlePageScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setIsScrolled(scrollTop > 100); // Aplica efeito após 100px de scroll
    };

    window.addEventListener('scroll', handlePageScroll);
    return () => window.removeEventListener('scroll', handlePageScroll);
  }, []);

  // Verifica se pode fazer scroll nas tabs
  const checkScrollButtons = () => {
    if (tabsListRef.current && !isMobile) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsListRef.current;
      const canLeft = scrollLeft > 5; // Pequena margem para evitar problemas de precisão
      const canRight = scrollLeft < scrollWidth - clientWidth - 5;
      
      setCanScrollLeft(canLeft);
      setCanScrollRight(canRight);
      setShowLeftGradient(canLeft);
      setShowRightGradient(canRight);
    }
  };

  // Funções de scroll
  const scrollTabs = (direction) => {
    if (tabsListRef.current) {
      const scrollAmount = 200;
      const currentScroll = tabsListRef.current.scrollLeft;
      const newScrollLeft = direction === 'left' 
        ? Math.max(0, currentScroll - scrollAmount)
        : currentScroll + scrollAmount;
      
      tabsListRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
      
      // Força verificação após scroll (necessário para animação)
      setTimeout(() => {
        checkScrollButtons();
      }, 300);
    }
  };

  // Scroll horizontal com mouse wheel (apenas na área das tabs)
  const handleWheelScroll = (e) => {
    if (tabsListRef.current && !isMobile) {
      // Verifica se o elemento ou seus pais estão na área das tabs
      const target = e.target;
      const isInTabsArea = target.closest(`[class*="tabsWrapper"]`) || 
                          target.closest(`[class*="tabsContainer"]`) || 
                          target.closest(`[class*="tabsNavigation"]`) ||
                          target.closest(`[class*="tabsListWrapper"]`) ||
                          target.closest(`[class*="tabsList"]`) ||
                          target.closest(`[class*="tabButton"]`) ||
                          target.closest(`[class*="scrollButton"]`);
      
      if (isInTabsArea) {
        // Detecta se é scroll horizontal (deltaX) ou vertical (deltaY)
        const deltaX = e.deltaX;
        const deltaY = e.deltaY;
        
        // Se há deltaX (scroll horizontal nativo) ou deltaY (scroll vertical que queremos converter)
        if (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0) {
          e.preventDefault();
          
          // Usa deltaX se disponível, senão converte deltaY para horizontal
          const scrollAmount = deltaX !== 0 ? deltaX : deltaY;
          
          tabsListRef.current.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
          });
        }
      }
    }
  };

  // Monitora scroll das tabs
  useEffect(() => {
    const tabsList = tabsListRef.current;
    if (tabsList) {
      checkScrollButtons();
      tabsList.addEventListener('scroll', checkScrollButtons);
      
      // Adiciona wheel listener no documento para capturar em qualquer lugar
      document.addEventListener('wheel', handleWheelScroll, { passive: false });
      window.addEventListener('resize', checkScrollButtons);
      
      return () => {
        tabsList.removeEventListener('scroll', checkScrollButtons);
        document.removeEventListener('wheel', handleWheelScroll);
        window.removeEventListener('resize', checkScrollButtons);
      };
    }
  }, [isMobile, availableTabs]);

  // Verifica botões quando as tabs disponíveis mudarem
  useEffect(() => {
    setTimeout(() => {
      checkScrollButtons();
    }, 200);
  }, [availableTabs]);

  useEffect(() => {
    const hash = window.location.hash;
    const tabIndex = hashToTabIndex[hash];
    
    if (tabIndex !== undefined) {
      setCurrentTab(tabIndex);
    } else {
      setCurrentTab(0); // Primeira aba disponível
    }
    
    // Força verificação dos botões após carregar (necessário para inicialização)
    setTimeout(() => {
      checkScrollButtons();
    }, 100);
  }, [hashToTabIndex]);

  const handleTabChange = (newValue) => {
    setCurrentTab(newValue);
    setShowMobileMenu(false);
    const selectedTab = availableTabs[newValue];
    
    if (selectedTab) {
      // Use replace em vez de push para evitar problemas de navegação
      window.history.replaceState(null, '', `${window.location.pathname}${selectedTab.hash}`);
    }

    // Scroll para mostrar a tab ativa em desktop (necessário para UX)
    if (!isMobile && tabsListRef.current) {
      setTimeout(() => {
        const activeButton = tabsListRef.current.children[newValue];
        if (activeButton) {
          activeButton.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
          });
        }
      }, 100);
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

  const currentTabConfig = availableTabs[currentTab];

  return (
    <Layout user={user}>
      <Head>
        <title>Ferramentas - {currentTabConfig?.label || 'OlistHelper'}</title>
        <meta name="description" content={currentTabConfig?.description || 'Ferramentas do OlistHelper'} />
      </Head>

      <div className={`${styles.container} ${routerLoading ? styles.blurred : ''}`}>
        {/* Sistema de Tabs Moderno */}
        <div className={`${styles.tabsWrapper} ${isScrolled ? styles.scrolled : ''}`}>
          {/* Mobile Menu Button */}
          {isMobile && (
            <button 
              className={styles.mobileMenuButton}
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-label="Menu de ferramentas"
            >
              <span className={styles.mobileMenuIcon}>
                {currentTabConfig?.icon && <currentTabConfig.icon />}
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
            <div className={styles.tabsNavigation}>
              {/* Botão Scroll Esquerda */}
              {!isMobile && (
                <button
                  className={`${styles.scrollButton} ${styles.scrollButtonLeft}`}
                  onClick={() => scrollTabs('left')}
                  disabled={!canScrollLeft}
                  aria-label="Rolar tabs para esquerda"
                >
                  <FaChevronLeft />
                </button>
              )}
              
              {/* Lista de Tabs */}
              <div className={`${styles.tabsListWrapper} ${showLeftGradient ? styles.showLeftGradient : ''} ${showRightGradient ? styles.showRightGradient : ''}`}>
                <div className={styles.tabsList} ref={tabsListRef}>
                  {availableTabs.map((tab, index) => (
                    <button
                      key={tab.id}
                      className={`${styles.tabButton} ${currentTab === index ? styles.tabActive : ''}`}
                      onClick={() => handleTabChange(index)}
                      title={tab.description}
                    >
                      <span className={styles.tabIcon}>
                        <tab.icon />
                      </span>
                      <span className={styles.tabLabel}>{tab.label}</span>
                      {currentTab === index && <div className={styles.tabIndicator} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botão Scroll Direita */}
              {!isMobile && (
                <button
                  className={`${styles.scrollButton} ${styles.scrollButtonRight}`}
                  onClick={() => scrollTabs('right')}
                  disabled={!canScrollRight}
                  aria-label="Rolar tabs para direita"
                >
                  <FaChevronRight />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className={styles.tabContent}>
          <div className={styles.tabPanel}>
            {renderTabContent()}
          </div>
        </div>
      </div>
    </Layout>
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

  // Buscar dados completos do usuário incluindo campo admin
  const { getUserWithPermissions } = await import('../utils/supabase/supabaseClient');
  const userData = await getUserWithPermissions(session.id);

  return {
    props: {
      user: {
        ...session.user,
        role: session.role,
        id: session.id,
        admin: userData?.admin || false,
        name: session.user.name,
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