// pages/dashboard-analyst.js
import Head from 'next/head';
import { getSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import Navbar from '../components/Navbar';
import styles from '../styles/DashboardAnalyst.module.css';
import Footer from '../components/Footer';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import Select from 'react-select';
import Swal from 'sweetalert2';

export default function DashboardAnalyst({ user }) {
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [recordCount, setRecordCount] = useState(0);
  const [chartData, setChartData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [categoryRanking, setCategoryRanking] = useState([]);
  const [greeting, setGreeting] = useState('');
  
  // Estado para os filtros de período
  const [periodFilter, setPeriodFilter] = useState({ value: 'last7days', label: 'Últimos 7 dias' });
  const [customDateRange, setCustomDateRange] = useState({
    startDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD')
  });
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Opções de filtro de período
  const periodOptions = [
    { value: 'today', label: 'Hoje' },
    { value: 'last7days', label: 'Últimos 7 dias' },
    { value: 'last30days', label: 'Últimos 30 dias' },
    { value: 'thisMonth', label: 'Este mês' },
    { value: 'custom', label: 'Período personalizado' }
  ];

  // Definir saudação baseada na hora do dia
  useEffect(() => {
    setTimeout(() => {
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
  }, []);

  // Exibir/ocultar o seletor de datas personalizadas
  useEffect(() => {
    setShowCustomDatePicker(periodFilter.value === 'custom');
  }, [periodFilter]);

  // Fetch dos dados quando o filtro é alterado
  useEffect(() => {
    fetchRecords();
  }, [periodFilter, customDateRange, user]);

  // Carregar leaderboard e ranking de categorias
  useEffect(() => {
    if (!initialLoading) {
      fetchLeaderboard();
      fetchCategoryRanking();
    }
  }, [initialLoading, user]);

  // Função para obter datas com base no filtro
  const getDateRange = () => {
    const today = dayjs();
    let startDate, endDate, filter;
    
    switch (periodFilter.value) {
      case 'today':
        startDate = today.format('YYYY-MM-DD');
        endDate = today.format('YYYY-MM-DD');
        filter = '1';
        break;
      case 'last7days':
        startDate = today.subtract(6, 'day').format('YYYY-MM-DD');
        endDate = today.format('YYYY-MM-DD');
        filter = '7';
        break;
      case 'last30days':
        startDate = today.subtract(29, 'day').format('YYYY-MM-DD');
        endDate = today.format('YYYY-MM-DD');
        filter = '30';
        break;
      case 'thisMonth':
        startDate = today.startOf('month').format('YYYY-MM-DD');
        endDate = today.format('YYYY-MM-DD');
        filter = 'month';
        break;
      case 'custom':
        startDate = customDateRange.startDate;
        endDate = customDateRange.endDate;
        filter = 'custom';
        break;
      default:
        startDate = today.subtract(6, 'day').format('YYYY-MM-DD');
        endDate = today.format('YYYY-MM-DD');
        filter = '7';
    }
    
    return { startDate, endDate, filter };
  };

  // Fetch registros do analista (para o gráfico, com base no filtro selecionado)
  const fetchRecords = async () => {
    if (!user?.id) {
      console.error("ID do analista não encontrado.");
      return;
    }

    try {
      setLoading(true);
      const { filter, startDate, endDate } = getDateRange();
      
      // Usar os novos parâmetros startDate e endDate
      let url = `/api/get-analyst-records?analystId=${user.id}`;
      
      // Se o filtro for 'custom', usamos os parâmetros startDate e endDate
      if (periodFilter.value === 'custom') {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      } else {
        // Caso contrário, mantemos a compatibilidade com o filtro existente
        url += `&filter=${filter}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Erro ao buscar registros.');
      }

      const data = await res.json();
      setRecordCount(data.count);
      
      if (data.count > 0) {
        setChartData({
          labels: data.dates,
          datasets: [
            {
              label: 'Auxilios',
              data: data.counts,
              backgroundColor: 'rgba(119, 158, 61, 0.8)',
              borderColor: 'rgba(84, 109, 47, 1)',
              borderWidth: 1,
              borderRadius: 4,
            },
          ],
        });
      } else {
        setChartData(null);
      }
    } catch (err) {
      console.error('Erro ao carregar registros:', err);
      Swal.fire('Erro', 'Erro ao carregar dados de registros', 'error');
      setRecordCount(0);
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch leaderboard de usuários (sempre com base no mês atual)
  const fetchLeaderboard = async () => {
    if (!user?.id) {
      console.error("ID do analista não encontrado.");
      return;
    }

    try {
      const res = await fetch(`/api/get-analyst-leaderboard?analystId=${user.id}`);
      if (!res.ok) {
        throw new Error('Erro ao buscar registros para o leaderboard.');
      }

      const data = await res.json();
      if (!data || !data.rows || data.rows.length === 0) {
        setLeaderboard([]);
        return;
      }

      // Processar os dados do leaderboard
      const formattedLeaderboard = [];
      const userMap = new Map();

      data.rows.forEach(row => {
        const userName = row[2];
        const count = parseInt(row[4]) || 1;
        
        if (userName && !userMap.has(userName)) {
          userMap.set(userName, {
            name: userName,
            count: count
          });
        }
      });

      const sortedUsers = Array.from(userMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setLeaderboard(sortedUsers);
    } catch (err) {
      console.error('Erro ao carregar leaderboard:', err);
      setLeaderboard([]);
    }
  };

  // Fetch ranking de categorias (sempre com base no mês atual)
  const fetchCategoryRanking = async () => {
    if (!user?.id) {
      console.error("ID do analista não encontrado.");
      return;
    }

    try {
      const res = await fetch(`/api/get-category-ranking?analystId=${user.id}`);
      if (!res.ok) {
        throw new Error('Erro ao buscar registros das categorias.');
      }

      const data = await res.json();
      setCategoryRanking(data.categories || []);
    } catch (err) {
      console.error('Erro ao carregar ranking das categorias:', err);
      setCategoryRanking([]);
    }
  };

  const handlePeriodChange = (selectedOption) => {
    setPeriodFilter(selectedOption);
  };

  const handleStartDateChange = (e) => {
    setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }));
  };

  const handleEndDateChange = (e) => {
    setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }));
  };

  // Estilos personalizados para o React-Select
  const customSelectStyles = {
    container: (provided) => ({
      ...provided,
      width: '100%',
      maxWidth: '250px',
    }),
    control: (provided, state) => ({
      ...provided,
      backgroundColor: 'var(--modals-inputs)',
      borderColor: state.isFocused ? 'var(--color-primary)' : 'var(--color-border)',
      color: 'var(--text-color)',
      borderRadius: '5px',
      padding: '5px',
      boxShadow: 'none',
      '&:hover': {
        borderColor: 'var(--color-primary)',
      },
      outline: 'none',
    }),
    input: (provided) => ({
      ...provided,
      color: 'var(--text-color)',
      caretColor: 'var(--text-color)',
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: 'var(--modals-inputs)',
      maxHeight: '250px',
      overflowY: 'auto',
    }),
    menuList: (provided) => ({
      ...provided,
      padding: 0,
      maxHeight: '250px',
      '&::-webkit-scrollbar': {
        width: '8px',
      },
      '&::-webkit-scrollbar-track': {
        background: 'var(--scroll-bg)',
      },
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: 'var(--scroll)',
        borderRadius: '10px',
        border: '2px solid var(--scroll-bg)',
      },
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused
        ? 'var(--color-trodd)'
        : state.isSelected
        ? 'var(--color-primary)'
        : 'var(--box-color)',
      color: 'var(--text-color)',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: 'var(--color-trodd)',
      },
    }),
    singleValue: (provided) => ({
      ...provided,
      color: 'var(--text-color)',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: 'var(--text-color2)',
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      color: 'var(--text-color)',
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: 'var(--color-border)',
    }),
  };

  if (initialLoading) {
    return (
      <div className="loaderOverlay">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard Analista</title>
        <meta name="description" content="Dashboard de analista com métricas de desempenho e tendências" />
      </Head>

      <Navbar user={user} />

      <main className={styles.dashboardMain}>
        <div className={styles.pageHeader}>
          <div className={styles.welcomeContainer}>
            <div className={styles.greetingText}>
              {greeting}, <span>{user.name.split(' ')[0]}</span>
            </div>
            <p className={styles.dashboardSubtitle}>
              Bem-vindo ao seu dashboard. Aqui você pode acompanhar suas métricas e desempenho.
            </p>
          </div>
          
          <div className={styles.profileSummary}>
            <img src={user.image} alt={user.name} className={styles.profileImage} />
            <div className={styles.profileInfo}>
              <h2>{user.name}</h2>
              <p>{user.email}</p>
              <span className={styles.roleBadge}>
                {user.role === 'analyst' ? 'Analista' : 'Fiscal'}
              </span>
            </div>
          </div>
        </div>

        {/* Seção de filtro de período */}
        <div className={styles.periodFilterSection}>
          <h3 className={styles.sectionTitle}>Período de Análise</h3>
          <div className={styles.periodFilterControls}>
            <Select
              options={periodOptions}
              value={periodFilter}
              onChange={handlePeriodChange}
              isSearchable={false}
              placeholder="Selecione o período"
              styles={customSelectStyles}
              classNamePrefix="react-select"
            />
            
            {showCustomDatePicker && (
              <div className={styles.dateRangeContainer}>
                <div className={styles.dateInputGroup}>
                  <label htmlFor="startDate">De:</label>
                  <input
                    id="startDate"
                    type="date"
                    value={customDateRange.startDate}
                    max={customDateRange.endDate}
                    onChange={handleStartDateChange}
                    className={styles.dateInput}
                  />
                </div>
                <div className={styles.dateInputGroup}>
                  <label htmlFor="endDate">Até:</label>
                  <input
                    id="endDate"
                    type="date"
                    value={customDateRange.endDate}
                    min={customDateRange.startDate}
                    max={dayjs().format('YYYY-MM-DD')}
                    onChange={handleEndDateChange}
                    className={styles.dateInput}
                  />
                </div>
              </div>
            )}
          </div>

          <div className={styles.selectedPeriodInfo}>
            <span className={styles.periodLabel}>Período selecionado:</span>
            <span className={styles.periodValue}>
              {periodFilter.value === 'custom' 
                ? `${dayjs(customDateRange.startDate).format('DD/MM/YYYY')} até ${dayjs(customDateRange.endDate).format('DD/MM/YYYY')}`
                : periodFilter.label}
            </span>
          </div>
        </div>

        {/* Cartão de resumo */}
        <div className={styles.summaryCard}>
          <div className={styles.summaryHeader}>
            <h3>Resumo de Desempenho</h3>
            <div className={styles.summaryPeriod}>
              {periodFilter.value === 'custom' 
                ? `${dayjs(customDateRange.startDate).format('DD/MM/YYYY')} - ${dayjs(customDateRange.endDate).format('DD/MM/YYYY')}`
                : periodFilter.label}
            </div>
          </div>
          <div className={styles.summaryContent}>
            <div className={styles.summaryMetric}>
              <div className={styles.metricValue}>{recordCount}</div>
              <div className={styles.metricLabel}>Total de Auxilios</div>
            </div>
            <div className={styles.summaryMetric}>
              <div className={styles.metricValue}>
                {chartData?.labels?.length > 0 
                  ? (recordCount / chartData.labels.length).toFixed(1) 
                  : '0'}
              </div>
              <div className={styles.metricLabel}>Média por Dia</div>
            </div>
            <div className={styles.summaryMetric}>
              <div className={styles.metricValue}>{categoryRanking.length}</div>
              <div className={styles.metricLabel}>Categorias</div>
            </div>
          </div>
        </div>

        {/* Gráfico */}
        <div className={styles.chartContainer}>
          <h3 className={styles.chartTitle}>Distribuição de Auxilios</h3>
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className="standardBoxLoader"></div>
            </div>
          ) : chartData ? (
            <div className={styles.chartWrapper}>
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    },
                    tooltip: {
                      backgroundColor: 'var(--box-color)',
                      titleColor: 'var(--title-color)',
                      bodyColor: 'var(--text-color)',
                      borderColor: 'var(--color-border)',
                      borderWidth: 1,
                      padding: 10,
                      boxPadding: 5,
                      bodyFont: {
                        family: "'Plus Jakarta Sans', sans-serif"
                      },
                      titleFont: {
                        family: "'Plus Jakarta Sans', sans-serif",
                        weight: 'bold'
                      }
                    }
                  },
                  scales: {
                    x: {
                      grid: {
                        color: 'var(--color-border)',
                        drawBorder: false,
                        lineWidth: 0.5
                      },
                      ticks: {
                        color: 'var(--text-color)',
                        font: {
                          family: "'Plus Jakarta Sans', sans-serif",
                          size: 11
                        },
                        maxRotation: 45,
                        minRotation: 45
                      }
                    },
                    y: {
                      beginAtZero: true,
                      grid: {
                        color: 'var(--color-border)',
                        drawBorder: false,
                        lineWidth: 0.5
                      },
                      ticks: {
                        precision: 0,
                        color: 'var(--text-color)',
                        font: {
                          family: "'Plus Jakarta Sans', sans-serif",
                          size: 12
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className={styles.noDataMessage}>
              <i className="fa-solid fa-chart-simple"></i>
              <p>Nenhum dado disponível para o período selecionado.</p>
            </div>
          )}
        </div>

        {/* Container de rankings */}
        <div className={styles.rankingsContainer}>
          {/* Leaderboard */}
          <div className={styles.rankingCard}>
            <h3 className={styles.rankingTitle}>Top 5 - Usuários com Mais Ajudas</h3>
            {leaderboard.length > 0 ? (
              <ul className={styles.rankingList}>
                {leaderboard.map((user, index) => (
                  <li key={index} className={styles.rankingItem}>
                    <div className={styles.rankingPosition}>{index + 1}</div>
                    <div className={styles.rankingDetails}>
                      <div className={styles.rankingName}>{user.name}</div>
                      <div className={styles.progressBarContainer}>
                        <div 
                          className={styles.progressBar} 
                          style={{ 
                            width: `${(user.count / leaderboard[0].count) * 100}%`,
                            backgroundColor: index === 0 ? '#F0A028' : '#0A4EE4'
                          }}
                        />
                      </div>
                    </div>
                    <div className={styles.rankingCount}>{user.count}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.noDataMessage}>
                <p>Nenhum atendimento registrado este mês.</p>
              </div>
            )}
          </div>

          {/* Ranking de categorias */}
          <div className={styles.rankingCard}>
            <h3 className={styles.rankingTitle}>Top 10 - Temas de Dúvidas</h3>
            {categoryRanking.length > 0 ? (
              <ul className={styles.rankingList}>
                {categoryRanking.map((category, index) => (
                  <li key={index} className={styles.rankingItem}>
                    <div className={styles.rankingPosition}>{index + 1}</div>
                    <div className={styles.rankingDetails}>
                      <div className={styles.rankingName}>{category.name}</div>
                      <div className={styles.progressBarContainer}>
                        <div 
                          className={styles.progressBar} 
                          style={{ 
                            width: `${(category.count / categoryRanking[0].count) * 100}%`,
                            backgroundColor: category.count > 50 ? '#F0A028' : '#0A4EE4'
                          }}
                        />
                      </div>
                    </div>
                    <div className={styles.rankingCount}>
                      {category.count}
                      {category.count > 50 && (
                        <i 
                          className="fa-solid fa-circle-exclamation" 
                          style={{ color: '#F0A028', marginLeft: '5px' }}
                          title="Considere criar um material sobre este tema"
                        ></i>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.noDataMessage}>
                <p>Nenhum tema registrado este mês.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

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