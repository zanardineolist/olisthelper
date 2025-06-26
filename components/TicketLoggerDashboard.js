import React, { useState, useEffect } from 'react';
import Select, { components as selectComponents } from 'react-select';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import Swal from 'sweetalert2';
import styles from '../styles/DashboardSuper.module.css';

// Componente de Avatar Padrão
const DefaultAvatar = ({ name, className }) => {
  const getInitials = (name) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const getColorFromName = (name) => {
    if (!name) return '#6B7280';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
      '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  const initials = getInitials(name);
  const bgColor = getColorFromName(name);

  return (
    <div className={className} style={{ 
      background: bgColor, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      color: 'white', 
      fontWeight: '600', 
      fontSize: '1.2rem' 
    }}>
      {initials}
    </div>
  );
};

const UserAvatar = ({ user, className }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  if (!user.image || imageError) {
    return <DefaultAvatar name={user.name} className={className} />;
  }

  return (
    <>
      <img 
        src={user.image} 
        alt={user.name || 'Usuário'} 
        className={className}
        onError={handleImageError}
        onLoad={handleImageLoad}
        style={{ display: imageLoaded ? 'block' : 'none' }}
      />
      {!imageLoaded && !imageError && (
        <DefaultAvatar name={user.name} className={className} />
      )}
    </>
  );
};

// Componente principal
export default function TicketLoggerDashboard({ user }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [hourlyData, setHourlyData] = useState([]);
  const [history, setHistory] = useState([]);
  const [periodFilter, setPeriodFilter] = useState({ value: 'today', label: 'Hoje' });
  const [customDateRange, setCustomDateRange] = useState({
    startDate: dayjs().format('YYYY-MM-DD'),
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

  // Roles válidas para exibição
  const VALID_ROLES = ['support', 'support+', 'analyst', 'tax'];

  const isValidRole = (role) => {
    if (!role || typeof role !== 'string') return false;
    const normalizedRole = role.toLowerCase().trim();
    return VALID_ROLES.includes(normalizedRole);
  };

  // Carregar lista de usuários
  useEffect(() => {
    loadUsers();
  }, []);

  // Mostrar/ocultar seletor de datas personalizadas
  useEffect(() => {
    setShowCustomDatePicker(periodFilter.value === 'custom');
  }, [periodFilter.value]);

  // Carregar dados quando usuário ou período mudar
  useEffect(() => {
    if (selectedUser?.id) {
      fetchUserTicketData();
    }
  }, [selectedUser?.id, periodFilter.value, customDateRange.startDate, customDateRange.endDate]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/get-users');
      if (!res.ok) throw new Error('Erro ao carregar usuários');
      const data = await res.json();
      
      setUsers(data.users || []);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      Swal.fire('Erro', 'Erro ao carregar usuários.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTicketData = async () => {
    if (!selectedUser) return;
    
    try {
      setLoadingData(true);
      
      const { startDate, endDate } = getDateRange();
      
      // Buscar dados do usuário selecionado
      const [todayResponse, hourlyResponse, historyResponse] = await Promise.all([
        fetch(`/api/ticket-logs?type=today-count&userId=${selectedUser.id}`),
        fetch(`/api/ticket-logs?type=hourly-data&userId=${selectedUser.id}`),
        fetch(`/api/ticket-logs?type=history&userId=${selectedUser.id}&startDate=${startDate}&endDate=${endDate}&page=1&pageSize=50`)
      ]);

      if (todayResponse.ok) {
        const todayData = await todayResponse.json();
        setTodayCount(todayData.count || 0);
      }

      if (hourlyResponse.ok) {
        const hourlyDataResult = await hourlyResponse.json();
        setHourlyData(hourlyDataResult.data || []);
      }

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setHistory(historyData.records || []);
      }
      
    } catch (error) {
      console.error('Erro ao buscar dados de chamados:', error);
      Swal.fire('Erro', 'Erro ao buscar dados de chamados.', 'error');
    } finally {
      setLoadingData(false);
    }
  };

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
        startDate = today.format('YYYY-MM-DD');
        endDate = today.format('YYYY-MM-DD');
    }
    
    return { startDate, endDate };
  };

  const handleUserSelect = (selectedOption) => {
    setSelectedUser(selectedOption ? selectedOption.value : null);
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

  const getColorForRole = (role) => {
    switch (role.toLowerCase()) {
      case 'support': return '#779E3D';
      case 'support+': return '#779E3D';
      case 'analyst': return '#0A4EE4';
      case 'tax': return '#8A2BE2';
      case 'super': return '#E64E36';
      default: return '#888';
    }
  };

  const getRoleLabel = (role) => {
    switch (role.toLowerCase()) {
      case 'support': return 'Suporte';
      case 'support+': return 'Suporte+';
      case 'analyst': return 'Analista';
      case 'tax': return 'Fiscal';
      case 'super': return 'Supervisor';
      default: return 'Outro';
    }
  };

  // Estilos personalizados para o React-Select
  const customSelectStyles = {
    container: (provided) => ({
      ...provided,
      width: '100%',
      maxWidth: '500px',
      margin: '0 auto 20px auto',
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

  // Componente customizado para renderizar as opções do Select
  const CustomOption = (props) => {
    return (
      <selectComponents.Option {...props}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span>{props.label}</span>
          <span
            style={{
              backgroundColor: props.data.color,
              color: '#FFF',
              padding: '2px 6px',
              borderRadius: '4px',
              marginLeft: '10px',
              fontSize: '0.8em',
            }}
          >
            {getRoleLabel(props.data.role)}
          </span>
        </div>
      </selectComponents.Option>
    );
  };

  // Preparar dados para o gráfico de barras por hora
  const chartData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`),
    datasets: [{
      label: 'Chamados Registrados',
      data: hourlyData,
      backgroundColor: '#0A4EE4',
      borderColor: '#0A4EE4',
      borderWidth: 1,
      borderRadius: 4,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.parsed.y} chamados registrados`;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: 'var(--text-color)',
          maxRotation: 45,
        },
        grid: {
          color: 'var(--color-border)',
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: 'var(--text-color)',
          stepSize: 1,
        },
        grid: {
          color: 'var(--color-border)',
        }
      }
    }
  };

  return (
    <div className={styles.dashboardContainer}>
      {/* Container para filtros lado a lado */}
      <div className={styles.filtersContainer}>
        {/* Seleção de usuário */}
        <div className={styles.userSelectSection}>
          <h3 className={styles.sectionTitle}>
            <i className="fa-solid fa-users"></i>
            Selecione um Colaborador
          </h3>
          <Select
            options={users
              .filter((user) => user && isValidRole(user.role))
              .map((user) => ({
                value: user,
                label: user.name || 'Nome não disponível',
                role: user.role || 'unknown',
                color: getColorForRole(user.role || 'unknown'),
              }))}
            onChange={handleUserSelect}
            isClearable
            placeholder="Selecione um colaborador"
            styles={customSelectStyles}
            classNamePrefix="react-select"
            noOptionsMessage={() => 'Sem resultados'}
            components={{ Option: CustomOption }}
          />
        </div>

        {/* Filtro de período */}
        <div className={styles.periodFilterSection}>
          <h3 className={styles.sectionTitle}>
            <i className="fa-solid fa-calendar-range"></i>
            Período de Análise
          </h3>
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
                  margin: '0',
                })
              }}
              classNamePrefix="react-select"
            />
            
            {showCustomDatePicker && (
              <div className={styles.customDatePickerContainer}>
                <div className={styles.datePickerWrapper}>
                  <label>De:</label>
                  <input
                    type="date"
                    value={customDateRange.startDate}
                    max={customDateRange.endDate}
                    onChange={handleStartDateChange}
                    className={styles.dateInput}
                  />
                </div>
                <div className={styles.datePickerWrapper}>
                  <label>Até:</label>
                  <input
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
        </div>
      </div>

      {selectedUser && (
        <>
          {/* Seção Overview do Usuário */}
          <section className={styles.userOverviewSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <i className="fa-solid fa-chart-line"></i>
                Registro de Chamados - {selectedUser.name}
              </h2>
              <p className={styles.sectionSubtitle}>
                Acompanhamento detalhado dos registros de chamados do colaborador
              </p>
            </div>

            {/* Card de resumo melhorado */}
            <div className={styles.summaryCard}>
              {loadingData ? (
                <div className={styles.loadingContainer}>
                  <div className="standardBoxLoader"></div>
                </div>
              ) : (
                <>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardIcon}>
                      <i className="fa-solid fa-clipboard-list"></i>
                    </div>
                    <div className={styles.cardTitleSection}>
                      <h3>Resumo do Período - {selectedUser.name}</h3>
                      <p>{periodFilter.label}</p>
                    </div>
                  </div>
                  
                  <div className={styles.summaryMetrics}>
                    <div className={styles.summaryMetricCard}>
                      <div className={styles.metricIcon}>
                        <i className="fa-solid fa-list-check"></i>
                      </div>
                      <div className={styles.metricContent}>
                        <span className={styles.metricValue}>{history.length}</span>
                        <span className={styles.metricLabel}>Total de Registros</span>
                      </div>
                    </div>
                    
                    {periodFilter.value === 'today' && (
                      <div className={styles.summaryMetricCard}>
                        <div className={styles.metricIcon}>
                          <i className="fa-solid fa-calendar-day"></i>
                        </div>
                        <div className={styles.metricContent}>
                          <span className={styles.metricValue}>{todayCount}</span>
                          <span className={styles.metricLabel}>Hoje</span>
                        </div>
                      </div>
                    )}
                    
                    <div className={styles.summaryMetricCard}>
                      <div className={styles.metricIcon}>
                        <i className="fa-solid fa-chart-line"></i>
                      </div>
                      <div className={styles.metricContent}>
                        <span className={styles.metricValue}>
                          {history.length > 0 ? Math.round(history.length / Math.max(1, dayjs(getDateRange().endDate).diff(dayjs(getDateRange().startDate), 'day') + 1)) : 0}
                        </span>
                        <span className={styles.metricLabel}>Média/Dia</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Gráfico por hora (apenas para hoje) */}
          {periodFilter.value === 'today' && (
            <section className={styles.chartSection}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                  <i className="fa-solid fa-chart-bar"></i>
                  Registros por Hora - Hoje
                </h3>
                <p className={styles.sectionSubtitle}>
                  Distribuição dos chamados registrados ao longo do dia
                </p>
              </div>

              <div className={styles.chartCard}>
                {loadingData ? (
                  <div className={styles.loadingContainer}>
                    <div className="standardBoxLoader"></div>
                  </div>
                ) : (
                  <div className={styles.chartContainer}>
                    <Bar data={chartData} options={chartOptions} height={400} />
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Histórico de registros */}
          <section className={styles.historySection}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                <i className="fa-solid fa-history"></i>
                Histórico de Registros
              </h3>
              <p className={styles.sectionSubtitle}>
                Últimos 50 registros do período selecionado
              </p>
            </div>

            <div className={styles.historyCard}>
              {loadingData ? (
                <div className={styles.loadingContainer}>
                  <div className="standardBoxLoader"></div>
                </div>
              ) : history.length > 0 ? (
                <div className={styles.historyTable}>
                  <table>
                    <thead>
                      <tr>
                        <th>Data/Hora</th>
                        <th>Link do Chamado</th>
                        <th>Descrição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((record, index) => (
                        <tr key={index}>
                          <td className={styles.dateCell}>
                            <div>
                              <div>{dayjs(record.logged_date).format('DD/MM/YYYY')}</div>
                              <small>
                                {(() => {
                                  const timeStr = record.logged_time;
                                  if (!timeStr) return '--:--';
                                  
                                  if (timeStr.includes('T') || timeStr.includes(' ')) {
                                    return dayjs(timeStr).format('HH:mm');
                                  }
                                  
                                  if (timeStr.includes(':')) {
                                    const timeParts = timeStr.split(':');
                                    return `${timeParts[0]}:${timeParts[1]}`;
                                  }
                                  
                                  return timeStr;
                                })()}
                              </small>
                            </div>
                          </td>
                          <td>
                            <a 
                              href={record.ticket_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={styles.ticketLink}
                            >
                              <i className="fa-solid fa-external-link"></i>
                              Ver Chamado
                            </a>
                          </td>
                          <td className={styles.descriptionCell}>
                            {record.description || <em>Sem descrição</em>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.noDataMessage}>
                  <i className="fa-solid fa-database"></i>
                  <p>Nenhum registro encontrado no período selecionado.</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
} 