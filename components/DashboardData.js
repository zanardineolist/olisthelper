// components/DashboardData.js
import React, { useState, useEffect } from 'react';
import Select, { components as selectComponents } from 'react-select';
import Swal from 'sweetalert2';
import styles from '../styles/DashboardSuper.module.css';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import ProgressIndicator from './ProgressIndicator';

// Componente de Avatar Padrão em SVG
const DefaultAvatar = ({ name, className }) => {
  // Pegar as iniciais do nome
  const getInitials = (name) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  // Gerar cor baseada no nome
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
    <div className={className} style={{ background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '600', fontSize: '1.2rem' }}>
      {initials}
    </div>
  );
};

// Componente para Avatar com fallback
const UserAvatar = ({ user, className }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // Se não tem imagem ou houve erro, mostrar avatar padrão
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

// Componente para card de performance atualizado (igual ao profile.js)
const PerformanceCard = ({ title, icon, data, type }) => {
  if (!data) return null;

  const getOverallStatus = () => {
    if (!data.status) return 'neutral';
    
    const statuses = Object.values(data.status);
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
    if (data.total !== undefined && data.total !== null) {
      metrics.push({
        label: type === 'chamados' ? 'Total Chamados' : 
               type === 'telefone' ? 'Total Ligações' : 'Total Conversas',
        value: data.total,
        icon: type === 'chamados' ? 'fa-ticket' : 
              type === 'telefone' ? 'fa-phone-volume' : 'fa-message',
        type: 'primary'
      });
    }
    
    if (data.mediaDia !== undefined && data.mediaDia !== null) {
      metrics.push({
        label: 'Média por Dia',
        value: data.mediaDia,
        icon: 'fa-calendar-day',
        type: 'secondary'
      });
    }
    
    if (data.perdidas !== undefined && data.perdidas !== null) {
      metrics.push({
        label: 'Perdidas',
        value: data.perdidas,
        icon: 'fa-phone-slash',
        type: data.perdidas === 0 ? 'excellent' : 'warning'
      });
    }

    return metrics;
  };

  const renderKPIMetrics = () => {
    const kpis = [];
    
    if (data.tma !== undefined && data.tma !== null && data.tma !== "-") {
      kpis.push({ 
        label: 'TMA', 
        value: data.tma,
        status: data.status?.tma || 'neutral',
        icon: 'fa-stopwatch'
      });
    }
    
    if (data.csat !== undefined && data.csat !== null && data.csat !== "-") {
      kpis.push({ 
        label: 'CSAT', 
        value: data.csat,
        status: data.status?.csat || 'neutral',
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

// Roles válidas para exibição no dashboard
  const VALID_ROLES = ['support', 'analyst', 'tax'];

// Função para verificar se a role é válida
const isValidRole = (role) => {
  if (!role || typeof role !== 'string') return false;
  const normalizedRole = role.toLowerCase().trim();
  return VALID_ROLES.includes(normalizedRole);
};

export default function DashboardData({ user, users: usersFromProps = [] }) {
  // Estados básicos
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [helpRequests, setHelpRequests] = useState({ currentMonth: 0, lastMonth: 0 });
  const [categoryRanking, setCategoryRanking] = useState([]);
  const [performanceData, setPerformanceData] = useState(null);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  
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

  // Carregar lista de usuários (apenas uma vez)
  useEffect(() => {
    if (Array.isArray(usersFromProps) && usersFromProps.length > 0) {
      setUsers(usersFromProps);
      return;
    }
    loadUsers();
  }, [usersFromProps]);

  // Exibir/ocultar o seletor de datas personalizadas
  useEffect(() => {
    setShowCustomDatePicker(periodFilter.value === 'custom');
  }, [periodFilter.value]);

  // Carregar dados quando o usuário ou período mudar
  useEffect(() => {
    if (selectedUser?.id) {
      fetchUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Função para buscar dados com base no período selecionado
  const fetchUserData = async () => {
    if (!selectedUser) return;
    
    try {
      setLoadingData(true);
      
      // Calcular datas com base no filtro selecionado
      const { startDate, endDate } = getDateRange();
      
              if (selectedUser.role === 'support') {
        // Para suporte, usar a mesma lógica do profile.js
        const [helpResponse, categoryResponse, performanceResponse] = await Promise.all([
          fetch(`/api/get-user-help-requests?userEmail=${selectedUser.email}`),
          fetch(`/api/get-user-category-ranking?userEmail=${selectedUser.email}&startDate=${startDate}&endDate=${endDate}`),
          fetch(`/api/get-user-performance?userEmail=${selectedUser.email}`)
        ]);

        const helpData = await helpResponse.json();
        setHelpRequests({
          currentMonth: helpData.currentMonth,
          lastMonth: helpData.lastMonth,
        });

        const categoryData = await categoryResponse.json();
        setCategoryRanking(categoryData.categories || []);

        const performanceDataResult = await performanceResponse.json();
        setPerformanceData(performanceDataResult);
        
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
          totalChamados: performanceData?.chamados?.total || 0,
          totalAjudas: (helpData.currentMonth || 0) + (performanceData?.chamados?.total || 0),
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
        const performanceDataResult = await performanceResponse.json();
        setPerformanceData(performanceDataResult);

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
      // API atualizada que aceita parâmetros de data e inclui ajudas entre agentes
      const response = await fetch(`/api/get-user-category-ranking?userEmail=${userEmail}&startDate=${startDate}&endDate=${endDate}&includeAgentHelps=true`);
      
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
      // Removido support+ do sistema modular
      case 'analyst': return '#0A4EE4';
      case 'tax': return '#8A2BE2';
      case 'super': return '#E64E36';
      default: return '#888';
    }
  };

  const getRoleLabel = (role) => {
    switch (role.toLowerCase()) {
      case 'support': return 'Suporte';
      // Removido support+ do sistema modular
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

          {/* Supervisor tag */}
          {props.data.supervisor && (
            <span
              style={{
                backgroundColor: '#8A2BE2',
                color: '#FFF',
                padding: '2px 6px',
                borderRadius: '4px',
                marginLeft: '10px',
                fontSize: '0.8em',
              }}
            >
              {props.data.supervisor}
            </span>
          )}

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
  let arrowColor = 'var(--neutral-color)';
  let arrowIcon = 'fa-minus';
  
  if (lastMonth > 0) {
    percentageChange = ((currentMonth - lastMonth) / lastMonth) * 100;
    
    // Lógica invertida: diminuição é positiva (verde), aumento é negativa (vermelho)
    if (currentMonth < lastMonth) {
      // Diminuição das ajudas = bom (verde com seta para baixo)
      arrowColor = 'var(--excellent-color)';
      arrowIcon = 'fa-arrow-down';
    } else if (currentMonth > lastMonth) {
      // Aumento das ajudas = ruim (vermelho com seta para cima)
      arrowColor = 'var(--poor-color)';
      arrowIcon = 'fa-arrow-up';
    } else {
      // Igual = neutro
      arrowColor = 'var(--neutral-color)';
      arrowIcon = 'fa-minus';
    }
  }
  
  const formattedPercentage = Math.abs(percentageChange).toFixed(1);

  // Componente do Modal de Informações
  const InfoModal = () => {
    const [targets, setTargets] = useState(null);
    const [loadingTargets, setLoadingTargets] = useState(true);

    useEffect(() => {
      const fetchTargets = async () => {
        try {
          const response = await fetch('/api/get-targets');
          const data = await response.json();
          
          if (data.success) {
            setTargets(data.targets);
          }
        } catch (error) {
          console.error('Erro ao buscar metas:', error);
        } finally {
          setLoadingTargets(false);
        }
      };

      fetchTargets();
    }, []);

    // Valores padrão caso não consiga buscar do banco
    const defaultTargets = {
      chamados: { quantity: 600, tma_hours: 30, csat_percent: 90, quality_percent: 80 },
      telefone: { tma_minutes: '15:00', csat_rating: 4.5, quality_percent: 80 },
      chat: { quantity: 32, tma_minutes: '15:00', csat_score: 95, quality_percent: 80 }
    };

    const finalTargets = targets || defaultTargets;

    return (
      <div className={styles.modalOverlay} onClick={() => setShowInfoModal(false)}>
        <div className={styles.infoModal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3>
              <i className="fa-solid fa-info-circle"></i>
              Como Funcionam os Indicadores
            </h3>
            <button 
              className={styles.closeButton}
              onClick={() => setShowInfoModal(false)}
            >
              <i className="fa-solid fa-times"></i>
            </button>
          </div>
          
          <div className={styles.modalContent}>
            {loadingTargets && (
              <div className={styles.loadingContainer}>
                <div className="standardBoxLoader"></div>
                <p>Carregando metas...</p>
              </div>
            )}

            {!loadingTargets && (
              <>
                <div className={styles.colorLegend}>
                  <h4>🎯 Significado das Cores</h4>
                  <div className={styles.legendItem}>
                    <span className={`${styles.colorIndicator} ${styles.excellent}`}></span>
                    <strong>🟢 Verde (Excelente)</strong> - Meta atingida ou superada
                  </div>
                  <div className={styles.legendItem}>
                    <span className={`${styles.colorIndicator} ${styles.good}`}></span>
                    <strong>🟡 Amarelo (Bom)</strong> - Performance satisfatória, pode melhorar
                  </div>
                  <div className={styles.legendItem}>
                    <span className={`${styles.colorIndicator} ${styles.poor}`}></span>
                    <strong>🔴 Vermelho (Atenção)</strong> - Abaixo do esperado, precisa apoio
                  </div>
                  <div className={styles.legendItem}>
                    <span className={`${styles.colorIndicator} ${styles.neutral}`}></span>
                    <strong>⚪ Cinza (Neutro)</strong> - Dados não disponíveis
                  </div>
                </div>

                <div className={styles.criteriaSection}>
                  <h4>📊 Critérios por Indicador</h4>
                  
                  {finalTargets.chamados && (
                    <div className={styles.criteriaItem}>
                      <h5>📞 Quantidade de Chamados (Meta: {finalTargets.chamados.quantity}/mês)</h5>
                      <ul>
                        <li>🟢 Verde: {finalTargets.chamados.quantity}+ chamados (100%+)</li>
                        <li>🟡 Amarelo: {Math.round(finalTargets.chamados.quantity * 0.5)}-{finalTargets.chamados.quantity - 1} chamados (50-99%)</li>
                        <li>🔴 Vermelho: 0-{Math.round(finalTargets.chamados.quantity * 0.5) - 1} chamados (0-49%)</li>
                      </ul>
                    </div>
                  )}

                  <div className={styles.criteriaItem}>
                    <h5>⏱️ TMA - Tempo Médio (Menor é melhor!)</h5>
                    <ul>
                      {finalTargets.chamados && (
                        <>
                          <li><strong>Chamados (Meta: {finalTargets.chamados.tma_hours}h):</strong></li>
                          <li>🟢 Verde: até {finalTargets.chamados.tma_hours}h | 🟡 Amarelo: {finalTargets.chamados.tma_hours}-{Math.round(finalTargets.chamados.tma_hours * 1.5)}h | 🔴 Vermelho: acima {Math.round(finalTargets.chamados.tma_hours * 1.5)}h</li>
                        </>
                      )}
                      {(finalTargets.telefone || finalTargets.chat) && (
                        <>
                          <li><strong>Telefone/Chat (Meta: {finalTargets.telefone?.tma_minutes || finalTargets.chat?.tma_minutes}):</strong></li>
                          <li>🟢 Verde: até {finalTargets.telefone?.tma_minutes || finalTargets.chat?.tma_minutes} | 🟡 Amarelo: {finalTargets.telefone?.tma_minutes || finalTargets.chat?.tma_minutes}-22min | 🔴 Vermelho: acima 22min</li>
                        </>
                      )}
                    </ul>
                  </div>

                  <div className={styles.criteriaItem}>
                    <h5>😊 CSAT - Satisfação do Cliente</h5>
                    <ul>
                      {finalTargets.chamados && (
                        <>
                          <li><strong>Chamados (0-100%, Meta: {finalTargets.chamados.csat_percent}%):</strong></li>
                          <li>🟢 Verde: {finalTargets.chamados.csat_percent}%+ | 🟡 Amarelo: {Math.round(finalTargets.chamados.csat_percent * 0.8)}-{finalTargets.chamados.csat_percent - 1}% | 🔴 Vermelho: abaixo {Math.round(finalTargets.chamados.csat_percent * 0.8)}%</li>
                        </>
                      )}
                      {finalTargets.telefone && (
                        <>
                          <li><strong>Telefone (1-5, Meta: {finalTargets.telefone.csat_rating}):</strong></li>
                          <li>🟢 Verde: {finalTargets.telefone.csat_rating}+ | 🟡 Amarelo: {Math.round(finalTargets.telefone.csat_rating * 0.8 * 10) / 10}-{finalTargets.telefone.csat_rating - 0.1} | 🔴 Vermelho: abaixo {Math.round(finalTargets.telefone.csat_rating * 0.8 * 10) / 10}</li>
                        </>
                      )}
                      {finalTargets.chat && (
                        <>
                          <li><strong>Chat (0-100, Meta: {finalTargets.chat.csat_score}):</strong></li>
                          <li>🟢 Verde: {finalTargets.chat.csat_score}+ | 🟡 Amarelo: {Math.round(finalTargets.chat.csat_score * 0.8)}-{finalTargets.chat.csat_score - 1} | 🔴 Vermelho: abaixo {Math.round(finalTargets.chat.csat_score * 0.8)}</li>
                        </>
                      )}
                    </ul>
                  </div>

                  <div className={styles.criteriaItem}>
                    <h5>⭐ Qualidade (Meta: {finalTargets.chamados?.quality_percent || finalTargets.telefone?.quality_percent || finalTargets.chat?.quality_percent}%)</h5>
                    <ul>
                      <li>🟢 Verde: {finalTargets.chamados?.quality_percent || finalTargets.telefone?.quality_percent || finalTargets.chat?.quality_percent}%+ | 🟡 Amarelo: {Math.round((finalTargets.chamados?.quality_percent || finalTargets.telefone?.quality_percent || finalTargets.chat?.quality_percent) * 0.8)}-{(finalTargets.chamados?.quality_percent || finalTargets.telefone?.quality_percent || finalTargets.chat?.quality_percent) - 1}% | 🔴 Vermelho: abaixo {Math.round((finalTargets.chamados?.quality_percent || finalTargets.telefone?.quality_percent || finalTargets.chat?.quality_percent) * 0.8)}%</li>
                    </ul>
                  </div>
                </div>

                <div className={styles.tipSection}>
                  <h4>💡 Como Funciona a Cor do Card</h4>
                  <p>O card geral usa uma <strong>lógica balanceada</strong>:</p>
                  <ul>
                    <li>🟢 <strong>Verde</strong>: Todas as métricas estão excelentes</li>
                    <li>🔴 <strong>Vermelho</strong>: Mais de 50% das métricas precisam de atenção crítica</li>
                    <li>🟡 <strong>Amarelo</strong>: Mix de métricas ou situação equilibrada</li>
                    <li>⚪ <strong>Cinza</strong>: Dados insuficientes ou zerados</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.dashboardContainer}>
      {/* Modal de Informações */}
      {showInfoModal && <InfoModal />}
      
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
              .filter((u) => u && u.active && isValidRole(u.role))
              .map((u) => ({
                value: u,
                label: `${u.name || 'Nome não disponível'}${u.squad ? ` · #${u.squad}` : ''}`,
                role: (u.role || 'unknown').toLowerCase(),
                color: getColorForRole(u.role || 'unknown'),
                supervisor: u.supervisor || null,
                chamado: u.chamado || false,
                telefone: u.telefone || false,
                chat: u.chat || false,
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
                <i className="fa-solid fa-user-circle"></i>
                Overview do Colaborador
              </h2>
            </div>

            <div className={styles.overviewGrid}>
              {/* Perfil do usuário */}
              <div className={styles.profileExpandedCard}>
                {loadingData ? (
                  <div className={styles.loadingContainer}>
                    <div className="standardBoxLoader"></div>
                  </div>
                ) : (
                  <>
                    <div className={styles.profileContentGrid}>
                      {/* Informações básicas do usuário */}
                      <div className={styles.profileBasicInfo}>
                        <div className={styles.profileMainInfo}>
                          <UserAvatar 
                            user={selectedUser} 
                            className={styles.profileImage} 
                          />
                          <div className={styles.profileDetails}>
                            <h3>{selectedUser.name || 'Nome não disponível'}</h3>
                            <p>{selectedUser.email || 'Email não disponível'}</p>
                            <div 
                              className={`${styles.roleTag} ${selectedUser.role === 'tax' ? styles.tax : ''}`}
                            >
                              <i className="fa-solid fa-user-tie"></i>
                              {getRoleLabel(selectedUser.role)}
                            </div>
                          </div>
                        </div>
                        
                        <div className={styles.tagsContainer}>
                          {/* Supervisor tag */}
                          {(selectedUser.supervisor || performanceData?.supervisor) && (
                            <div className={styles.tag || ''} style={{ backgroundColor: '#8A2BE2' }}>
                              <i className="fa-solid fa-user-crown"></i>
                              {selectedUser.supervisor || performanceData?.supervisor}
                            </div>
                          )}
                          
                          {(selectedUser.role === 'support' || selectedUser.role === 'tax') && performanceData && (
                            <>
                              {performanceData?.squad && (
                                <div className={styles.tag || ''} style={{ backgroundColor: '#0A4EE4' }}>
                                  #{performanceData.squad}
                                </div>
                              )}
                              {performanceData?.chamado && (
                                <div className={styles.tag || ''} style={{ backgroundColor: '#F0A028' }}>
                                  #Chamado
                                </div>
                              )}
                              {performanceData?.telefone && (
                                <div className={styles.tag || ''} style={{ backgroundColor: '#E64E36' }}>
                                  #Telefone
                                </div>
                              )}
                              {performanceData?.chat && (
                                <div className={styles.tag || ''} style={{ backgroundColor: '#779E3D' }}>
                                  #Chat
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Métricas de Absenteísmo */}
                      {(selectedUser.role === 'support' || selectedUser.role === 'tax') && performanceData && (
                        <div className={styles.absMetricsSection}>
                          <h4 className={styles.absTitle}>
                            <i className="fa-solid fa-calendar-check"></i>
                            Dados de Presença
                          </h4>
                          {performanceData.atualizadoAte && (
                            <p className={styles.sectionSubtitle} style={{ fontSize: '0.85rem', color: 'var(--text-color2)', marginBottom: '15px', marginTop: '5px' }}>
                              Período: {performanceData.atualizadoAte}
                            </p>
                          )}
                          <div className={styles.absMetrics}>
                            <div className={styles.absMetricItem}>
                              <div className={styles.absMetricIcon}>
                                <i className="fa-solid fa-calendar-days"></i>
                              </div>
                              <div className={styles.absMetricData}>
                                <span className={styles.absMetricValue}>{performanceData?.diasTrabalhados || 0}</span>
                                <span className={styles.absMetricLabel}>Dias Trabalhados</span>
                                <span className={styles.absMetricSubtext}>/ {performanceData?.diasUteis || 0} dias úteis</span>
                              </div>
                            </div>
                            
                            <div className={styles.absMetricItem}>
                              <div className={styles.absMetricIcon}>
                                <i className="fa-solid fa-chart-line"></i>
                              </div>
                              <div className={styles.absMetricData}>
                                <span className={styles.absMetricValue}>{performanceData?.absenteismo || 0}%</span>
                                <span className={styles.absMetricLabel}>Absenteísmo</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Métricas de ajuda */}
              <div className={styles.helpExpandedCard || ''}>
                {loadingData ? (
                  <div className={styles.loadingContainer || ''}>
                    <div className="standardBoxLoader"></div>
                  </div>
                ) : (
                  <>
                    <div className={styles.cardHeader || ''}>
                      <h3 className={styles.cardTitle || ''}>
                        <i className="fa-solid fa-heart-hand"></i>
                        {selectedUser.role === 'support'
                          ? 'Ajudas Solicitadas' 
                          : 'Ajudas Prestadas'}
                      </h3>
                    </div>
                    
                    <div className={styles.helpStatsExpanded || ''}>
                      <div className={styles.helpStatMain || ''}>
                        <div className={styles.helpStatIcon || ''}>
                          <i className="fa-solid fa-calendar"></i>
                        </div>
                        <div className={styles.helpStatContent || ''}>
                          <span className={styles.helpStatValue || ''}>{currentMonth}</span>
                          <span className={styles.helpStatLabel || ''}>Período Atual</span>
                        </div>
                      </div>
                      
                      <div className={styles.helpStatMain || ''}>
                        <div className={styles.helpStatIcon || ''}>
                          <i className="fa-solid fa-calendar-xmark"></i>
                        </div>
                        <div className={styles.helpStatContent || ''}>
                          <span className={styles.helpStatValue || ''}>{lastMonth}</span>
                          <span className={styles.helpStatLabel || ''}>Período Anterior</span>
                        </div>
                      </div>
                      
                      <div className={styles.helpStatMain || ''}>
                        <div className={styles.helpStatIcon || ''}>
                          <i className={`fa-solid ${arrowIcon}`} style={{ color: arrowColor }}></i>
                        </div>
                        <div className={styles.helpStatContent || ''}>
                          <span className={styles.helpStatValue || ''} style={{ color: arrowColor }}>
                            {formattedPercentage}%
                          </span>
                          <span className={styles.helpStatLabel || ''}>Variação</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Seção de Progresso da Meta */}
          {selectedUser.role === 'support' && (
            <section className={styles.progressSection}>
              {loadingData ? (
                <div className={styles.loadingContainer}>
                  <div className="standardBoxLoader"></div>
                </div>
              ) : performanceData ? (
                <>
                  {/* Progresso de Chamados */}
                  {performanceData.chamados && (
                    <ProgressIndicator
                      current={performanceData.chamados.total || 0}
                      target={performanceData.chamados.target?.quantity || 600}
                      type="chamados"
                    />
                  )}
                  
                  {/* Progresso de Chat se for o único canal */}
                  {!performanceData.chamados && performanceData.chat && (
                    <ProgressIndicator
                      current={performanceData.chat.total || 0}
                      target={performanceData.chat.target?.quantity || 32}
                      type="chat"
                    />
                  )}
                </>
              ) : null}
            </section>
          )}

          {/* Seção de Indicadores de Performance */}
          {(selectedUser.role === 'support' || selectedUser.role === 'tax') && (
            <section className={styles.performanceSection}>
              {loadingData ? (
                <>
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionTitleWithInfo}>
                      <h2 className={styles.sectionTitle}>
                        <i className="fa-solid fa-chart-bar"></i>
                        Indicadores de Performance
                      </h2>
                      <button 
                        className={styles.infoButton}
                        onClick={() => setShowInfoModal(true)}
                        title="Como funcionam os indicadores"
                      >
                        <i className="fa-solid fa-info-circle"></i>
                      </button>
                    </div>
                  </div>
                  <div className={styles.loadingContainer}>
                    <div className="standardBoxLoader"></div>
                  </div>
                </>
              ) : performanceData ? (
                <>
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionTitleWithInfo}>
                      <h2 className={styles.sectionTitle}>
                        <i className="fa-solid fa-chart-bar"></i>
                        Indicadores de Performance
                      </h2>
                      <button 
                        className={styles.infoButton}
                        onClick={() => setShowInfoModal(true)}
                        title="Como funcionam os indicadores"
                      >
                        <i className="fa-solid fa-info-circle"></i>
                      </button>
                    </div>
                    <p className={styles.sectionSubtitle}>
                      Período: {performanceData.atualizadoAte || "Data não disponível"}
                    </p>
                  </div>
                  <div className={styles.performanceGrid}>
                    {performanceData.chamados && (
                      <PerformanceCard 
                        title="Indicadores Chamados"
                        icon="fa-ticket"
                        data={performanceData.chamados}
                        type="chamados"
                      />
                    )}
                    
                    {performanceData.telefone && (
                      <PerformanceCard 
                        title="Indicadores Telefone"
                        icon="fa-phone"
                        data={performanceData.telefone}
                        type="telefone"
                      />
                    )}
                    
                    {performanceData.chat && (
                      <PerformanceCard 
                        title="Indicadores Chat"
                        icon="fa-comments"
                        data={performanceData.chat}
                        type="chat"
                      />
                    )}
                  </div>
                </>
              ) : null}
            </section>
          )}

          {/* Métricas específicas de analista/fiscal */}
          {(selectedUser.role === 'analyst' || selectedUser.role === 'tax') && (
            <section className={styles.analystSpecificSection}>
              {loadingData ? (
                <>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                      <i className="fa-solid fa-chart-line"></i>
                      Métricas de {selectedUser.role === 'analyst' ? 'Analista' : 'Fiscal'}
                    </h2>
                  </div>
                  <div className={styles.loadingContainer}>
                    <div className="standardBoxLoader"></div>
                  </div>
                </>
              ) : (performanceData || helpRequests) ? (
                <>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                      <i className="fa-solid fa-chart-line"></i>
                      Métricas de {selectedUser.role === 'analyst' ? 'Analista' : 'Fiscal'}
                    </h2>
                  </div>
                  
                  <div className={styles.analystMetricsGrid}>
                    <div className={styles.analystMetricCard || ''}>
                      <div className={styles.analystMetricHeader || ''}>
                        <i className="fa-solid fa-clipboard-check"></i>
                        <h3>RFC</h3>
                      </div>
                      <p className={styles.periodInfo || ''}>
                        {performanceData?.atualizadoAte || 'Data não disponível'}
                      </p>
                      <div className={styles.bigMetricValue || ''}>
                        {performanceData?.rfc || '-'}
                      </div>
                    </div>

                    <div className={styles.analystMetricCard || ''}>
                      <div className={styles.analystMetricHeader || ''}>
                        <i className="fa-solid fa-star"></i>
                        <h3>Nota Qualidade</h3>
                      </div>
                      <p className={styles.metricHelpText || ''}>
                        Avaliação de qualidade
                      </p>
                      <div className={styles.bigMetricValue || ''}>
                        {performanceData?.notaQualidade || performanceData?.nota_qualidade || '-'}
                      </div>
                    </div>

                    <div className={styles.analystMetricCard || ''}>
                      <div className={styles.analystMetricHeader || ''}>
                        <i className="fa-solid fa-handshake-angle"></i>
                        <h3>Total de Ajudas</h3>
                      </div>
                      <p className={styles.metricHelpText || ''}>
                        Ajudas prestadas no período
                      </p>
                      <div className={styles.bigMetricValue || ''}>
                        {helpRequests.currentMonth || 0}
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </section>
          )}

          {/* Ranking de Categorias */}
          <section className={styles.categorySection || ''}>
            {categoryLoading ? (
              <>
                <div className={styles.sectionHeader || ''}>
                  <h2 className={styles.sectionTitle || ''}>
                    <i className="fa-solid fa-chart-line"></i>
                    {selectedUser.role === 'support'
                      ? 'Top 10 - Temas de maior dúvida' 
                      : 'Top 10 - Temas mais auxiliados'}
                  </h2>
                  <p className={styles.sectionSubtitle || ''}>
                    Análise das principais categorias no período selecionado
                  </p>
                </div>
                <div className={styles.loadingContainer}>
                  <div className="standardBoxLoader"></div>
                </div>
              </>
            ) : (
              <>
                <div className={styles.sectionHeader || ''}>
                  <h2 className={styles.sectionTitle || ''}>
                    <i className="fa-solid fa-chart-line"></i>
                    {selectedUser.role === 'support'
                      ? 'Top 10 - Temas de maior dúvida' 
                      : 'Top 10 - Temas mais auxiliados'}
                  </h2>
                  <p className={styles.sectionSubtitle || ''}>
                    Análise das principais categorias no período selecionado
                  </p>
                </div>

                <div className={styles.categoryRankingCard || ''}>
                  {categoryRanking.length > 0 ? (
                    <div className={styles.categoryContent || ''}>
                      {/* Gráfico de barras */}
                      <div className={styles.chartContainer || ''}>
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
                      <ul className={styles.categoryList || ''}>
                        {categoryRanking.map((category, index) => (
                          <li key={index} className={styles.categoryItem || ''}>
                            <div className={styles.categoryHeader || ''}>
                              <span className={styles.categoryRank || ''}>{index + 1}</span>
                              <span className={styles.categoryName || ''}>{category.name}</span>
                              <span className={styles.categoryCount || ''}>
                                {category.count} pedidos
                                {category.count > (selectedUser.role === 'support' ? 10 : 50) && (
                                  <i className="fa-solid fa-circle-exclamation" style={{ color: '#F0A028', marginLeft: '8px' }}></i>
                                )}
                              </span>
                            </div>
                            <div className={styles.progressBarContainer || ''}>
                              <div 
                                className={styles.progressBar || ''}
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
                    <div className={styles.noDataMessage || ''}>
                      <i className="fa-solid fa-database"></i>
                      <p>Nenhum registro de tema localizado no período selecionado.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}