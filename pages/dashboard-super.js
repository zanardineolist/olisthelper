// pages/dashboard-super.js
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import { Tabs, Tab, ThemeProvider, createTheme } from '@mui/material';
import DashboardData from '../components/DashboardData';
import GraphData from '../components/GraphData';
import HelpTopicsData from '../components/HelpTopicsData';
import ProgressIndicator from '../components/ProgressIndicator';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Swal from 'sweetalert2';
import styles from '../styles/DashboardSuper.module.css';

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

// Componente para card de performance
const PerformanceCard = ({ title, icon, data, type }) => {
  if (!data) return null;

  const getOverallStatus = () => {
    if (!data.status) return 'neutral';
    
    const statuses = Object.values(data.status);
    if (statuses.every(status => status === 'excellent')) return 'excellent';
    if (statuses.some(status => status === 'poor')) return 'poor';
    if (statuses.some(status => status === 'good')) return 'good';
    return 'neutral';
  };

  const renderMainMetrics = () => {
    const metrics = [];
    
    // Métricas principais por tipo
    if (data.total !== undefined) {
      metrics.push({
        label: type === 'chamados' ? 'Total Chamados' : 
               type === 'telefone' ? 'Total Ligações' : 'Total Conversas',
        value: data.total,
        icon: type === 'chamados' ? 'fa-ticket' : 
              type === 'telefone' ? 'fa-phone-volume' : 'fa-message',
        type: 'primary'
      });
    }
    
    if (data.mediaDia !== undefined) {
      metrics.push({
        label: 'Média por Dia',
        value: data.mediaDia,
        icon: 'fa-calendar-day',
        type: 'secondary'
      });
    }
    
    if (data.perdidas !== undefined) {
      metrics.push({
        label: 'Perdidas',
        value: data.perdidas,
        icon: 'fa-phone-slash',
        type: 'warning'
      });
    }

    return metrics;
  };

  const renderKPIMetrics = () => {
    const kpis = [];
    
    if (data.tma !== undefined && data.tma !== null) {
      kpis.push({ 
        label: 'TMA', 
        value: data.tma,
        status: data.status?.tma || 'neutral',
        icon: 'fa-stopwatch'
      });
    }
    
    if (data.csat !== undefined && data.csat !== null) {
      kpis.push({ 
        label: 'CSAT', 
        value: data.csat,
        status: data.csat === "-" ? 'neutral' : (data.status?.csat || 'neutral'),
        icon: 'fa-heart'
      });
    }

    return kpis;
  };

  const overallStatus = getOverallStatus();

  return (
    <div className={`${styles.performanceCard} ${styles[overallStatus]}`}>
      <div className={styles.performanceCardHeader}>
        <div className={styles.performanceIcon}>
          <i className={`fa-solid ${icon}`}></i>
        </div>
        <div className={styles.performanceTitleSection}>
          <h3 className={styles.performanceTitle}>{title}</h3>
          <div className={`${styles.statusIndicator} ${styles[overallStatus]}`}>
            <i className={`fa-solid ${
              overallStatus === 'excellent' ? 'fa-circle-check' :
              overallStatus === 'good' ? 'fa-circle-minus' :
              overallStatus === 'poor' ? 'fa-circle-xmark' : 'fa-circle'
            }`}></i>
            <span>
              {overallStatus === 'excellent' ? 'Excelente' :
               overallStatus === 'good' ? 'Bom' :
               overallStatus === 'poor' ? 'Atenção' : 'Normal'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Métricas Principais */}
      <div className={styles.mainMetrics}>
        {renderMainMetrics().map((metric, index) => (
          <div key={index} className={`${styles.mainMetric} ${styles[metric.type]}`}>
            <div className={styles.mainMetricIcon}>
              <i className={`fa-solid ${metric.icon}`}></i>
            </div>
            <div className={styles.mainMetricData}>
              <span className={styles.mainMetricValue}>{metric.value}</span>
              <span className={styles.mainMetricLabel}>{metric.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* KPIs com Status */}
      <div className={styles.kpiMetrics}>
        {renderKPIMetrics().map((kpi, index) => (
          <div key={index} className={`${styles.kpiMetric} ${styles[kpi.status]}`}>
            <div className={styles.kpiIcon}>
              <i className={`fa-solid ${kpi.icon}`}></i>
            </div>
            <div className={styles.kpiData}>
              <span className={styles.kpiValue}>{kpi.value}</span>
              <span className={styles.kpiLabel}>{kpi.label}</span>
            </div>
            <div className={`${styles.kpiStatus} ${styles[kpi.status]}`}>
              <i className={`fa-solid ${
                kpi.status === 'excellent' ? 'fa-thumbs-up' :
                kpi.status === 'good' ? 'fa-thumbs-up' :
                kpi.status === 'poor' ? 'fa-thumbs-down' : 'fa-minus'
              }`}></i>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function DashboardSuper({ user }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [greeting, setGreeting] = useState('');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [performanceData, setPerformanceData] = useState(null);
  const [performanceLoading, setPerformanceLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Definir a saudação com base na hora do dia
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 18) {
      setGreeting('Boa tarde');
    } else if (hour >= 18) {
      setGreeting('Boa noite');
    } else {
      setGreeting('Bom dia');
    }
  }, []);

  useEffect(() => {
    // Carregar lista de usuários ao montar o componente
    const loadUsers = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/get-users');
        if (!res.ok) throw new Error('Erro ao carregar usuários');
        const data = await res.json();
        setUsers(data.users.filter(user => ['analyst', 'tax'].includes(user.role.toLowerCase())));
      } catch (err) {
        console.error('Erro ao carregar usuários:', err);
        Swal.fire('Erro', 'Erro ao carregar usuários.', 'error');
      } finally {
        setLoading(false);
      }
    };

    // Carregar dados de performance do usuário
    const loadPerformanceData = async () => {
      if (user.role === 'support' || user.role === 'support+') {
        try {
          setPerformanceLoading(true);
          const response = await fetch(`/api/get-user-performance?userEmail=${user.email}`);
          if (response.ok) {
            const data = await response.json();
            setPerformanceData(data);
          }
        } catch (error) {
          console.error('Erro ao carregar dados de performance:', error);
        } finally {
          setPerformanceLoading(false);
        }
      } else {
        setPerformanceLoading(false);
      }
    };

    loadUsers();
    loadPerformanceData();

    // Simulando um pequeno atraso para exibir o loader
    setTimeout(() => {
      const hash = window.location.hash;
      if (hash === '#Dashboard') {
        setCurrentTab(0);
      } else if (hash === '#DataChart') {
        setCurrentTab(1);
      } else if (hash === '#HelpTopics') {
        setCurrentTab(2);
      }
    }, 500);
  }, [user.email, user.role]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    let hash = '';
    switch (newValue) {
      case 0:
        hash = '#Dashboard';
        break;
      case 1:
        hash = '#DataChart';
        break;
      case 2:
        hash = '#HelpTopics';
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
        <title>Dashboard Supervisor</title>
        <meta name="description" content="Painel de controle para supervisores visualizarem métricas de desempenho" />
      </Head>

      <Navbar user={user} />

      <main className={styles.dashboardMain}>
        {/* Header da página */}
        <header className={styles.pageHeader}>
          <div className={styles.headerContent}>
            <div className={styles.welcomeSection}>
              <div className={styles.greetingText}>
                {greeting}, <span className={styles.userName}>{user.name.split(' ')[0]}</span>
              </div>
              <p className={styles.dashboardSubtitle}>
                Bem-vindo ao seu painel de controle. Aqui você pode monitorar o desempenho da sua equipe.
              </p>
            </div>
            
            <div className={styles.profileSection}>
              <div className={styles.profileCard}>
                <img src={user.image} alt={user.name} className={styles.profileImage} />
                <div className={styles.profileInfo}>
                  <h2 className={styles.profileName}>{user.name}</h2>
                  <p className={styles.profileEmail}>{user.email}</p>
                  <span className={styles.roleBadge}>
                    <i className="fa-solid fa-crown"></i>
                    Supervisor
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Sistema de navegação por abas */}
        <section className={styles.navigationSection}>
          <ThemeProvider theme={theme}>
            <div className={styles.tabsContainer}>
              <Tabs 
                value={currentTab} 
                onChange={handleTabChange} 
                variant="fullWidth"
                aria-label="Dashboard navigation tabs"
              >
                <Tab label="Dashboard Individual" />
                <Tab label="Comparativo de Equipe" />
                <Tab label="Temas de Dúvidas" />
              </Tabs>
            </div>
          </ThemeProvider>
        </section>

        {/* Conteúdo das abas */}
        <section className={styles.contentSection}>
          <div className={styles.tabContent}>
            {currentTab === 0 && (
              <div className={styles.tabPanel}>
                <DashboardData user={user} />
                
                {/* Seção: Progresso da Meta */}
                {(user.role === 'support' || user.role === 'support+') && (
                  <section className={styles.progressSection}>
                    <div className={styles.sectionHeader}>
                      <h2 className={styles.sectionTitle}>
                        <i className="fa-solid fa-bullseye"></i>
                        Progresso da Meta
                      </h2>
                    </div>
                    {performanceLoading ? (
                      <div className={styles.loadingContainer}>
                        <div className="standardBoxLoader"></div>
                      </div>
                    ) : performanceData ? (
                      <>
                        {/* Progresso de Chamados */}
                        {performanceData.chamados && (
                          <ProgressIndicator
                            current={performanceData.chamados.total || 0}
                            target={performanceData.chamados.target?.quantity || 600}
                            type="chamados"
                          />
                        )}
                        
                        {/* Progresso de Chat se for o único canal */}
                        {!performanceData.chamados && performanceData.chat && (
                          <ProgressIndicator
                            current={performanceData.chat.total || 0}
                            target={performanceData.chat.target?.quantity || 32}
                            type="chat"
                          />
                        )}
                      </>
                    ) : null}
                  </section>
                )}

                {/* Seção: Indicadores de Performance */}
                {(user.role === 'support' || user.role === 'support+') && (
                  <section className={styles.performanceSection}>
                    <div className={styles.sectionHeader}>
                      <h2 className={styles.sectionTitle}>
                        <i className="fa-solid fa-chart-bar"></i>
                        Indicadores de Performance
                      </h2>
                      {!performanceLoading && performanceData && (
                        <p className={styles.sectionSubtitle}>
                          Período: {performanceData.atualizadoAte || "Data não disponível"}
                        </p>
                      )}
                    </div>
                    
                    {performanceLoading ? (
                      <div className={styles.loadingContainer}>
                        <div className="standardBoxLoader"></div>
                      </div>
                    ) : performanceData ? (
                      <div className={styles.performanceGrid}>
                        {performanceData.chamados && (
                          <PerformanceCard 
                            title="Indicadores Chamados"
                            icon="fa-headset"
                            data={performanceData.chamados}
                            type="chamados"
                          />
                        )}
                        
                        {performanceData.telefone && (
                          <PerformanceCard 
                            title="Indicadores Telefone"
                            icon="fa-phone"
                            data={performanceData.telefone}
                            type="telefone"
                          />
                        )}
                        
                        {performanceData.chat && (
                          <PerformanceCard 
                            title="Indicadores Chat"
                            icon="fa-comments"
                            data={performanceData.chat}
                            type="chat"
                          />
                        )}
                      </div>
                    ) : null}
                  </section>
                )}
              </div>
            )}
            
            {currentTab === 1 && (
              <div className={styles.tabPanel}>
                <GraphData users={users} />
              </div>
            )}
            
            {currentTab === 2 && (
              <div className={styles.tabPanel}>
                <HelpTopicsData />
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session || session.role !== 'super') {
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