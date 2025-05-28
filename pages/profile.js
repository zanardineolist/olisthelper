// pages/profile.js
import Head from 'next/head';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import styles from '../styles/ProfileSupport.module.css';
import Footer from '../components/Footer';

// Componente para card de performance aprimorado
const PerformanceCard = ({ title, icon, data, type, lastUpdated }) => {
  if (!data) return null;

  const getMetricStatus = (colors, metric) => {
    if (!colors || !colors[metric]) return 'neutral';
    
    const color = colors[metric];
    if (color.includes('green') || color.includes('#779E3D')) return 'excellent';
    if (color.includes('yellow') || color.includes('#F0A028')) return 'good';
    if (color.includes('red') || color.includes('#E64E36')) return 'poor';
    return 'neutral';
  };

  const getOverallStatus = () => {
    const tmaStatus = getMetricStatus(data.colors, 'tma');
    const csatStatus = getMetricStatus(data.colors, 'csat');
    
    if (tmaStatus === 'excellent' && csatStatus === 'excellent') return 'excellent';
    if (tmaStatus === 'poor' || csatStatus === 'poor') return 'poor';
    if (tmaStatus === 'good' || csatStatus === 'good') return 'good';
    return 'neutral';
  };

  const renderMainMetrics = () => {
    const metrics = [];
    
    // Métricas principais por tipo
    if (data.totalChamados !== undefined) {
      metrics.push(
        { 
          label: 'Total Chamados', 
          value: data.totalChamados, 
          icon: 'fa-ticket',
          type: 'primary' 
        },
        { 
          label: 'Média por Dia', 
          value: data.mediaPorDia, 
          icon: 'fa-calendar-day',
          type: 'secondary' 
        }
      );
    }
    
    if (data.totalTelefone !== undefined) {
      metrics.push(
        { 
          label: 'Total Ligações', 
          value: data.totalTelefone, 
          icon: 'fa-phone-volume',
          type: 'primary' 
        },
        { 
          label: 'Perdidas', 
          value: data.perdidas, 
          icon: 'fa-phone-slash',
          type: 'warning' 
        }
      );
    }
    
    if (data.totalChats !== undefined) {
      metrics.push(
        { 
          label: 'Total Conversas', 
          value: data.totalChats, 
          icon: 'fa-message',
          type: 'primary' 
        }
      );
    }

    return metrics;
  };

  const renderKPIMetrics = () => {
    const kpis = [];
    
    if (data.tma !== undefined && data.tma !== null) {
      kpis.push({ 
        label: 'TMA', 
        value: data.tma,
        status: getMetricStatus(data.colors, 'tma'),
        icon: 'fa-stopwatch'
      });
    }
    
    if (data.csat !== undefined && data.csat !== null) {
      kpis.push({ 
        label: 'CSAT', 
        value: data.csat,
        status: data.csat === "-" ? 'neutral' : getMetricStatus(data.colors, 'csat'),
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

// Componente principal
export default function MyPage({ user }) {
  const router = useRouter();
  const [greeting, setGreeting] = useState('');
  const [helpRequests, setHelpRequests] = useState({ currentMonth: 0, lastMonth: 0 });
  const [categoryRanking, setCategoryRanking] = useState([]);
  const [performanceData, setPerformanceData] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  // Configurar saudação baseada no horário
  useEffect(() => {
    const timer = setTimeout(() => {
      const brtDate = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
      const currentHour = new Date(brtDate).getHours();
      let greetingMessage = '';

      if (currentHour >= 5 && currentHour < 12) {
        greetingMessage = 'Bom dia';
      } else if (currentHour >= 12 && currentHour < 18) {
        greetingMessage = 'Boa tarde';
      } else {
        greetingMessage = 'Boa noite';
      }

      setGreeting(greetingMessage);
      setInitialLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Buscar dados do usuário
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [helpResponse, categoryResponse, performanceResponse] = await Promise.all([
          fetch(`/api/get-user-help-requests?userEmail=${user.email}`),
          fetch(`/api/get-user-category-ranking?userEmail=${user.email}`),
          (user.role === 'support' || user.role === 'support+') ? 
            fetch(`/api/get-user-performance?userEmail=${user.email}`) : 
            Promise.resolve({ json: () => null })
        ]);

        const helpData = await helpResponse.json();
        setHelpRequests({
          currentMonth: helpData.currentMonth,
          lastMonth: helpData.lastMonth,
        });

        const categoryData = await categoryResponse.json();
        setCategoryRanking(categoryData.categories || []);

        if (user.role === 'support' || user.role === 'support+') {
          const performanceDataResult = await performanceResponse.json();
          setPerformanceData(performanceDataResult);
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.email) {
      fetchData();
    }
  }, [user.email, user.role]);

  // Loading inicial
  if (initialLoading) {
    return (
      <div className="loaderOverlay">
        <div className="loader"></div>
      </div>
    );
  }

  const firstName = user.name.split(' ')[0];
  const { currentMonth, lastMonth } = helpRequests;
  let percentageChange = 0;

  if (lastMonth > 0) {
    percentageChange = ((currentMonth - lastMonth) / lastMonth) * 100;
  }

  return (
    <>
      <Head>
        <title>Meu Perfil - Support</title>
        <meta name="description" content="Perfil do usuário com métricas e indicadores de solicitações de ajuda" />
      </Head>

      <Navbar user={user} />

      <main className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.greeting}>{greeting}, {firstName}!</h1>
          <p className={styles.subtitle}>Acompanhe suas métricas e solicitações de ajuda</p>
        </header>

        {/* Seção 1: Overview Pessoal */}
        <section className={styles.overviewSection}>
          {/* Card de Perfil Expandido */}
          <div className={styles.profileExpandedCard}>
            <div className={styles.profileMainInfo}>
              <img 
                src={user.image} 
                alt={user.name} 
                className={styles.profileImage} 
              />
              <div className={styles.profileDetails}>
                <h3>{user.name}</h3>
                <p>{user.email}</p>
                <div className={styles.tagsContainer}>
                  {performanceData?.squad && (
                    <div className={styles.tag} style={{ backgroundColor: '#0A4EE4' }}>
                      #{performanceData.squad}
                    </div>
                  )}
                  {performanceData?.chamado && (
                    <div className={styles.tag} style={{ backgroundColor: '#F0A028' }}>
                      #Chamado
                    </div>
                  )}
                  {performanceData?.telefone && (
                    <div className={styles.tag} style={{ backgroundColor: '#E64E36' }}>
                      #Telefone
                    </div>
                  )}
                  {performanceData?.chat && (
                    <div className={styles.tag} style={{ backgroundColor: '#779E3D' }}>
                      #Chat
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Métricas Integradas */}
            <div className={styles.integratedMetrics}>
              <div className={styles.metricItem}>
                <div className={styles.metricIcon}>
                  <i className="fa-solid fa-calendar-days"></i>
                </div>
                <div className={styles.metricData}>
                  <span className={styles.metricValue}>{performanceData?.diasTrabalhados || 0}</span>
                  <span className={styles.metricLabel}>Dias Trabalhados</span>
                  <span className={styles.metricSubtext}>/ {performanceData?.diasUteis || 0} dias úteis</span>
                </div>
              </div>
              
              <div className={styles.metricItem}>
                <div className={styles.metricIcon}>
                  <i className="fa-solid fa-chart-line"></i>
                </div>
                <div className={styles.metricData}>
                  <span className={styles.metricValue}>{performanceData?.absenteismo || 0}%</span>
                  <span className={styles.metricLabel}>Absenteísmo</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Card de Ajudas Solicitadas Expandido */}
          <div className={styles.helpExpandedCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                <i className="fa-solid fa-handshake-angle"></i>
                Ajudas Solicitadas
              </h3>
            </div>
            
            <div className={styles.helpStatsExpanded}>
              <div className={styles.helpStatMain}>
                <div className={styles.helpStatIcon}>
                  <i className="fa-solid fa-calendar"></i>
                </div>
                <div className={styles.helpStatContent}>
                  <span className={styles.helpStatValue}>{currentMonth}</span>
                  <span className={styles.helpStatLabel}>Mês Atual</span>
                </div>
              </div>
              
              <div className={styles.helpStatMain}>
                <div className={styles.helpStatIcon}>
                  <i className="fa-solid fa-calendar-xmark"></i>
                </div>
                <div className={styles.helpStatContent}>
                  <span className={styles.helpStatValue}>{lastMonth}</span>
                  <span className={styles.helpStatLabel}>Mês Anterior</span>
                </div>
              </div>
            </div>

            <div className={styles.trendIndicator}>
              <div className={`${styles.trendValue} ${
                percentageChange > 0 ? styles.positive : 
                percentageChange < 0 ? styles.negative : styles.neutral
              }`}>
                <i className={`fa-solid ${
                  percentageChange > 0 ? 'fa-trending-up' : 
                  percentageChange < 0 ? 'fa-trending-down' : 'fa-minus'
                }`}></i>
                <span>{Math.abs(percentageChange).toFixed(1)}%</span>
              </div>
              <span className={styles.trendLabel}>Variação Mensal</span>
            </div>
          </div>
        </section>

        {/* Seção 2: Indicadores de Performance */}
        {performanceData && (
          <section className={styles.performanceSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <i className="fa-solid fa-chart-bar"></i>
                Indicadores de Performance
              </h2>
              <p className={styles.sectionSubtitle}>
                Período: {performanceData.atualizadoAte || "Data não disponível"}
              </p>
            </div>
            
            <div className={styles.performanceGrid}>
              {performanceData.chamados && (
                <PerformanceCard 
                  title="Indicadores Chamados"
                  icon="fa-headset"
                  data={performanceData.chamados}
                  type="chamados"
                  lastUpdated={performanceData.atualizadoAte}
                />
              )}
              
              {performanceData.telefone && (
                <PerformanceCard 
                  title="Indicadores Telefone"
                  icon="fa-phone"
                  data={performanceData.telefone}
                  type="telefone"
                  lastUpdated={performanceData.atualizadoAte}
                />
              )}
              
              {performanceData.chat && (
                <PerformanceCard 
                  title="Indicadores Chat"
                  icon="fa-comments"
                  data={performanceData.chat}
                  type="chat"
                  lastUpdated={performanceData.atualizadoAte}
                />
              )}
            </div>
          </section>
        )}

        {/* Seção 3: Ranking de Categorias */}
        <section className={styles.categorySection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <i className="fa-solid fa-chart-line"></i>
              Top 10 - Temas de Maior Dúvida
            </h2>
            <p className={styles.sectionSubtitle}>
              Áreas onde você mais solicita ajuda - Oportunidades para aprendizado
            </p>
          </div>
          
          <div className={styles.categoryRanking}>
            <h3 className={styles.categoryTitle}>
              <i className="fa-solid fa-ranking-star"></i>
              Categorias Mais Solicitadas
            </h3>
            {loading ? (
              <div className={styles.loadingContainer}>
                <div className="standardBoxLoader"></div>
                <p>Carregando ranking...</p>
              </div>
            ) : categoryRanking.length > 0 ? (
              <ul className={styles.list}>
                {categoryRanking.map((category, index) => (
                  <li key={index} className={styles.listItem}>
                    <span className={styles.rank}>{index + 1}.</span>
                    <span className={styles.categoryName}>{category.name}</span>
                    <div
                      className={styles.progressBarCategory}
                      style={{
                        width: `${Math.min((category.count / 20) * 100, 100)}%`,
                        backgroundColor: category.count > 10 ? '#F0A028' : '',
                      }}
                    />
                    <span className={styles.count}>
                      {category.count} pedidos de ajuda
                      {category.count > 10 && (
                        <div className={styles.tooltip}>
                          <i
                            className="fa-solid fa-circle-exclamation"
                            style={{ color: '#F0A028', cursor: 'pointer' }}
                            onClick={() => window.open('https://forms.clickup.com/30949570/f/xgg62-18893/6O57E8S7WVNULVS5HO', '_blank')}
                          ></i>
                          <span className={styles.tooltipText}>
                            Você já pediu ajuda para este tema mais de 10 vezes. Que tal agendar um Tiny Class com nossos analistas? Clique no ícone.
                          </span>
                        </div>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.noData}>
                <i className="fa-solid fa-chart-simple"></i>
                <p>Nenhum dado disponível no momento.</p>
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
  if (!session) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }
  
  // Redirecionar usuários com perfil 'quality' para a página dashboard-quality
  if (session.role === 'quality') {
    return {
      redirect: {
        destination: '/dashboard-quality',
        permanent: false,
      },
    };
  }
  
  return {
    props: {
      user: {
        ...session.user,
        role: session.role,
      },
    },
  };
}

