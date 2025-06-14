// pages/profile-analyst.js
import Head from 'next/head';
import { getSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { ThreeDotsLoader, useLoading } from '../components/LoadingIndicator';
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
    
    // Coletar todos os status válidos (não neutros)
    const statuses = [];
    if (tmaStatus && tmaStatus !== 'neutral') statuses.push(tmaStatus);
    if (csatStatus && csatStatus !== 'neutral') statuses.push(csatStatus);
    
    if (statuses.length === 0) return 'neutral';
    
    // Contar cada tipo de status
    const statusCounts = statuses.reduce((acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    const total = statuses.length;
    const excellentCount = statusCounts.excellent || 0;
    const goodCount = statusCounts.good || 0;
    const poorCount = statusCounts.poor || 0;
    
    // Se todas as métricas são "excellent" → verde
    if (excellentCount === total) return 'excellent';
    
    // Se mais de 50% das métricas são "poor" → vermelho (crítico)
    if (poorCount > total / 2) return 'poor';
    
    // Se há mix de métricas ou equilíbrio → amarelo (atenção moderada)
    if (poorCount > 0 || goodCount > 0 || excellentCount > 0) return 'good';
    
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
          label: 'Média por Dia', 
          value: data.mediaPorDia, 
          icon: 'fa-calendar-day',
          type: 'secondary' 
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
        },
        { 
          label: 'Média por Dia', 
          value: data.mediaPorDia, 
          icon: 'fa-calendar-day',
          type: 'secondary' 
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

// Componente para ranking de categorias
const CategoryRanking = ({ categories, loading }) => {

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

  // Calcular total de ajudas para a barra de progresso
  const totalHelpRequests = categories.reduce((sum, category) => sum + category.count, 0);

  const getAttentionIcon = (index, count) => {
    if (count > 50) return 'fa-exclamation-triangle';
    if (count > 30) return 'fa-exclamation-circle';
    if (count > 15) return 'fa-info-circle';
    return 'fa-circle-dot';
  };

  const getAttentionClass = (index, count) => {
    if (count > 50) return 'critical';
    if (count > 30) return 'high';
    if (count > 15) return 'medium';
    return 'low';
  };

  const getTooltipMessage = (count) => {
    if (count > 50) {
      return "⚠️ Atenção Crítica: Esta categoria tem muitas solicitações! Considere criar materiais de treinamento, tutoriais ou documentação específica para reduzir a demanda e aumentar a autonomia dos usuários.";
    }
    if (count > 30) {
      return "💡 Oportunidade de Melhoria: Esta categoria está recebendo bastante demanda. Criar um material educativo pode ajudar a reduzir futuras solicitações e melhorar a experiência dos usuários.";
    }
    return "";
  };

  return (
    <div className={styles.categoryRanking}>
      <div className={styles.categoryGrid}>
        {categories.map((category, index) => {
          const progressPercentage = Math.round((category.count / totalHelpRequests) * 100);
          const tooltipMessage = getTooltipMessage(category.count);
          
          return (
            <div 
              key={index} 
              className={`${styles.categoryCard} ${styles[getAttentionClass(index, category.count)]}`}
              title={tooltipMessage}
            >
              <div className={styles.categoryCardHeader}>
                <div className={`${styles.attentionBadge} ${styles[getAttentionClass(index, category.count)]}`}>
                  <i className={`fa-solid ${getAttentionIcon(index, category.count)}`}></i>
                  <span className={styles.rankNumber}>#{index + 1}</span>
                </div>
                <div className={styles.categoryCardTitle}>
                  <h4 className={styles.categoryName}>{category.name}</h4>
                  <span className={styles.attentionLevel}>
                    {category.count > 50 ? 'Atenção Crítica' : 
                     category.count > 30 ? 'Atenção Alta' : 
                     category.count > 15 ? 'Atenção Média' : 'Atenção Baixa'}
                  </span>
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
                      className={`${styles.categoryProgressBar} ${styles[getAttentionClass(index, category.count)]}`}
                      style={{ width: `${progressPercentage}%` }}
                      title={`Esta categoria representa ${progressPercentage}% do total de ${totalHelpRequests} ajudas prestadas`}
                    />
                  </div>
                  <span 
                    className={styles.progressPercentage}
                    title={`${progressPercentage}% do total de ajudas`}
                  >
                    {progressPercentage}%
                  </span>
                </div>
              </div>

              {category.count > 50 && (
                <div 
                  className={styles.actionBadge}
                  title="Clique para acessar a base de conhecimento e criar materiais"
                >
                  <i
                    className="fa-solid fa-lightbulb"
                    onClick={() => window.open('https://olisterp.wixsite.com/knowledge/inicio', '_blank')}
                  />
                  <span>Criar Material</span>
                </div>
              )}
            </div>
          );
        })}
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
  const [loading, setLoading] = useState(true);
  
  // Hook para detectar loading do router
  const { isLoading: routerLoading } = useLoading();

  // Configurar saudação baseada no horário
  useEffect(() => {
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



  const firstName = user.name.split(' ')[0];

  return (
    <Layout user={user}>
      <Head>
        <title>Meu Perfil - Analista</title>
        <meta name="description" content="Perfil do analista com métricas e indicadores de performance" />
      </Head>

      <div className={`${styles.container} ${routerLoading ? styles.blurred : ''}`}>
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
                <div className={styles.profileTags}>
                  <div 
                    className={`${styles.roleTag} ${user.role === 'tax' ? styles.tax : ''}`}
                  >
                    <i className="fa-solid fa-user-tie"></i>
                    {user.role === 'analyst' ? 'Analista' : 'Fiscal'}
                  </div>
                  {performanceData?.supervisor && (
                    <div className={styles.supervisorTag}>
                      <i className="fa-solid fa-user-gear"></i>
                      {performanceData.supervisor}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Métricas Integradas */}
            <div className={styles.integratedMetrics}>
              {/* Período de Referência */}
              {performanceData && (
                              <div className={styles.periodInfo} style={{ 
                padding: '8px 12px', 
                backgroundColor: 'rgba(240, 160, 40, 0.1)', 
                borderRadius: '6px',
                textAlign: 'center'
              }}>
                  <span style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: '600',
                    color: '#F0A028'
                  }}>
                    <i className="fa-solid fa-calendar-range" style={{ marginRight: '6px' }}></i>
                    {performanceData.atualizadoAte || "Data não disponível"}
                  </span>
                </div>
              )}
              
              {/* Linha 1: Dias trabalhados | Absenteísmo | Nota qualidade */}
              <div className={styles.metricsRowThree}>
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
                    <i className="fa-solid fa-star"></i>
                  </div>
                  <div className={styles.metricData}>
                    <span className={styles.metricValue}>{performanceData?.nota_qualidade || '-'}</span>
                    <span className={styles.metricLabel}>Nota Qualidade</span>
                  </div>
                </div>
              </div>
              
              {/* Linha 2: RFC | Total de Ajudas */}
              <div className={styles.metricsRowTwo}>
                <div className={styles.metricItem}>
                  <div className={styles.metricIcon}>
                    <i className="fa-solid fa-clipboard-check"></i>
                  </div>
                  <div className={styles.metricData}>
                    <span className={styles.metricValue}>{performanceData?.rfc || '-'}</span>
                    <span className={styles.metricLabel}>RFC</span>
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
                  <i className="fa-solid fa-calendar"></i>
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



        {/* Seção 2: Ranking de Categorias */}
        <section className={styles.categorySection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <i className="fa-solid fa-chart-line"></i>
              Categorias Mais Solicitadas
            </h2>
            {!loading && (
              <p className={styles.sectionSubtitle}>
                Áreas onde você recebe mais pedidos de ajuda - Oportunidades para criação de materiais
              </p>
            )}
          </div>
          
          {loading ? (
            <ThreeDotsLoader message="Carregando categorias..." />
          ) : (
            <CategoryRanking 
              categories={categoryRanking} 
              loading={false} 
            />
          )}
        </section>
      </div>
    </Layout>
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
