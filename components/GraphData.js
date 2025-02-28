// components/GraphData.js
import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import Select from 'react-select';
import Swal from 'sweetalert2';

import baseStyles from '../styles/dashboard/base.module.css';
import cardStyles from '../styles/dashboard/cards.module.css';
import chartStyles from '../styles/dashboard/charts.module.css';
import responsiveStyles from '../styles/dashboard/responsive.module.css';

import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

const styles = {
  ...baseStyles,
  ...cardStyles,
  ...chartStyles,
  ...responsiveStyles
};

// Registrar os elementos necessários do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
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
    
    const dateLabels = [];
    for (let i = 0; i < diffDays; i++) {
      dateLabels.push(start.add(i, 'day').format('DD/MM/YYYY'));
    }
    
    return dateLabels;
  };

  // Buscar dados dos registros dos usuários selecionados quando mudanças ocorrerem
  useEffect(() => {
    if (selectedUsers.length > 0) {
      fetchRecordsForUsers();
    } else {
      setChartData(null);
    }
  }, [selectedUsers, periodFilter, customDateRange]);

  // Função para buscar dados dos registros dos usuários selecionados
  const fetchRecordsForUsers = async () => {
    if (!selectedUsers.length) {
      setChartData(null);
      return;
    }

    try {
      setLoading(true);
      const datasets = [];
      const labels = generateDateLabels();
      let hasData = false;

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

        const data = await res.json();
        const userCounts = labels.map(label => {
          const dateIndex = data.dates ? data.dates.indexOf(label) : -1;
          return dateIndex !== -1 ? data.counts[dateIndex] : 0;
        });

        if (userCounts.some(count => count > 0)) {
          hasData = true;
        }

        datasets.push({
          label: user.name,
          data: userCounts,
          backgroundColor: colors[index % colors.length],
          borderColor: colors[index % colors.length],
          borderWidth: 1,
        });
      }

      if (hasData) {
        setChartData({
          labels,
          datasets,
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
            options={users.filter(user => ['analyst', 'tax'].includes(user.role.toLowerCase())).map(user => ({
              value: user,
              label: user.name,
              id: user.id,
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
      </div>

      <div className={styles.chartContainer}>
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
                }
              }}
            />
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
        <div className={styles.summary}>
          <h3>Resumo dos Dados</h3>
          <div className={styles.summaryGrid}>
            {chartData.datasets.map((dataset, index) => {
              const totalAjudas = dataset.data.reduce((sum, count) => sum + count, 0);
              const mediaDiaria = (totalAjudas / chartData.labels.length).toFixed(1);
              
              return (
                <div key={index} className={styles.summaryCard} style={{ borderColor: dataset.backgroundColor }}>
                  <div className={styles.cardHeader} style={{ backgroundColor: dataset.backgroundColor }}>
                    <h4>{dataset.label}</h4>
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.metricGroup}>
                      <div className={styles.metric}>
                        <span className={styles.metricLabel}>Total de Ajudas:</span>
                        <span className={styles.metricValue}>{totalAjudas}</span>
                      </div>
                      <div className={styles.metric}>
                        <span className={styles.metricLabel}>Média Diária:</span>
                        <span className={styles.metricValue}>{mediaDiaria}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}