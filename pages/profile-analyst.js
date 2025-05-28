// pages/profile-analyst.js
import Head from 'next/head';
import { getSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import styles from '../styles/ProfileAnalyst.module.css';

// Componente para exibir métricas de trabalho
const WorkMetricsCard = ({ performanceData }) => {
  if (!performanceData) return null;

  const metrics = [
    {
      label: 'Dias Trabalhados',
      value: performanceData.diasTrabalhados || 0,
      subtext: `/ ${performanceData.diasUteis || 0} dias úteis`
    },
    {
      label: 'Absenteísmo',
      value: `${performanceData.absenteismo || 0}%`,
      subtext: null
    },
    {
      label: 'Total RFC',
      value: performanceData.totalRFC || 0,
      subtext: null
    },
    {
      label: 'Total Ajudas',
      value: performanceData.totalAjudas || 0,
      subtext: null
    }
  ];

  return (
    <div className={styles.metricsGrid}>
      {metrics.map((metric, index) => (
        <div key={index} className={styles.metricCard}>
          <span className={styles.metricLabel}>{metric.label}</span>
          <span className={styles.metricValue}>{metric.value}</span>
          {metric.subtext && (
            <span className={styles.metricSubtext}>{metric.subtext}</span>
          )}
        </div>
      ))}
    </div>
  );
};

// Componente para card de ajudas prestadas
const HelpRequestsCard = ({ helpRequests }) => {
  const { currentMonth, lastMonth, today } = helpRequests;
  
  let percentageChange = 0;
  if (lastMonth > 0) {
    percentageChange = ((currentMonth - lastMonth) / lastMonth) * 100;
  }

  const isPositive = percentageChange > 0;
  const formattedPercentage = Math.abs(percentageChange).toFixed(1);

  return (
    <div className={styles.helpCard}>
      <h2 className={styles.cardTitle}>Ajudas Prestadas</h2>
      
      <div className={styles.helpStats}>
        <div className={styles.helpStat}>
          <span className={styles.helpStatValue}>{today}</span>
          <span className={styles.helpStatLabel}>Hoje</span>
        </div>
        <div className={styles.helpStat}>
          <span className={styles.helpStatValue}>{currentMonth}</span>
          <span className={styles.helpStatLabel}>Mês Atual</span>
        </div>
        <div className={styles.helpStat}>
          <span className={styles.helpStatValue}>{lastMonth}</span>
          <span className={styles.helpStatLabel}>Mês Anterior</span>
        </div>
      </div>

      <div className={styles.variationIndicator}>
        <div className={`${styles.variationValue} ${isPositive ? styles.positive : styles.negative}`}>
          <i className={`fa-solid ${isPositive ? 'fa-arrow-up' : 'fa-arrow-down'}`}></i>
          <span>{formattedPercentage}%</span>
        </div>
        <span className={styles.variationLabel}>Variação</span>
      </div>
    </div>
  );
};

// Componente para card de performance
const PerformanceCard = ({ title, data, period }) => {
  if (!data) return null;

  const getMetricClass = (colors, metric) => {
    if (!colors || !colors[metric]) return '';
    
    const color = colors[metric];
    if (color.includes('green') || color.includes('#779E3D')) return 'excellent';
    if (color.includes('yellow') || color.includes('#F0A028')) return 'good';
    if (color.includes('red') || color.includes('#E64E36')) return 'poor';
    return '';
  };

  const renderMetrics = () => {
    const metrics = [];
    
    // Métricas específicas por tipo
    if (data.totalChamados !== undefined) {
      metrics.push(
        { label: 'Total', value: data.totalChamados },
        { label: 'Média/Dia', value: data.mediaPorDia }
      );
    }
    
    if (data.totalTelefone !== undefined) {
      metrics.push(
        { label: 'Total', value: data.totalTelefone },
        { label: 'Perdidas', value: data.perdidas }
      );
    }
    
    if (data.totalChats !== undefined) {
      metrics.push(
        { label: 'Total', value: data.totalChats }
      );
    }
    
    // Métricas comuns
    if (data.tma) {
      metrics.push({ 
        label: 'TMA', 
        value: data.tma,
        className: getMetricClass(data.colors, 'tma')
      });
    }
    
    if (data.csat) {
      metrics.push({ 
        label: 'CSAT', 
        value: data.csat,
        className: getMetricClass(data.colors, 'csat')
      });
    }

    return metrics;
  };

  return (
    <div className={styles.performanceCard}>
      <div className={styles.performanceHeader}>
        <h3 className={styles.performanceTitle}>{title}</h3>
        <span className={styles.performancePeriod}>{period}</span>
      </div>
      
      <div className={styles.performanceMetrics}>
        {renderMetrics().map((metric, index) => (
          <div 
            key={index} 
            className={`${styles.performanceMetric} ${metric.className ? styles[metric.className] : ''}`}
          >
            <span className={styles.performanceMetricLabel}>{metric.label}</span>
            <span className={styles.performanceMetricValue}>{metric.value}</span>
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
        <h3 className={styles.categoryRankingTitle}>Top 10 - Temas mais auxiliados</h3>
        <div className={styles.loadingContainer}>
          <div className="standardBoxLoader"></div>
        </div>
      </div>
    );
  }

  if (!categories.length) {
    return (
      <div className={styles.categoryRanking}>
        <h3 className={styles.categoryRankingTitle}>Top 10 - Temas mais auxiliados</h3>
        <div className={styles.noData}>
          Nenhum dado disponível no momento.
        </div>
      </div>
    );
  }

  const maxCount = categories[0]?.count || 1;

  return (
    <div className={styles.categoryRanking}>
      <h3 className={styles.categoryRankingTitle}>Top 10 - Temas mais auxiliados</h3>
      
      <ul className={styles.categoryList}>
        {categories.map((category, index) => (
          <li key={index} className={styles.categoryItem}>
            <div className={styles.categoryRank}>{index + 1}</div>
            
            <div className={styles.categoryInfo}>
              <h4 className={styles.categoryName}>{category.name}</h4>
              <div className={styles.categoryProgress}>
                <div 
                  className={`${styles.categoryProgressBar} ${category.count > 50 ? styles.warning : ''}`}
                  style={{ width: `${(category.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
            
            <div className={styles.categoryCount}>
              <span>{category.count} ajudas</span>
              {category.count > 50 && (
                <i
                  className={`fa-solid fa-circle-exclamation ${styles.categoryWarning}`}
                  onClick={() => window.open('https://olisterp.wixsite.com/knowledge/inicio', '_blank')}
                  title="Você já ajudou neste tema mais de 50 vezes. Que tal criar um material sobre?"
                />
              )}
            </div>
          </li>
        ))}
      </ul>
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

        {/* Seção 1: Perfil e Estatísticas Principais */}
        <section className={styles.profileSection}>
          <div className={styles.profileCard}>
            <div className={styles.profileHeader}>
              <img 
                src={user.image} 
                alt={user.name} 
                className={styles.profileImage} 
              />
              <div className={styles.profileInfo}>
                <h3>{user.name}</h3>
                <p>{user.email}</p>
                <div 
                  className={`${styles.roleTag} ${user.role === 'tax' ? styles.tax : ''}`}
                >
                  #{user.role === 'analyst' ? 'Analista' : 'Fiscal'}
                </div>
              </div>
            </div>
          </div>
          
          <HelpRequestsCard helpRequests={helpRequests} />
          <WorkMetricsCard performanceData={performanceData} />
        </section>

        {/* Seção 2: Indicadores de Performance */}
        {performanceData && (
          <section className={styles.performanceSection}>
            <h2 className={styles.sectionTitle}>Indicadores de Performance</h2>
            <div className={styles.performanceGrid}>
              {performanceData.chamados && (
                <PerformanceCard 
                  title="Chamados"
                  data={performanceData.chamados}
                  period={performanceData.atualizadoAte || "Data não disponível"}
                />
              )}
              
              {performanceData.telefone && (
                <PerformanceCard 
                  title="Telefone"
                  data={performanceData.telefone}
                  period={performanceData.atualizadoAte || "Data não disponível"}
                />
              )}
              
              {performanceData.chat && (
                <PerformanceCard 
                  title="Chat"
                  data={performanceData.chat}
                  period={performanceData.atualizadoAte || "Data não disponível"}
                />
              )}
            </div>
          </section>
        )}

        {/* Seção 3: Ranking de Categorias */}
        <section className={styles.categorySection}>
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
