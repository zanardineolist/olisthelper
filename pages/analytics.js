import { useState, useEffect } from 'react';
import { getSession } from 'next-auth/react';
import Head from 'next/head';
import Layout from '../components/Layout';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import styles from '../styles/Analytics.module.css';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function Analytics({ user }) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [systemStatus, setSystemStatus] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  // Carregar dados de analytics com nova API otimizada
  const fetchAnalyticsData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const refreshParam = forceRefresh ? '&refresh=true' : '';
      const response = await fetch(`/api/analytics/dashboard-data-v2?period=${period}${refreshParam}`);
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
        setSystemStatus('v2_working');
        console.log('✅ Analytics data loaded:', {
          period: data.metadata?.period,
          generated: data.metadata?.generated_at,
          cacheKey: data.metadata?.cache_key
        });
      } else {
        console.error('Erro ao carregar analytics:', response.statusText);
        setSystemStatus('error');
        // Tentar obter informações de debug
        fetchDebugInfo();
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      setSystemStatus('error');
      fetchDebugInfo();
    } finally {
      setLoading(false);
    }
  };

  // Buscar informações de debug do sistema
  const fetchDebugInfo = async () => {
    try {
      const response = await fetch('/api/analytics/debug');
      if (response.ok) {
        const debug = await response.json();
        setDebugInfo(debug);
        setSystemStatus(debug.system_status);
        console.log('🔍 Debug info:', debug);
      }
    } catch (error) {
      console.error('Erro ao buscar debug info:', error);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [period]);

  // Auto refresh a cada 5 minutos
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAnalyticsData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, period]);

  // Configuração do gráfico de atividade por hora
  const hourlyActivityChart = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: 'Atividade por Hora',
        data: analyticsData?.activityByHour?.map(h => h.count) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  // Configuração do gráfico de sessões diárias
  const dailySessionsChart = {
    labels: analyticsData?.dailySessions?.map(d => 
      new Date(d.date).toLocaleDateString('pt-BR')
    ) || [],
    datasets: [
      {
        label: 'Sessões por Dia',
        data: analyticsData?.dailySessions?.map(d => d.count) || [],
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1,
      },
    ],
  };

  // Configuração do gráfico de páginas mais visitadas
  const topPagesChart = {
    labels: analyticsData?.topPages?.slice(0, 8)?.map(p => 
      p.page_path.replace('/', '').replace(/[^a-zA-Z0-9]/g, ' ') || 'Home'
    ) || [],
    datasets: [
      {
        data: analyticsData?.topPages?.slice(0, 8)?.map(p => p.count) || [],
        backgroundColor: [
          '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
          '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'
        ],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  return (
    <>
      <Head>
        <title>Analytics - Olist Helper</title>
      </Head>

      <Layout user={user}>
        <div className={styles.analyticsContainer}>
          <div className={styles.header}>
            <h1 className={styles.title}>
              <i className="fas fa-chart-line"></i>
              Analytics & Métricas
            </h1>
            
            <div className={styles.controls}>
              <select 
                value={period} 
                onChange={(e) => setPeriod(e.target.value)}
                className={styles.periodSelect}
              >
                <option value="1d">Último dia</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="90d">Últimos 90 dias</option>
              </select>

              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`${styles.autoRefreshBtn} ${autoRefresh ? styles.active : ''}`}
              >
                <i className={`fas ${autoRefresh ? 'fa-pause' : 'fa-play'}`}></i>
                Auto Refresh
              </button>

              <button
                onClick={() => fetchAnalyticsData(false)}
                className={styles.refreshBtn}
                disabled={loading}
              >
                <i className={`fas fa-sync-alt ${loading ? styles.spinning : ''}`}></i>
                Atualizar
              </button>

              <button
                onClick={() => fetchAnalyticsData(true)}
                className={styles.forceRefreshBtn}
                disabled={loading}
                title="Atualizar com refresh completo dos dados"
              >
                <i className={`fas fa-database ${loading ? styles.spinning : ''}`}></i>
                Force Refresh
              </button>

              <button
                onClick={fetchDebugInfo}
                className={styles.debugBtn}
                title="Verificar status do sistema"
              >
                <i className="fas fa-bug"></i>
                Debug
              </button>
            </div>
          </div>

          {/* Status do Sistema */}
          {systemStatus && systemStatus !== 'v2_working' && (
            <div className={styles.systemStatusCard}>
              <div className={styles.statusHeader}>
                <i className={`fas ${systemStatus === 'v2_not_installed' ? 'fa-exclamation-triangle' : 'fa-info-circle'}`}></i>
                <span>Status do Sistema Analytics</span>
              </div>
              
              {systemStatus === 'v2_not_installed' && (
                <div className={styles.statusContent}>
                  <p><strong>⚠️ Sistema V2 não instalado</strong></p>
                  <p>O sistema está funcionando em modo de compatibilidade (V1).</p>
                  <p>Para melhor performance, execute o script de instalação V2:</p>
                  <code>analytics_install.sql</code>
                </div>
              )}

              {systemStatus === 'v2_unavailable' && (
                <div className={styles.statusContent}>
                  <p><strong>🔄 Sistema V2 indisponível</strong></p>
                  <p>Usando fallback V1. Algumas funções podem estar limitadas.</p>
                  {debugInfo?.recommendations && (
                    <ul>
                      {debugInfo.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {debugInfo?.errors?.length > 0 && (
                <div className={styles.errorsList}>
                  <h4>Erros detectados:</h4>
                  <ul>
                    {debugInfo.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {loading && !analyticsData ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Carregando dados de analytics...</p>
            </div>
          ) : (
            <>
              {/* Cards de resumo */}
              <div className={styles.summaryCards}>
                <div className={styles.card}>
                  <div className={styles.cardIcon}>
                    <i className="fas fa-users"></i>
                  </div>
                  <div className={styles.cardContent}>
                    <h3>Usuários Online</h3>
                    <p className={styles.cardValue}>
                      {analyticsData?.summary?.onlineUsers || 0}
                    </p>
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardIcon}>
                    <i className="fas fa-user-check"></i>
                  </div>
                  <div className={styles.cardContent}>
                    <h3>Total de Usuários</h3>
                    <p className={styles.cardValue}>
                      {analyticsData?.summary?.totalUsers || 0}
                    </p>
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardIcon}>
                    <i className="fas fa-eye"></i>
                  </div>
                  <div className={styles.cardContent}>
                    <h3>Page Views</h3>
                    <p className={styles.cardValue}>
                      {analyticsData?.summary?.totalPageViews || 0}
                    </p>
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardIcon}>
                    <i className="fas fa-clock"></i>
                  </div>
                  <div className={styles.cardContent}>
                    <h3>Tempo Médio de Sessão</h3>
                    <p className={styles.cardValue}>
                      {formatDuration(analyticsData?.summary?.averageSessionDuration || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Gráficos */}
              <div className={styles.chartsGrid}>
                <div className={styles.chartCard}>
                  <h3>Atividade por Hora do Dia</h3>
                  <div className={styles.chartContainer}>
                    <Line data={hourlyActivityChart} options={chartOptions} />
                  </div>
                </div>

                <div className={styles.chartCard}>
                  <h3>Sessões por Dia</h3>
                  <div className={styles.chartContainer}>
                    <Bar data={dailySessionsChart} options={chartOptions} />
                  </div>
                </div>

                <div className={styles.chartCard}>
                  <h3>Páginas Mais Visitadas</h3>
                  <div className={styles.chartContainer}>
                    <Doughnut 
                      data={topPagesChart} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'right',
                          },
                        },
                      }} 
                    />
                  </div>
                </div>

                <div className={styles.chartCard}>
                  <h3>Usuários Mais Ativos</h3>
                  <div className={styles.usersList}>
                    {analyticsData?.activeUsers?.slice(0, 10)?.map((user, index) => (
                      <div key={index} className={styles.userItem}>
                        <div className={styles.userInfo}>
                          <span className={styles.userName}>{user.name}</span>
                          <span className={styles.userEmail}>{user.email}</span>
                        </div>
                        <span className={styles.userCount}>{user.count} views</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tabela detalhada de páginas */}
              <div className={styles.tableCard}>
                <h3>Detalhamento de Páginas Visitadas</h3>
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Página</th>
                        <th>Visualizações</th>
                        <th>% do Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData?.topPages?.map((page, index) => (
                        <tr key={index}>
                          <td>
                            <code>{page.page_path}</code>
                          </td>
                          <td>{page.count}</td>
                          <td>
                            {((page.count / analyticsData.summary.totalPageViews) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </Layout>
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

  // Buscar dados completos do usuário incluindo permissões modulares
  const { getUserWithPermissions } = await import('../utils/supabase/supabaseClient');
  const userData = await getUserWithPermissions(session.id);

  return {
    props: {
      user: {
        ...session.user,
        role: session.role,
        id: session.id,
        name: session.user.name,
        email: session.user.email,
        
        // PERMISSÕES TRADICIONAIS
        admin: userData?.admin || false,
        can_ticket: userData?.can_ticket || false,
        can_phone: userData?.can_phone || false,
        can_chat: userData?.can_chat || false,
        
        // NOVAS PERMISSÕES MODULARES
        can_register_help: userData?.can_register_help || false,
        can_remote_access: userData?.can_remote_access || false,
      },
    },
  };
} 