// pages/profile-analyst.js
import Head from 'next/head';
import { getSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import styles from '../styles/ProfileAnalyst.module.css';



// Componente para card de performance aprimorado
const PerformanceCard = ({ title, icon, data, type }) => {
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
    
    if (data.tma) {
      kpis.push({ 
        label: 'TMA', 
        value: data.tma,
        status: getMetricStatus(data.colors, 'tma'),
        icon: 'fa-stopwatch'
      });
    }
    
    if (data.csat) {
      kpis.push({ 
        label: 'CSAT', 
        value: data.csat,
        status: getMetricStatus(data.colors, 'csat'),
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

// Componente para ranking de categorias
const CategoryRanking = ({ categories, loading }) => {
  if (loading) {
    return (
      <div className={styles.categoryRanking}>
        <div className={styles.loadingContainer}>
          <div className="standardBoxLoader"></div>
          <p>Carregando ranking...</p>
        </div>
      </div>
    );
  }

  if (!categories.length) {
    return (
      <div className={styles.categoryRanking}>
        <div className={styles.emptyState}>
          <i className="fa-solid fa-chart-simple"></i>
          <p>Nenhum dado disponível no momento.</p>
        </div>
      </div>
    );
  }

  const maxCount = categories[0]?.count || 1;

  const getRankIcon = (index) => {
    if (index === 0) return 'fa-trophy';
    if (index === 1) return 'fa-medal';
    if (index === 2) return 'fa-award';
    return 'fa-circle';
  };

  const getRankClass = (index) => {
    if (index === 0) return 'first';
    if (index === 1) return 'second';
    if (index === 2) return 'third';
    return 'other';
  };

  return (
    <div className={styles.categoryRanking}>
      <div className={styles.categoryGrid}>
        {categories.map((category, index) => (
          <div 
            key={index} 
            className={`${styles.categoryCard} ${styles[getRankClass(index)]}`}
          >
            <div className={styles.categoryCardHeader}>
              <div className={`${styles.rankBadge} ${styles[getRankClass(index)]}`}>
                <i className={`fa-solid ${getRankIcon(index)}`}></i>
                <span className={styles.rankNumber}>#{index + 1}</span>
              </div>
              <div className={styles.categoryCardTitle}>
                <h4 className={styles.categoryName}>{category.name}</h4>
              </div>
            </div>
            
            <div className={styles.categoryStats}>
              <div className={styles.primaryStat}>
                <div className={styles.statIcon}>
                  <i className="fa-solid fa-chart-bar"></i>
                </div>
                <div className={styles.statData}>
                  <span className={styles.statValue}>{category.count}</span>
                  <span className={styles.statLabel}>Ajudas</span>
                </div>
              </div>
              
              <div className={styles.progressSection}>
                <div className={styles.categoryProgress}>
                  <div 
                    className={`${styles.categoryProgressBar} ${styles[getRankClass(index)]}`}
                    style={{ width: `${(category.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className={styles.progressPercentage}>
                  {Math.round((category.count / maxCount) * 100)}%
                </span>
              </div>
            </div>

            {category.count > 50 && (
              <div className={styles.warningBadge}>
                <i
                  className="fa-solid fa-lightbulb"
                  onClick={() => window.open('https://olisterp.wixsite.com/knowledge/inicio', '_blank')}
                  title="Você já ajudou neste tema mais de 50 vezes. Que tal criar um material sobre?"
                />
                <span>Material?</span>
              </div>
            )}

            {index < 3 && (
              <div className={styles.podiumHighlight}>
                <i className={`fa-solid ${
                  index === 0 ? 'fa-crown' : 
                  index === 1 ? 'fa-star' : 'fa-gem'
                }`}></i>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Componente principal
export default function ProfileAnalystPage({ user }) {
  const [greeting, setGreeting] = useState('');
  const [helpRequests, setHelpRequests] = useState({ currentMonth: 0, lastMonth: 0, today: 0 });
  const [performanceData, setPerformanceData] = useState(null);
  const [categoryRanking, setCategoryRanking] = useState([]);
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
    const fetchUserData = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      
      try {
        const [helpResponse, categoryResponse, performanceResponse] = await Promise.all([
          fetch(`/api/get-analyst-records?analystId=${user.id}&mode=profile&filter=1`),
          fetch(`/api/get-category-ranking?analystId=${user.id}`),
          (user.role === 'analyst' || user.role === 'tax') ? 
            fetch(`/api/get-user-performance?userEmail=${user.email}`) : 
            Promise.resolve({ json: () => null })
        ]);

        if (!helpResponse.ok || !categoryResponse.ok) {
          throw new Error('Erro ao buscar dados do analista.');
        }

        // Processar dados de ajudas
        const helpData = await helpResponse.json();
        setHelpRequests({
          currentMonth: helpData.currentMonth,
          lastMonth: helpData.lastMonth,
          today: helpData.today
        });

        // Processar ranking de categorias
        const categoryData = await categoryResponse.json();
        setCategoryRanking(categoryData.categories || []);

        // Processar dados de performance
        if (user.role === 'analyst' || user.role === 'tax') {
          const performanceDataResult = await performanceResponse.json();
          setPerformanceData({
            ...performanceDataResult,
            totalAjudas: helpData.currentMonth
          });
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user.id, user.email, user.role]);

  // Loading inicial
  if (initialLoading) {
    return (
      <div className="loaderOverlay">
        <div className="loader"></div>
      </div>
    );
  }

  const firstName = user.name.split(' ')[0];

  return (
    <>
      <Head>
        <title>Meu Perfil - Analista</title>
        <meta name="description" content="Perfil do analista com métricas e indicadores de performance" />
      </Head>

      <Navbar user={user} />

      <main className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.greeting}>{greeting}, {firstName}!</h1>
          <p className={styles.subtitle}>Acompanhe suas métricas e performance</p>
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
                <div 
                  className={`${styles.roleTag} ${user.role === 'tax' ? styles.tax : ''}`}
                >
                  <i className="fa-solid fa-user-tie"></i>
                  {user.role === 'analyst' ? 'Analista' : 'Fiscal'}
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
              
              <div className={styles.metricItem}>
                <div className={styles.metricIcon}>
                  <i className="fa-solid fa-ticket"></i>
                </div>
                <div className={styles.metricData}>
                  <span className={styles.metricValue}>{performanceData?.totalRFC || 0}</span>
                  <span className={styles.metricLabel}>Total RFC</span>
                </div>
              </div>
              
              <div className={styles.metricItem}>
                <div className={styles.metricIcon}>
                  <i className="fa-solid fa-handshake-angle"></i>
                </div>
                <div className={styles.metricData}>
                  <span className={styles.metricValue}>{helpRequests.currentMonth}</span>
                  <span className={styles.metricLabel}>Total Ajudas</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Card de Ajudas Prestadas Expandido */}
          <div className={styles.helpExpandedCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                <i className="fa-solid fa-heart-hand"></i>
                Ajudas Prestadas
              </h3>
            </div>
            
            <div className={styles.helpStatsExpanded}>
              <div className={styles.helpStatMain}>
                <div className={styles.helpStatIcon}>
                  <i className="fa-solid fa-calendar-day"></i>
                </div>
                <div className={styles.helpStatContent}>
                  <span className={styles.helpStatValue}>{helpRequests.today}</span>
                  <span className={styles.helpStatLabel}>Hoje</span>
                </div>
              </div>
              
              <div className={styles.helpStatMain}>
                <div className={styles.helpStatIcon}>
                  <i className="fa-solid fa-calendar-month"></i>
                </div>
                <div className={styles.helpStatContent}>
                  <span className={styles.helpStatValue}>{helpRequests.currentMonth}</span>
                  <span className={styles.helpStatLabel}>Mês Atual</span>
                </div>
              </div>
              
              <div className={styles.helpStatMain}>
                <div className={styles.helpStatIcon}>
                  <i className="fa-solid fa-calendar-xmark"></i>
                </div>
                <div className={styles.helpStatContent}>
                  <span className={styles.helpStatValue}>{helpRequests.lastMonth}</span>
                  <span className={styles.helpStatLabel}>Mês Anterior</span>
                </div>
              </div>
            </div>

            <div className={styles.trendIndicator}>
              <div className={`${styles.trendValue} ${(() => {
                const percentageChange = helpRequests.lastMonth > 0 ? 
                  ((helpRequests.currentMonth - helpRequests.lastMonth) / helpRequests.lastMonth) * 100 : 0;
                return percentageChange > 0 ? styles.positive : percentageChange < 0 ? styles.negative : styles.neutral;
              })()}`}>
                <i className={`fa-solid ${(() => {
                  const percentageChange = helpRequests.lastMonth > 0 ? 
                    ((helpRequests.currentMonth - helpRequests.lastMonth) / helpRequests.lastMonth) * 100 : 0;
                  return percentageChange > 0 ? 'fa-trending-up' : percentageChange < 0 ? 'fa-trending-down' : 'fa-minus';
                })()}`}></i>
                <span>
                  {helpRequests.lastMonth > 0 ? 
                    Math.abs(((helpRequests.currentMonth - helpRequests.lastMonth) / helpRequests.lastMonth) * 100).toFixed(1) : 
                    '0.0'
                  }%
                </span>
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
                  title="Chamados"
                  icon="fa-headset"
                  data={performanceData.chamados}
                  type="chamados"
                />
              )}
              
              {performanceData.telefone && (
                <PerformanceCard 
                  title="Telefone"
                  icon="fa-phone"
                  data={performanceData.telefone}
                  type="telefone"
                />
              )}
              
              {performanceData.chat && (
                <PerformanceCard 
                  title="Chat"
                  icon="fa-comments"
                  data={performanceData.chat}
                  type="chat"
                />
              )}
            </div>
          </section>
        )}

        {/* Seção 3: Ranking de Categorias */}
        <section className={styles.categorySection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <i className="fa-solid fa-trophy"></i>
              Ranking de Categorias
            </h2>
            <p className={styles.sectionSubtitle}>
              Performance por categoria de atendimento
            </p>
          </div>
          <CategoryRanking 
            categories={categoryRanking} 
            loading={loading} 
          />
        </section>
      </main>

      <Footer />
    </>
  );
}

// Verificação de autenticação e autorização
export async function getServerSideProps(context) {
  const session = await getSession(context);
  
  if (!session || (session.role !== 'analyst' && session.role !== 'tax')) {
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
