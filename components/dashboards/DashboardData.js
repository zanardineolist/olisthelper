import React, { useState, useEffect } from 'react';
import Select, { components as selectComponents } from 'react-select';
import Swal from 'sweetalert2';
import styles from '../../styles/DashboardSuper.module.css';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

export default function DashboardData({ user }) {
  // Estados básicos
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [helpRequests, setHelpRequests] = useState({ currentMonth: 0, lastMonth: 0 });
  const [categoryRanking, setCategoryRanking] = useState([]);
  const [performanceData, setPerformanceData] = useState(null);
  const [categoryLoading, setCategoryLoading] = useState(false);
  
  // Estados para filtro de período
  const [periodFilter, setPeriodFilter] = useState({ value: 'thisMonth', label: 'Este mês' });
  const [customDateRange, setCustomDateRange] = useState({
    startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD')
  });
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Opções de período
  const periodOptions = [
    { value: 'today', label: 'Hoje' },
    { value: 'last7days', label: 'Últimos 7 dias' },
    { value: 'last30days', label: 'Últimos 30 dias' },
    { value: 'thisMonth', label: 'Este mês' },
    { value: 'custom', label: 'Período personalizado' }
  ];

  // Carregar lista de usuários
  useEffect(() => {
    loadUsers();
  }, []);

  // Exibir/ocultar o seletor de datas personalizadas
  useEffect(() => {
    setShowCustomDatePicker(periodFilter.value === 'custom');
  }, [periodFilter]);

  // Carregar dados quando o usuário ou período mudar
  useEffect(() => {
    if (selectedUser) {
      loadHelpRequests();
      loadCategoryRanking();
    }
  }, [selectedUser, periodFilter, customDateRange]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        
        // Filtrar apenas usuários de suporte
        const supportUsers = data.filter(user => 
          ['support', 'support+', 'analyst', 'super'].includes(user.role)
        );
        
        const userOptions = supportUsers.map(user => ({
          value: user.id,
          label: user.name,
          role: user.role
        }));
        
        setUsers(userOptions);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Erro ao carregar lista de usuários'
      });
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const now = dayjs();
    let startDate, endDate;

    switch (periodFilter.value) {
      case 'today':
        startDate = now.startOf('day');
        endDate = now.endOf('day');
        break;
      case 'last7days':
        startDate = now.subtract(7, 'day').startOf('day');
        endDate = now.endOf('day');
        break;
      case 'last30days':
        startDate = now.subtract(30, 'day').startOf('day');
        endDate = now.endOf('day');
        break;
      case 'thisMonth':
        startDate = now.startOf('month');
        endDate = now.endOf('month');
        break;
      case 'custom':
        startDate = dayjs(customDateRange.startDate);
        endDate = dayjs(customDateRange.endDate);
        break;
      default:
        startDate = now.startOf('month');
        endDate = now.endOf('month');
    }

    return {
      startDate: startDate.format('YYYY-MM-DD'),
      endDate: endDate.format('YYYY-MM-DD')
    };
  };

  const loadHelpRequests = async () => {
    setLoadingData(true);
    try {
      const { startDate, endDate } = getDateRange();
      
      const response = await fetch('/api/help-requests-count?' + new URLSearchParams({
        userId: selectedUser.value,
        startDate,
        endDate,
        period: periodFilter.value
      }));

      if (response.ok) {
        const data = await response.json();
        setHelpRequests(data);
      }
    } catch (error) {
      console.error('Erro ao carregar contagem de pedidos de ajuda:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadCategoryRanking = async () => {
    setCategoryLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      
      const response = await fetch('/api/category-ranking?' + new URLSearchParams({
        userId: selectedUser.value,
        startDate,
        endDate
      }));

      if (response.ok) {
        const data = await response.json();
        setCategoryRanking(data);
        
        // Preparar dados para o gráfico
        const chartLabels = data.map(item => item.categoria);
        const chartCounts = data.map(item => item.total);
        
        setPerformanceData({
          labels: chartLabels,
          datasets: [{
            label: 'Atendimentos por Categoria',
            data: chartCounts,
            backgroundColor: [
              '#E64E36',
              '#F0A028', 
              '#0A4EE4',
              '#36C5F0',
              '#2EB67D',
              '#ECB22E',
              '#E01E5A',
              '#611F69'
            ],
            borderColor: '#fff',
            borderWidth: 2
          }]
        });
      }
    } catch (error) {
      console.error('Erro ao carregar ranking de categorias:', error);
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleUserChange = (selectedOption) => {
    setSelectedUser(selectedOption);
  };

  const handlePeriodChange = (selectedOption) => {
    setPeriodFilter(selectedOption);
  };

  const handleDateRangeChange = (field, value) => {
    setCustomDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatPercentageChange = (current, previous) => {
    if (previous === 0) {
      return current > 0 ? '+100%' : '0%';
    }
    
    const change = ((current - previous) / previous) * 100;
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  const getChangeColor = (current, previous) => {
    if (current > previous) return '#2EB67D'; // Verde
    if (current < previous) return '#E01E5A'; // Vermelho
    return '#6B7280'; // Cinza
  };

  // Componente customizado para o dropdown do usuário
  const UserOption = (props) => (
    <selectComponents.Option {...props}>
      <div className={styles.userOption}>
        <span className={styles.userName}>{props.data.label}</span>
        <span className={`${styles.userRole} ${styles[props.data.role]}`}>
          {props.data.role}
        </span>
      </div>
    </selectComponents.Option>
  );

  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: 'var(--labels-bg)',
      borderColor: state.isFocused ? 'var(--color-primary)' : 'var(--color-border)',
      color: 'var(--text-color)',
      boxShadow: 'none',
      '&:hover': {
        borderColor: 'var(--color-primary)',
      },
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: 'var(--labels-bg)',
      zIndex: 9999,
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused ? 'var(--color-trodd)' : 'var(--box-color)',
      color: 'var(--text-color)',
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
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'var(--box-color)',
        titleColor: 'var(--text-color)',
        bodyColor: 'var(--text-color)',
        borderColor: 'var(--color-border)',
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: 'var(--text-color2)',
          stepSize: 1,
        },
        grid: {
          color: 'var(--color-border)',
        },
      },
      x: {
        ticks: {
          color: 'var(--text-color2)',
        },
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <div className={styles.dashboardDataContainer}>
      <div className={styles.filtersSection}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Usuário:</label>
          <Select
            value={selectedUser}
            onChange={handleUserChange}
            options={users}
            components={{ Option: UserOption }}
            styles={customSelectStyles}
            placeholder="Selecione um usuário..."
            isClearable
            isLoading={loading}
            className={styles.userSelect}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Período:</label>
          <Select
            value={periodFilter}
            onChange={handlePeriodChange}
            options={periodOptions}
            styles={customSelectStyles}
            placeholder="Selecione o período..."
            className={styles.periodSelect}
          />
        </div>

        {showCustomDatePicker && (
          <div className={styles.dateRangeGroup}>
            <div className={styles.dateField}>
              <label className={styles.filterLabel}>Data Inicial:</label>
              <input
                type="date"
                value={customDateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                className={styles.dateInput}
              />
            </div>
            <div className={styles.dateField}>
              <label className={styles.filterLabel}>Data Final:</label>
              <input
                type="date"
                value={customDateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                className={styles.dateInput}
              />
            </div>
          </div>
        )}
      </div>

      {selectedUser && (
        <div className={styles.dataSection}>
          {/* Cards de Resumo */}
          <div className={styles.summaryCards}>
            <div className={styles.summaryCard}>
              <div className={styles.cardHeader}>
                <h3>Pedidos de Ajuda</h3>
                <span className={styles.cardSubtitle}>Período Atual</span>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.mainValue}>
                  {loadingData ? (
                    <div className={styles.loadingSpinner} />
                  ) : (
                    helpRequests.currentMonth
                  )}
                </div>
                <div 
                  className={styles.changeIndicator}
                  style={{ 
                    color: getChangeColor(helpRequests.currentMonth, helpRequests.lastMonth) 
                  }}
                >
                  {formatPercentageChange(helpRequests.currentMonth, helpRequests.lastMonth)}
                  <span className={styles.changeLabel}>vs período anterior</span>
                </div>
              </div>
            </div>

            <div className={styles.summaryCard}>
              <div className={styles.cardHeader}>
                <h3>Categorias Atendidas</h3>
                <span className={styles.cardSubtitle}>Diversidade</span>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.mainValue}>
                  {categoryLoading ? (
                    <div className={styles.loadingSpinner} />
                  ) : (
                    categoryRanking.length
                  )}
                </div>
                <div className={styles.changeLabel}>
                  categorias diferentes
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico de Performance */}
          {performanceData && (
            <div className={styles.chartSection}>
              <div className={styles.chartHeader}>
                <h3>Atendimentos por Categoria</h3>
                <span className={styles.chartSubtitle}>
                  Distribuição no período selecionado
                </span>
              </div>
              <div className={styles.chartContainer}>
                <Bar data={performanceData} options={chartOptions} />
              </div>
            </div>
          )}

          {/* Ranking de Categorias */}
          {categoryRanking.length > 0 && (
            <div className={styles.rankingSection}>
              <div className={styles.rankingHeader}>
                <h3>Ranking de Categorias</h3>
                <span className={styles.rankingSubtitle}>
                  Ordenado por número de atendimentos
                </span>
              </div>
              <div className={styles.rankingList}>
                {categoryRanking.map((item, index) => (
                  <div key={index} className={styles.rankingItem}>
                    <div className={styles.rankingPosition}>
                      #{index + 1}
                    </div>
                    <div className={styles.rankingInfo}>
                      <span className={styles.categoryName}>{item.categoria}</span>
                      <span className={styles.categoryCount}>
                        {item.total} atendimento{item.total !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div 
                      className={styles.rankingBar}
                      style={{
                        width: `${(item.total / Math.max(...categoryRanking.map(c => c.total))) * 100}%`
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!selectedUser && (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>📊</div>
          <h3>Selecione um usuário</h3>
          <p>Escolha um usuário da equipe de suporte para visualizar seus dados de performance.</p>
        </div>
      )}
    </div>
  );
} 