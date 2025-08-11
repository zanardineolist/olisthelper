// components/GraphData.js
import React, { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import Select from 'react-select';
import Swal from 'sweetalert2';
import styles from '../styles/GraphData.module.css';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

// Registrar os elementos necessários do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

export default function GraphData({ users }) {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [periodFilter, setPeriodFilter] = useState({ value: 'last7days', label: 'Últimos 7 dias' });
  const [customDateRange, setCustomDateRange] = useState({
    startDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD')
  });
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [chartType, setChartType] = useState('bar'); // 'bar' ou 'line'
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);

  // Paleta de cores fornecida
  const colors = [
    '#E64E36',
    '#F0A028',
    '#0A4EE4',
    '#001647',
    '#779E3D',
    '#8DD7D7',
    '#DF9FC7',
  ];

  // Opções de período
  const periodOptions = [
    { value: 'today', label: 'Hoje' },
    { value: 'last7days', label: 'Últimos 7 dias' },
    { value: 'last30days', label: 'Últimos 30 dias' },
    { value: 'thisMonth', label: 'Este mês' },
    { value: 'custom', label: 'Período personalizado' }
  ];

  // Exibir/ocultar o seletor de datas personalizadas
  useEffect(() => {
    setShowCustomDatePicker(periodFilter.value === 'custom');
  }, [periodFilter]);

  // Função para gerar um array de datas com base no filtro
  const getDateRange = () => {
    const today = dayjs();
    let startDate, endDate;
    
    switch (periodFilter.value) {
      case 'today':
        startDate = today.format('YYYY-MM-DD');
        endDate = today.format('YYYY-MM-DD');
        break;
      case 'last7days':
        startDate = today.subtract(6, 'day').format('YYYY-MM-DD');
        endDate = today.format('YYYY-MM-DD');
        break;
      case 'last30days':
        startDate = today.subtract(29, 'day').format('YYYY-MM-DD');
        endDate = today.format('YYYY-MM-DD');
        break;
      case 'thisMonth':
        startDate = today.startOf('month').format('YYYY-MM-DD');
        endDate = today.format('YYYY-MM-DD');
        break;
      case 'custom':
        startDate = customDateRange.startDate;
        endDate = customDateRange.endDate;
        break;
      default:
        startDate = today.subtract(6, 'day').format('YYYY-MM-DD');
        endDate = today.format('YYYY-MM-DD');
    }
    
    return { startDate, endDate };
  };

  // Gerar um array de datas para exibição no gráfico
  const generateDateLabels = () => {
    const { startDate, endDate } = getDateRange();
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const diffDays = end.diff(start, 'day') + 1;
    
    // Se temos muitos dias, podemos agrupar por semanas para períodos longos
    if (diffDays > 14 && chartType === 'bar') {
      return groupLabelsByWeek(start, end);
    }
    
    const dateLabels = [];
    for (let i = 0; i < diffDays; i++) {
      const date = start.add(i, 'day');
      dateLabels.push(date.format('DD/MM/YYYY'));
    }
    
    return dateLabels;
  };

  // Agrupar labels por semana para visualização mais limpa em períodos longos
  const groupLabelsByWeek = (start, end) => {
    const weekLabels = [];
    let currentDate = start.startOf('week');
    
    while (currentDate.isBefore(end) || currentDate.isSame(end, 'day')) {
      const weekEnd = dayjs.min(currentDate.add(6, 'day'), end);
      weekLabels.push(`${currentDate.format('DD/MM')} - ${weekEnd.format('DD/MM')}`);
      currentDate = currentDate.add(7, 'day');
    }
    
    return weekLabels;
  };

  // Agregar dados por semana quando necessário
  const aggregateDataByWeek = (userData, dateLabels) => {
    if (dateLabels.length <= 14 || chartType === 'line') {
      return userData;
    }
    
    const { startDate } = getDateRange();
    const start = dayjs(startDate).startOf('week');
    const weeklyData = [];
    
    for (let i = 0; i < dateLabels.length; i++) {
      const weekStart = start.add(i * 7, 'day');
      const weekEnd = weekStart.add(6, 'day');
      
      let weekSum = 0;
      for (let j = 0; j < 7; j++) {
        const currentDate = weekStart.add(j, 'day').format('DD/MM/YYYY');
        const dateIndex = userData.dates ? userData.dates.indexOf(currentDate) : -1;
        if (dateIndex !== -1) {
          weekSum += userData.counts[dateIndex];
        }
      }
      
      weeklyData.push(weekSum);
    }
    
    return weeklyData;
  };

  // Buscar dados dos registros dos usuários selecionados quando mudanças ocorrerem
  useEffect(() => {
    if (selectedUsers.length > 0) {
      fetchRecordsForUsers();
    } else {
      setChartData(null);
      setSelectedUserDetail(null);
    }
  }, [selectedUsers, periodFilter, customDateRange, chartType]);

  // Função para buscar dados dos registros dos usuários selecionados
  const fetchRecordsForUsers = async () => {
    if (!selectedUsers.length) {
      setChartData(null);
      setSelectedUserDetail(null);
      return;
    }

    try {
      setLoading(true);
      setSelectedUserDetail(null);
      
      const datasets = [];
      const labels = generateDateLabels();
      let hasData = false;
      const userDataMap = {}; // Para armazenar os dados de cada usuário

      for (const [index, user] of selectedUsers.entries()) {
        // Obter período com base no filtro
        const { startDate, endDate } = getDateRange();
        
        // Construir URL com parâmetros de data
        let url = `/api/get-analyst-records?analystId=${user.id}`;
        
        // Se o filtro for personalizado, usamos os parâmetros startDate e endDate
        if (periodFilter.value === 'custom') {
          url += `&startDate=${startDate}&endDate=${endDate}`;
        } else {
          // Caso contrário, usamos o filter correspondente
          const filterMap = {
            'today': '1',
            'last7days': '7',
            'last30days': '30',
            'thisMonth': 'month'
          };
          url += `&filter=${filterMap[periodFilter.value] || '7'}`;
        }
        
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Erro ao buscar registros do usuário ${user.name}`);

        const userData = await res.json();
        userDataMap[user.id] = userData; // Armazenar dados do usuário
        
        let userCounts;
        
        if (labels.length > 14 && chartType === 'bar') {
          // Para muitos dias, agrupamos por semana no gráfico de barras
          userCounts = aggregateDataByWeek(userData, labels);
        } else {
          // Para visualizações diárias normais
          userCounts = labels.map(label => {
            const dateIndex = userData.dates ? userData.dates.indexOf(label) : -1;
            return dateIndex !== -1 ? userData.counts[dateIndex] : 0;
          });
        }

        if (userCounts.some(count => count > 0)) {
          hasData = true;
        }

        const userColor = colors[index % colors.length];

        datasets.push({
          label: user.name,
          data: userCounts,
          backgroundColor: chartType === 'line' ? 'transparent' : userColor,
          borderColor: userColor,
          borderWidth: chartType === 'line' ? 2 : 1,
          pointBackgroundColor: userColor,
          pointRadius: chartType === 'line' ? 3 : 0,
          tension: 0.2, // Suaviza a linha para visualização mais agradável
          userId: user.id // Armazenar ID para referência
        });
      }

      if (hasData) {
        setChartData({
          labels,
          datasets,
          userData: userDataMap
        });
      } else {
        setChartData(null);
      }
    } catch (error) {
      console.error('Erro ao carregar registros:', error);
      Swal.fire('Erro', 'Erro ao carregar registros.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Manipulador para mudar o filtro de período
  const handlePeriodChange = (selectedOption) => {
    setPeriodFilter(selectedOption);
  };

  const handleStartDateChange = (e) => {
    setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }));
  };

  const handleEndDateChange = (e) => {
    setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }));
  };

  // Manipulador para alternar o tipo de gráfico
  const toggleChartType = () => {
    setChartType(prev => prev === 'bar' ? 'line' : 'bar');
  };

  // Mostrar detalhes detalhados de um usuário quando clicado
  const handleShowUserDetail = (user) => {
    if (!chartData || !chartData.userData) return;
    
    const userData = chartData.userData[user.id];
    setSelectedUserDetail({
      user,
      data: userData
    });
  };

  // Calcular estatísticas para o card de resumo
  const calculateUserStats = (dataset) => {
    if (!dataset || !dataset.data) return { total: 0, daily: 0, best: 0, worst: 0 };
    
    const total = dataset.data.reduce((sum, count) => sum + count, 0);
    const daily = (total / dataset.data.length).toFixed(1);
    const best = Math.max(...dataset.data);
    const worst = dataset.data.every(d => d === 0) ? 0 : Math.min(...dataset.data.filter(d => d > 0));
    
    return { total, daily, best, worst };
  };

  // Estilos personalizados para o React-Select
  const customSelectStyles = {
    container: (provided) => ({
      ...provided,
      width: '100%',
      marginBottom: '20px',
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
      zIndex: 999
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
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: 'var(--color-primary)',
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: 'white',
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: 'white',
      '&:hover': {
        backgroundColor: 'var(--color-primary-hover)',
        color: 'white',
      },
    }),
  };

  return (
    <div className={styles.graphDataContainer}>
      <div className={styles.controlPanel}>
        <div className={styles.panelSection}>
          <h3 className={styles.sectionTitle}>Selecione os Colaboradores</h3>
          <Select
            options={users
              .filter(u => u && u.active && typeof u.role === 'string' && ['analyst', 'tax'].includes(u.role.toLowerCase()))
              .map(u => ({
                value: u,
                label: `${u.name}${u.squad ? ` · #${u.squad}` : ''}`,
                id: u.id,
              }))}
            onChange={(selectedOptions) => {
              setSelectedUsers(selectedOptions ? selectedOptions.map(option => option.value) : []);
            }}
            isMulti
            placeholder="Selecione analistas ou fiscais"
            styles={customSelectStyles}
            classNamePrefix="react-select"
            noOptionsMessage={() => 'Sem resultados'}
          />
        </div>

        <div className={styles.panelSection}>
          <h3 className={styles.sectionTitle}>Período de Análise</h3>
          <div className={styles.periodFilterControls}>
            <Select
              options={periodOptions}
              value={periodFilter}
              onChange={handlePeriodChange}
              isSearchable={false}
              placeholder="Selecione o período"
              styles={{
                ...customSelectStyles,
                container: (provided) => ({
                  ...provided,
                  width: '100%',
                  marginBottom: '10px'
                })
              }}
              classNamePrefix="react-select"
            />
            
            {showCustomDatePicker && (
              <div className={styles.dateRangeContainer}>
                <div className={styles.dateInputGroup}>
                  <label htmlFor="startDate">Data Inicial:</label>
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
                  <label htmlFor="endDate">Data Final:</label>
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

        {/* Botão para alternar tipo de gráfico */}
        {chartData && (
          <div className={styles.chartTypeToggle}>
            <button 
              className={`${styles.toggleButton} ${chartType === 'bar' ? styles.activeButton : ''}`} 
              onClick={() => setChartType('bar')}
            >
              <i className="fa-solid fa-chart-column"></i> Barras
            </button>
            <button 
              className={`${styles.toggleButton} ${chartType === 'line' ? styles.activeButton : ''}`} 
              onClick={() => setChartType('line')}
            >
              <i className="fa-solid fa-chart-line"></i> Linhas
            </button>
            {selectedUsers.length > 5 && (
              <span className={styles.helperText}>Você selecionou muitos usuários. Gráfico pode ficar pesado.</span>
            )}
          </div>
        )}
      </div>

      <div className={styles.chartContainer}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <div className="standardBoxLoader"></div>
          </div>
        ) : chartData ? (
          <div className={styles.chartWrapper}>
            {chartType === 'bar' ? (
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                      labels: {
                        color: 'var(--text-color)',
                        font: {
                          family: "'Plus Jakarta Sans', sans-serif",
                          size: 12
                        },
                        boxWidth: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                      }
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
                  },
                  onClick: (_, activeElements) => {
                    if (activeElements.length > 0) {
                      const { datasetIndex } = activeElements[0];
                      const userId = chartData.datasets[datasetIndex].userId;
                      const user = selectedUsers.find(u => u.id === userId);
                      if (user) {
                        handleShowUserDetail(user);
                      }
                    }
                  }
                }}
              />
            ) : (
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                      labels: {
                        color: 'var(--text-color)',
                        font: {
                          family: "'Plus Jakarta Sans', sans-serif",
                          size: 12
                        },
                        boxWidth: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                      }
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
                  },
                  elements: {
                    line: {
                      tension: 0.3 // Curva mais suave nas linhas
                    }
                  },
                  onClick: (_, activeElements) => {
                    if (activeElements.length > 0) {
                      const { datasetIndex } = activeElements[0];
                      const userId = chartData.datasets[datasetIndex].userId;
                      const user = selectedUsers.find(u => u.id === userId);
                      if (user) {
                        handleShowUserDetail(user);
                      }
                    }
                  }
                }}
              />
            )}
          </div>
        ) : (
          <div className={styles.noDataMessage}>
            <i className="fa-solid fa-chart-simple"></i>
            <p>
              {selectedUsers.length === 0 
                ? 'Selecione pelo menos um colaborador para visualizar os dados.'
                : 'Nenhum dado disponível para o período selecionado.'}
            </p>
          </div>
        )}
      </div>

      {chartData && (
        <>
          <div className={styles.summary}>
            <h3 className={styles.summaryTitle}>Resumo dos Dados</h3>
            <p className={styles.summaryHelp}>Clique em um colaborador para ver detalhes ou clique diretamente no gráfico.</p>
            
            <div className={styles.summaryGrid}>
              {chartData.datasets.map((dataset, index) => {
                const stats = calculateUserStats(dataset);
                const user = selectedUsers.find(u => u.id === dataset.userId);
                
                return (
                  <div 
                    key={index} 
                    className={`${styles.summaryCard} ${selectedUserDetail?.user?.id === dataset.userId ? styles.selectedCard : ''}`}
                    style={{ borderColor: dataset.borderColor }}
                    onClick={() => handleShowUserDetail(user)}
                  >
                    <div className={styles.cardHeader} style={{ backgroundColor: dataset.borderColor }}>
                      <h4>{dataset.label}</h4>
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.metricGrid}>
                        <div className={styles.metric}>
                          <span className={styles.metricLabel}>Total:</span>
                          <span className={styles.metricValue}>{stats.total}</span>
                        </div>
                        <div className={styles.metric}>
                          <span className={styles.metricLabel}>Média:</span>
                          <span className={styles.metricValue}>{stats.daily}</span>
                        </div>
                        <div className={styles.metric}>
                          <span className={styles.metricLabel}>Melhor:</span>
                          <span className={styles.metricValue}>{stats.best}</span>
                        </div>
                        <div className={styles.metric}>
                          <span className={styles.metricLabel}>Pior:</span>
                          <span className={styles.metricValue}>{stats.worst === 0 ? '-' : stats.worst}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedUserDetail && (
            <div className={styles.userDetailSection}>
              <div className={styles.userDetailHeader} style={{ backgroundColor: chartData.datasets.find(d => d.userId === selectedUserDetail.user.id)?.borderColor }}>
                <h3>Detalhes de {selectedUserDetail.user.name}</h3>
                <button className={styles.closeButton} onClick={() => setSelectedUserDetail(null)}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              
              <div className={styles.userDetailContent}>
                {selectedUserDetail.data && selectedUserDetail.data.rows && selectedUserDetail.data.rows.length > 0 ? (
                  <div className={styles.detailTableContainer}>
                    <table className={styles.detailTable}>
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Hora</th>
                          <th>Requisitante</th>
                          <th>Categoria</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedUserDetail.data.rows.map((row, idx) => (
                          <tr key={idx}>
                            <td>{row[0]}</td>
                            <td>{row[1]}</td>
                            <td>{row[2]}</td>
                            <td>{row[4]}</td>
                            <td className={styles.descriptionCol}>{row[5]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className={styles.noDetailData}>
                    <i className="fa-solid fa-info-circle"></i>
                    <p>Nenhum registro de ajuda no período selecionado.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}