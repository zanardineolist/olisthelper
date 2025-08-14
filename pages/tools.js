import Head from 'next/head';
import { useState, useEffect, useMemo } from 'react';
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
  const { loading: routerLoading } = useLoading();
  const router = useRouter();
  const [selectedHash, setSelectedHash] = useState('');
  
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

  // Sincroniza com o hash via Next Router (inclui navegação por Link)
  useEffect(() => {
    const asPath = router.asPath || '';
    const idx = asPath.indexOf('#');
    const hash = idx >= 0 ? asPath.substring(idx) : '';
    setSelectedHash(hash);
  }, [router.asPath]);

  // Resolve tab atual pelo hash
  const currentTabIndex = useMemo(() => {
    if (!selectedHash) return 0;
    const index = availableTabs.findIndex(t => t.hash === selectedHash);
    return index >= 0 ? index : 0;
  }, [selectedHash, availableTabs]);

  const currentTabConfig = availableTabs[currentTabIndex];
  const renderTabContent = () => {
    if (!currentTabConfig) return null;
    const Component = currentTabConfig.component;
    if (currentTabConfig.id === 'CepIbgeValidator') {
      return (
        <>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Validador CEP</h1>
            <p className={styles.pageDescription}>
              Ferramenta para verificar a correspondência entre a cidade retornada pelos Correios e a nomenclatura oficial do IBGE que é utilizada pela SEFAZ para validação de notas fiscais.
            </p>
          </div>
          <Component />
          <CepIbgeInfo />
        </>
      );
    }
    return <Component user={user} />;
  };

  return (
    <Layout user={user}>
      <Head>
        <title>Ferramentas - {currentTabConfig?.label || 'OlistHelper'}</title>
        <meta name="description" content={currentTabConfig?.description || 'Ferramentas do OlistHelper'} />
      </Head>

      <div className={`${styles.container} ${routerLoading ? styles.blurred : ''}`}>
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