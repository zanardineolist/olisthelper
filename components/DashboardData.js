// components/DashboardData.js
import React, { useState, useEffect } from 'react';
import Select, { components as selectComponents } from 'react-select';
import Swal from 'sweetalert2';
import styles from '../styles/DashboardSuper.module.css';
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
      fetchUserData();
    }
  }, [selectedUser, periodFilter, customDateRange]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/get-users');
      if (!res.ok) throw new Error('Erro ao carregar usuários');
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      Swal.fire('Erro', 'Erro ao carregar usuários.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Função para buscar dados com base no período selecionado
  const fetchUserData = async () => {
    if (!selectedUser) return;
    
    try {
      setLoadingData(true);
      
      // Calcular datas com base no filtro selecionado
      const { startDate, endDate } = getDateRange();
      
      if (selectedUser.role === 'support' || selectedUser.role === 'support+') {
        // Para suporte, carregar desempenho completo
        const [helpResponse, performanceResponse] = await Promise.all([
          fetch(`/api/get-user-help-requests?userEmail=${selectedUser.email}`),
          fetch(`/api/get-user-performance?userEmail=${selectedUser.email}`)
        ]);   

        // Ajudas Solicitadas
        const helpData = await helpResponse.json();
        setHelpRequests({
          currentMonth: helpData.currentMonth,
          lastMonth: helpData.lastMonth,
        });

        // Desempenho do Usuário
        const performanceData = await performanceResponse.json();
        setPerformanceData(performanceData);
        
        // Carrega ranking de categorias separadamente
        fetchUserCategoryRanking(selectedUser.email, startDate, endDate);
        
      } else if (selectedUser.role === 'analyst') {
        // Para analyst, carregar dados de ajudas prestadas, ranking de categorias e total de chamados
        const [helpResponse, performanceResponse] = await Promise.all([
          fetch(`/api/get-analyst-records?analystId=${selectedUser.id}&mode=profile`),
          fetch(`/api/get-user-performance?userEmail=${selectedUser.email}`)
        ]);

        if (!helpResponse.ok || !performanceResponse.ok) {
          throw new Error('Erro ao buscar dados do analista.');
        }

        // Ajudas Prestadas
        const helpData = await helpResponse.json();
        setHelpRequests({
          currentMonth: helpData.currentMonth,
          lastMonth: helpData.lastMonth,
        });

        // Total de Chamados e Data de Atualização
        const performanceData = await performanceResponse.json();
        setPerformanceData({
          totalChamados: performanceData?.chamados?.totalChamados || 0,
          totalAjudas: (helpData.currentMonth || 0) + (performanceData?.chamados?.totalChamados || 0),
          atualizadoAte: performanceData?.atualizadoAte || "Data não disponível",
        });

        // Carrega ranking de categorias separadamente
        fetchAnalystCategoryRanking(selectedUser.id, startDate, endDate);

      } else if (selectedUser.role === 'tax') {
        // Para fiscal, combinar dados do suporte e analyst
        const [helpResponse, performanceResponse] = await Promise.all([
          fetch(`/api/get-analyst-records?analystId=${selectedUser.id}&mode=profile`),
          fetch(`/api/get-user-performance?userEmail=${selectedUser.email}`)
        ]);

        if (!helpResponse.ok || !performanceResponse.ok) {
          throw new Error('Erro ao buscar dados do fiscal.');
        }

        // Ajudas Prestadas (similar ao analyst)
        const helpData = await helpResponse.json();
        setHelpRequests({
          currentMonth: helpData.currentMonth,
          lastMonth: helpData.lastMonth,
        });

        // Indicadores de Desempenho (similar ao suporte)
        const performanceData = await performanceResponse.json();
        setPerformanceData({
          ...performanceData,
          totalChamados: performanceData?.chamados?.totalChamados || 0,
          totalAjudas: (helpData.currentMonth || 0) + (performanceData?.chamados?.totalChamados || 0),
          atualizadoAte: performanceData?.atualizadoAte || "Data não disponível",
        });

        // Carrega ranking de categorias separadamente
        fetchAnalystCategoryRanking(selectedUser.id, startDate, endDate);
      }
      
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      Swal.fire('Erro', 'Erro ao buscar dados do usuário.', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  // Funções para buscar dados específicos de categoria
  const fetchUserCategoryRanking = async (userEmail, startDate, endDate) => {
    try {
      setCategoryLoading(true);
      // API atualizada que aceita parâmetros de data
      const response = await fetch(`/api/get-user-category-ranking?userEmail=${userEmail}&startDate=${startDate}&endDate=${endDate}`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar ranking de categorias.');
      }
      
      const data = await response.json();
      setCategoryRanking(data.categories || []);
    } catch (error) {
      console.error('Erro ao buscar ranking de categorias do usuário:', error);
      setCategoryRanking([]);
    } finally {
      setCategoryLoading(false);
    }
  };

  const fetchAnalystCategoryRanking = async (analystId, startDate, endDate) => {
    try {
      setCategoryLoading(true);
      // Usar a API atualizada com parâmetros de filtro de data
      const response = await fetch(`/api/get-analyst-records?analystId=${analystId}&includeCategoryDetails=true&startDate=${startDate}&endDate=${endDate}`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar ranking de categorias.');
      }
      
      const data = await response.json();
      setCategoryRanking(data.categories || []);
    } catch (error) {
      console.error('Erro ao buscar ranking de categorias do analista:', error);
      setCategoryRanking([]);
    } finally {
      setCategoryLoading(false);
    }
  };

  // Função para calcular datas baseadas no filtro selecionado
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
        startDate = today.startOf('month').format('YYYY-MM-DD');
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

          {/* Adicionando novas tags para Chamado, Telefone e Chat se forem TRUE */}
          {props.data.chamado && (
            <span
              style={{
                backgroundColor: '#C98123',
                color: '#FFF',
                padding: '2px 6px',
                borderRadius: '4px',
                marginLeft: '10px',
                fontSize: '0.8em',
              }}
            >
              Chamado
            </span>
          )}
          {props.data.telefone && (
            <span
              style={{
                backgroundColor: '#BA3A2D',
                color: '#FFF',
                padding: '2px 6px',
                borderRadius: '4px',
                marginLeft: '10px',
                fontSize: '0.8em',
              }}
            >
              Telefone
            </span>
          )}
          {props.data.chat && (
            <span
              style={{
                backgroundColor: '#60871B',
                color: '#FFF',
                padding: '2px 6px',
                borderRadius: '4px',
                marginLeft: '10px',
                fontSize: '0.8em',
              }}
            >
              Chat
            </span>
          )}
        </div>
      </selectComponents.Option>
    );
  };

  // Calcular variação percentual das ajudas
  const { currentMonth, lastMonth } = helpRequests;
  let percentageChange = 0;
  let arrowColor = 'green';
  
  if (lastMonth > 0) {
    percentageChange = ((currentMonth - lastMonth) / lastMonth) * 100;
    arrowColor = percentageChange > 0 ? 'green' : 'red';
  }
  
  const formattedPercentage = Math.abs(percentageChange).toFixed(1);
  const arrowIcon = percentageChange > 0 ? 'fa-arrow-up' : 'fa-arrow-down';

  return (
    <div className={styles.dashboardContainer}>
      {/* Seleção de usuário */}
      <div className={styles.userSelectSection}>
        <h3 className={styles.sectionTitle}>Selecione um Colaborador</h3>
        <Select
          options={users
            .filter((user) => ['support', 'support+', 'analyst', 'tax'].includes(user.role.toLowerCase()))
            .map((user) => ({
              value: user,
              label: user.name,
              role: user.role,
              color: getColorForRole(user.role),
              chamado: user.chamado,
              telefone: user.telefone,
              chat: user.chat,
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

      {selectedUser && (
        <>
          {/* Filtro de período */}
          <div className={styles.periodFilterSection}>
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
                    width: '250px',
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

            <div className={styles.selectedPeriodInfo}>
              <span className={styles.periodLabel}>Período selecionado:</span>
              <span className={styles.periodValue}>
                {periodFilter.value === 'custom' 
                  ? `${dayjs(customDateRange.startDate).format('DD/MM/YYYY')} até ${dayjs(customDateRange.endDate).format('DD/MM/YYYY')}`
                  : periodFilter.label}
              </span>
            </div>
          </div>

          {/* Cards principais */}
          <div className={styles.dashboardMainCards}>
            {/* Perfil do usuário */}
            <div className={styles.profileCard}>
              {loadingData ? (
                <div className={styles.loadingContainer}>
                  <div className="standardBoxLoader"></div>
                </div>
              ) : (
                <>
                  <div className={styles.profileHeader}>
                    <h2>{selectedUser.name}</h2>
                    <p>{selectedUser.email}</p>
                  </div>
                  <div className={styles.tagsContainer}>
                    {(selectedUser.role === 'support' || selectedUser.role === 'support+' || selectedUser.role === 'tax') && performanceData && (
                      <>
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
                      </>
                    )}
                    {(selectedUser.role === 'analyst' || selectedUser.role === 'tax') && (
                      <div className={styles.tag} style={{ backgroundColor: getColorForRole(selectedUser.role) }}>
                        #{getRoleLabel(selectedUser.role)}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Métricas de ajuda */}
            <div className={styles.metricsCard}>
              {loadingData ? (
                <div className={styles.loadingContainer}>
                  <div className="standardBoxLoader"></div>
                </div>
              ) : (
                <>
                  <h3 className={styles.metricsTitle}>
                    {selectedUser.role === 'support' || selectedUser.role === 'support+' 
                      ? 'Ajudas Solicitadas' 
                      : 'Ajudas Prestadas'}
                  </h3>
                  <div className={styles.metricsGrid}>
                    <div className={styles.metricItem}>
                      <div className={styles.metricValue}>{currentMonth}</div>
                      <div className={styles.metricLabel}>Período atual</div>
                    </div>
                    <div className={styles.metricItem}>
                      <div className={styles.metricValue}>{lastMonth}</div>
                      <div className={styles.metricLabel}>Período anterior</div>
                    </div>
                    <div className={styles.metricItem}>
                      <div className={styles.variationWrapper}>
                        <div className={styles.variationValue} style={{ color: arrowColor }}>
                          {formattedPercentage}%
                        </div>
                        <i className={`fa-solid ${arrowIcon}`} style={{ color: arrowColor }}></i>
                      </div>
                      <div className={styles.metricLabel}>Variação</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Painel de indicadores */}
          {(selectedUser.role === 'support' || selectedUser.role === 'support+' || selectedUser.role === 'tax') && (
            <div className={styles.performanceGridContainer}>
              {loadingData ? (
                <div className={styles.loadingContainer}>
                  <div className="standardBoxLoader"></div>
                </div>
              ) : (
                <>
                  {performanceData?.chamados && (
                    <div className={styles.performanceCard}>
                      <div className={styles.performanceHeader}>
                        <h3>Indicadores Chamados</h3>
                        <span className={styles.periodBadge}>
                          {performanceData?.atualizadoAte || "Data não disponível"}
                        </span>
                      </div>
                      <div className={styles.performanceMetrics}>
                        <div className={styles.performanceMetric}>
                          <span className={styles.metricValue}>{performanceData.chamados.totalChamados}</span>
                          <span className={styles.metricLabel}>Total Chamados</span>
                        </div>
                        <div 
                          className={styles.performanceMetric} 
                          style={{ backgroundColor: performanceData.chamados.colors.mediaPorDia || 'var(--box-color3)' }}
                        >
                          <span className={styles.metricValue}>{performanceData.chamados.mediaPorDia}</span>
                          <span className={styles.metricLabel}>Média/Dia</span>
                        </div>
                        <div 
                          className={styles.performanceMetric}
                          style={{ backgroundColor: performanceData.chamados.colors.tma || 'var(--box-color3)' }}
                        >
                          <span className={styles.metricValue}>{performanceData.chamados.tma}</span>
                          <span className={styles.metricLabel}>TMA</span>
                        </div>
                        <div 
                          className={styles.performanceMetric}
                          style={{ backgroundColor: performanceData.chamados.colors.csat || 'var(--box-color3)' }}
                        >
                          <span className={styles.metricValue}>{performanceData.chamados.csat}</span>
                          <span className={styles.metricLabel}>CSAT</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {performanceData?.telefone && (
                    <div className={styles.performanceCard}>
                      <div className={styles.performanceHeader}>
                        <h3>Indicadores Telefone</h3>
                        <span className={styles.periodBadge}>
                          {performanceData?.atualizadoAte || "Data não disponível"}
                        </span>
                      </div>
                      <div className={styles.performanceMetrics}>
                        <div className={styles.performanceMetric}>
                          <span className={styles.metricValue}>{performanceData.telefone.totalTelefone}</span>
                          <span className={styles.metricLabel}>Total Ligações</span>
                        </div>
                        <div 
                          className={styles.performanceMetric}
                          style={{ backgroundColor: performanceData.telefone.colors.tma || 'var(--box-color3)' }}
                        >
                          <span className={styles.metricValue}>{performanceData.telefone.tma}</span>
                          <span className={styles.metricLabel}>TMA</span>
                        </div>
                        <div 
                          className={styles.performanceMetric}
                          style={{ backgroundColor: performanceData.telefone.colors.csat || 'var(--box-color3)' }}
                        >
                          <span className={styles.metricValue}>{performanceData.telefone.csat}</span>
                          <span className={styles.metricLabel}>CSAT</span>
                        </div>
                        <div className={styles.performanceMetric}>
                          <span className={styles.metricValue}>{performanceData.telefone.perdidas}</span>
                          <span className={styles.metricLabel}>Perdidas</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {performanceData?.chat && (
                    <div className={styles.performanceCard}>
                      <div className={styles.performanceHeader}>
                        <h3>Indicadores Chat</h3>
                        <span className={styles.periodBadge}>
                          {performanceData?.atualizadoAte || "Data não disponível"}
                        </span>
                      </div>
                      <div className={styles.performanceMetrics}>
                        <div className={styles.performanceMetric}>
                          <span className={styles.metricValue}>{performanceData.chat.totalChats}</span>
                          <span className={styles.metricLabel}>Total Chats</span>
                        </div>
                        <div 
                          className={styles.performanceMetric}
                          style={{ backgroundColor: performanceData.chat.colors.tma || 'var(--box-color3)' }}
                        >
                          <span className={styles.metricValue}>{performanceData.chat.tma}</span>
                          <span className={styles.metricLabel}>TMA</span>
                        </div>
                        <div 
                          className={styles.performanceMetric}
                          style={{ backgroundColor: performanceData.chat.colors.csat || 'var(--box-color3)' }}
                        >
                          <span className={styles.metricValue}>{performanceData.chat.csat}</span>
                          <span className={styles.metricLabel}>CSAT</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Métricas de analista */}
          {selectedUser.role === 'analyst' && (
            <div className={styles.analystMetricsContainer}>
              <div className={styles.analystMetricCard}>
                {loadingData ? (
                  <div className={styles.loadingContainer}>
                    <div className="standardBoxLoader"></div>
                  </div>
                ) : (
                  <>
                    <h3>Total de RFC</h3>
                    <p className={styles.periodInfo}>
                      {performanceData?.atualizadoAte || 'Data não disponível'}
                    </p>
                    <div className={styles.bigMetricValue}>
                      {performanceData?.totalChamados || 0}
                    </div>
                  </>
                )}
              </div>

              <div className={styles.analystMetricCard}>
                {loadingData ? (
                  <div className={styles.loadingContainer}>
                    <div className="standardBoxLoader"></div>
                  </div>
                ) : (
                  <>
                    <h3>Total de Ajudas</h3>
                    <p className={styles.metricHelpText}>
                      (ajudas prestadas + RFC)
                    </p>
                    <div className={styles.bigMetricValue}>
                      {(helpRequests.currentMonth || 0) + (performanceData?.totalChamados || 0)}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Ranking de Categorias */}
          <div className={styles.categoryRankingCard}>
            {categoryLoading ? (
              <div className={styles.loadingContainer}>
                <div className="standardBoxLoader"></div>
              </div>
            ) : (
              <>
                <h3 className={styles.categoryTitle}>
                  {selectedUser.role === 'support' || selectedUser.role === 'support+' 
                    ? 'Top 10 - Temas de maior dúvida' 
                    : 'Top 10 - Temas mais auxiliados'}
                </h3>
                
                {categoryRanking.length > 0 ? (
                  <div className={styles.categoryContent}>
                    {/* Gráfico de barras */}
                    <div className={styles.chartContainer}>
                      <Bar 
                        data={{
                          labels: categoryRanking.map(cat => cat.name),
                          datasets: [{
                            label: 'Ocorrências',
                            data: categoryRanking.map(cat => cat.count),
                            backgroundColor: categoryRanking.map(cat => 
                              cat.count > (selectedUser.role === 'support' ? 10 : 50) 
                                ? '#F0A028' 
                                : '#0A4EE4'
                            ),
                            borderWidth: 0,
                            borderRadius: 4
                          }]
                        }}
                        options={{
                          indexAxis: 'y',
                          plugins: {
                            legend: {
                              display: false
                            },
                            tooltip: {
                              callbacks: {
                                label: function(context) {
                                  return `${context.raw} pedidos de ajuda`;
                                }
                              }
                            }
                          },
                          scales: {
                            x: {
                              ticks: {
                                color: 'var(--text-color)',
                              },
                              grid: {
                                color: 'var(--color-border)',
                              }
                            },
                            y: {
                              ticks: {
                                color: 'var(--text-color)',
                              },
                              grid: {
                                display: false
                              }
                            }
                          },
                          maintainAspectRatio: false
                        }}
                      />
                    </div>

                    {/* Lista de categorias */}
                    <ul className={styles.categoryList}>
                      {categoryRanking.map((category, index) => (
                        <li key={index} className={styles.categoryItem}>
                          <div className={styles.categoryHeader}>
                            <span className={styles.categoryRank}>{index + 1}</span>
                            <span className={styles.categoryName}>{category.name}</span>
                            <span className={styles.categoryCount}>
                              {category.count} pedidos
                              {category.count > (selectedUser.role === 'support' ? 10 : 50) && (
                                <i className="fa-solid fa-circle-exclamation" style={{ color: '#F0A028', marginLeft: '8px' }}></i>
                              )}
                            </span>
                          </div>
                          <div className={styles.progressBarContainer}>
                            <div 
                              className={styles.progressBar}
                              style={{
                                width: `${Math.min((category.count / (selectedUser.role === 'support' ? 20 : 50)) * 100, 100)}%`,
                                backgroundColor: category.count > (selectedUser.role === 'support' ? 10 : 50) ? '#F0A028' : '#0A4EE4',
                              }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className={styles.noDataMessage}>
                    <i className="fa-solid fa-database"></i>
                    <p>Nenhum registro de tema localizado no período selecionado.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}