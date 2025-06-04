import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Trash2, Download, TrendingUp, BarChart3, Keyboard } from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import Select from 'react-select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Swal from 'sweetalert2';
import styles from '../styles/Tools.module.css';
import tableStyles from '../styles/HistoryTable.module.css';
import ProgressBar from './ProgressBar';
import StatusBadge from './StatusBadge';
import { useApiLoader } from '../utils/apiLoader';
import { useLoading, ThreeDotsLoader } from './LoadingIndicator';

// Configurar dayjs para trabalhar com timezone
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Sao_Paulo");

function TicketCounter() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState(null);
  const [dateFilter, setDateFilter] = useState({ value: 'today', label: 'Hoje' });
  const [customRange, setCustomRange] = useState({
    startDate: dayjs().tz().format('YYYY-MM-DD'),
    endDate: dayjs().tz().format('YYYY-MM-DD')
  });
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalTickets, setTotalTickets] = useState(0);
  const [lastResetDate, setLastResetDate] = useState(dayjs().tz().format('YYYY-MM-DD'));
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Novos estados para as melhorias
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [statistics, setStatistics] = useState({
    dailyAverage: 0,
    weeklyAverage: 0,
    monthlyAverage: 0,
    comparisonYesterday: 0,
    comparisonLastWeek: 0,
    bestDay: null,
    trend: 'stable'
  });

  // Usando os hooks do sistema de loading centralizado
  const { callApi } = useApiLoader();
  const { startLoading, stopLoading } = useLoading();

  const filterOptions = [
    { value: 'today', label: 'Hoje' },
    { value: '7days', label: 'Últimos 7 dias' },
    { value: '30days', label: 'Últimos 30 dias' },
    { value: 'month', label: 'Este mês' },
    { value: 'year', label: 'Este ano' },
    { value: 'custom', label: 'Período específico' }
  ];

  // MELHORIA 1: Atalhos de teclado
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Não processar se estivermos em um input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      // Não processar se Ctrl ou Cmd estiver pressionado
      if (e.ctrlKey || e.metaKey) return;
      
      switch(e.key) {
        case '+':
        case '=':
          e.preventDefault();
          if (!loading) handleIncrement();
          break;
        case '-':
          e.preventDefault();
          if (!loading && count > 0) handleDecrement();
          break;
        case 'c':
        case 'C':
          e.preventDefault();
          if (!loading && count > 0) handleClear();
          break;
        case 'e':
        case 'E':
          e.preventDefault();
          exportToCSV();
          break;
        case 'h':
        case 'H':
          e.preventDefault();
          setShowShortcuts(!showShortcuts);
          break;
        case 'Escape':
          e.preventDefault();
          setShowShortcuts(false);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [loading, count, showShortcuts]);

  // MELHORIA 2: Toast para feedback visual
  const showToast = (message, type = 'success') => {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
      background: 'var(--box-color)',
      color: 'var(--text-color)',
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
      }
    });

    Toast.fire({
      icon: type,
      title: message,
      iconColor: type === 'success' ? 'var(--excellent-color)' : 
                type === 'error' ? 'var(--poor-color)' : 
                'var(--good-color)'
    });
  };

  // MELHORIA 3: Cálculo de estatísticas
  const calculateStatistics = useCallback((historyData) => {
    if (!historyData || historyData.length === 0) {
      setStatistics({
        dailyAverage: 0,
        weeklyAverage: 0,
        monthlyAverage: 0,
        comparisonYesterday: 0,
        comparisonLastWeek: 0,
        bestDay: null,
        trend: 'stable'
      });
      return;
    }

    const today = dayjs().tz().format('YYYY-MM-DD');
    const yesterday = dayjs().tz().subtract(1, 'day').format('YYYY-MM-DD');
    const lastWeek = dayjs().tz().subtract(7, 'days').format('YYYY-MM-DD');
    
    // Calcular médias
    const last7Days = historyData.filter(record => 
      dayjs(record.count_date).isAfter(dayjs().subtract(7, 'days'))
    );
    const last30Days = historyData.filter(record => 
      dayjs(record.count_date).isAfter(dayjs().subtract(30, 'days'))
    );
    
    const dailyAverage = historyData.length > 0 ? 
      historyData.reduce((sum, record) => sum + record.total_count, 0) / historyData.length : 0;
    
    const weeklyAverage = last7Days.length > 0 ? 
      last7Days.reduce((sum, record) => sum + record.total_count, 0) / last7Days.length : 0;
    
    const monthlyAverage = last30Days.length > 0 ? 
      last30Days.reduce((sum, record) => sum + record.total_count, 0) / last30Days.length : 0;

    // Comparações
    const todayRecord = historyData.find(r => r.count_date === today);
    const yesterdayRecord = historyData.find(r => r.count_date === yesterday);
    const lastWeekRecord = historyData.find(r => r.count_date === lastWeek);
    
    const todayCount = todayRecord ? todayRecord.total_count : count;
    const comparisonYesterday = yesterdayRecord ? 
      ((todayCount - yesterdayRecord.total_count) / yesterdayRecord.total_count * 100) : 0;
    const comparisonLastWeek = lastWeekRecord ? 
      ((todayCount - lastWeekRecord.total_count) / lastWeekRecord.total_count * 100) : 0;

    // Melhor dia
    const bestDay = historyData.reduce((best, current) => 
      current.total_count > (best?.total_count || 0) ? current : best, null);

    // Tendência (baseada nos últimos 3 dias)
    const last3Days = historyData
      .filter(record => dayjs(record.count_date).isAfter(dayjs().subtract(3, 'days')))
      .sort((a, b) => dayjs(a.count_date).valueOf() - dayjs(b.count_date).valueOf());
    
    let trend = 'stable';
    if (last3Days.length >= 2) {
      const slope = last3Days[last3Days.length - 1].total_count - last3Days[0].total_count;
      trend = slope > 0 ? 'up' : slope < 0 ? 'down' : 'stable';
    }

    setStatistics({
      dailyAverage: Math.round(dailyAverage * 100) / 100,
      weeklyAverage: Math.round(weeklyAverage * 100) / 100,
      monthlyAverage: Math.round(monthlyAverage * 100) / 100,
      comparisonYesterday: Math.round(comparisonYesterday * 100) / 100,
      comparisonLastWeek: Math.round(comparisonLastWeek * 100) / 100,
      bestDay,
      trend
    });
  }, [count]);

  // MELHORIA 4: Exportação CSV
  const exportToCSV = () => {
    if (!history || history.length === 0) {
      showToast('Nenhum dado para exportar', 'warning');
      return;
    }

    const headers = ['Data', 'Total de Chamados', 'Dia da Semana'];
    const csvData = history.map(record => [
      dayjs(record.count_date).format('DD/MM/YYYY'),
      record.total_count,
      dayjs(record.count_date).format('dddd')
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `contador-chamados-${dayjs().format('YYYY-MM-DD')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Arquivo CSV exportado com sucesso!', 'success');
  };

  useEffect(() => {
    const checkDayReset = () => {
      const currentDate = dayjs().tz().format('YYYY-MM-DD');
      if (currentDate !== lastResetDate) {
        setCount(0);
        setLastResetDate(currentDate);
        loadTodayCount();
      }
    };

    checkDayReset();
    const interval = setInterval(checkDayReset, 60000);

    return () => clearInterval(interval);
  }, [lastResetDate]);

  useEffect(() => {
    const loadInitialData = async () => {
      await loadTodayCount();
      await loadHistoryData();
    };
    
    loadInitialData();
  }, [dateFilter, page, customRange]);

  // Calcular estatísticas quando o histórico muda
  useEffect(() => {
    calculateStatistics(history);
  }, [history, calculateStatistics]);

  const loadTodayCount = async () => {
    try {
      const data = await callApi('/api/ticket-count', {}, {
        message: "Carregando contagem do dia...",
        type: "local",
        showLoading: false
      });
      
      setCount(data.count);
    } catch (error) {
      console.error('Erro ao carregar contagem:', error);
      Swal.fire('Erro', 'Erro ao carregar contagem do dia', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleIncrement = async () => {
    try {
      startLoading({ 
        message: "Incrementando contagem...",
        type: "local"
      });
      setLoading(true);
      
      const data = await callApi('/api/ticket-count', { 
        method: 'POST' 
      }, {
        message: "Incrementando contagem...",
        type: "local"
      });
      
      setCount(prev => prev + 1);
      await loadHistoryData();
      showToast('Chamado adicionado! (+1)', 'success');
    } catch (error) {
      console.error('Erro ao incrementar:', error);
      showToast('Erro ao adicionar contagem', 'error');
    } finally {
      stopLoading();
      setLoading(false);
    }
  };

  const handleDecrement = async () => {
    try {
      startLoading({ 
        message: "Decrementando contagem...",
        type: "local"
      });
      setLoading(true);
      
      const data = await callApi('/api/ticket-count', { 
        method: 'DELETE' 
      }, {
        message: "Decrementando contagem...",
        type: "local"
      });
      
      setCount(prev => Math.max(0, prev - 1));
      await loadHistoryData();
      showToast('Chamado removido! (-1)', 'success');
    } catch (error) {
      console.error('Erro ao decrementar:', error);
      showToast('Erro ao remover contagem', 'error');
    } finally {
      stopLoading();
      setLoading(false);
    }
  };

  const handleClear = async () => {
    const result = await Swal.fire({
      title: 'Limpar contagem do dia?',
      text: 'Esta ação irá zerar a contagem do dia. Os registros anteriores serão mantidos.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, limpar',
      cancelButtonText: 'Cancelar',
      background: 'var(--box-color)',
      color: 'var(--text-color)'
    });

    if (result.isConfirmed) {
      try {
        startLoading({ 
          message: "Limpando contagem...",
          type: "local"
        });
        setLoading(true);
        
        await callApi('/api/ticket-count?action=clear', { 
          method: 'DELETE' 
        }, {
          message: "Limpando contagem...",
          type: "local"
        });
        
        setCount(0);
        await loadHistoryData();
        showToast('Contagem zerada com sucesso!', 'success');
      } catch (error) {
        console.error('Erro ao limpar:', error);
        showToast('Erro ao limpar contagem', 'error');
      } finally {
        stopLoading();
        setLoading(false);
      }
    }
  };

  const loadHistoryData = async () => {
    try {
      setLoadingHistory(true);
      
      let startDate, endDate;
      const today = dayjs().tz().format('YYYY-MM-DD');
      const now = dayjs().tz();

      switch (dateFilter.value) {
        case 'today':
          startDate = today;
          endDate = today;
          break;
        case '7days':
          startDate = now.subtract(6, 'day').format('YYYY-MM-DD');
          endDate = today;
          break;
        case '30days':
          startDate = now.subtract(29, 'day').format('YYYY-MM-DD');
          endDate = today;
          break;
        case 'month':
          startDate = now.startOf('month').format('YYYY-MM-DD');
          endDate = today;
          break;
        case 'year':
          startDate = now.startOf('year').format('YYYY-MM-DD');
          endDate = today;
          break;
        case 'custom':
          startDate = customRange.startDate;
          endDate = customRange.endDate;
          break;
        default:
          startDate = today;
          endDate = today;
      }

      const data = await callApi(
        `/api/ticket-count?period=true&startDate=${startDate}&endDate=${endDate}&page=${page}`,
        {},
        {
          message: "Carregando histórico...",
          type: "local",
          showLoading: false
        }
      );

      const processedRecords = [...data.records];

      const todayRecord = processedRecords.find(r => r.count_date === today);
      if (!todayRecord && count > 0) {
        processedRecords.unshift({
          count_date: today,
          total_count: count
        });
      } else if (todayRecord && count > 0) {
        todayRecord.total_count = Math.max(todayRecord.total_count, count);
      }

      const sortedRecords = processedRecords.sort((a, b) => 
        dayjs(b.count_date).valueOf() - dayjs(a.count_date).valueOf()
      );

      setHistory(sortedRecords);
      setTotalPages(Math.max(1, data.totalPages));
      setTotalCount(data.totalCount + (todayRecord ? 0 : count > 0 ? 1 : 0));

      const totalTickets = sortedRecords.reduce((sum, record) => sum + record.total_count, 0);
      setTotalTickets(totalTickets);

      const chartData = sortedRecords.map(record => ({
        date: dayjs(record.count_date).format('DD/MM/YYYY'),
        count: record.total_count
      })).reverse();

      setChartData(chartData);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      if (!error.message.includes('no data')) {
        showToast('Erro ao carregar histórico', 'error');
      }
      setHistory([]);
      setChartData(null);
      setTotalPages(1);
      setTotalCount(0);
      setTotalTickets(0);
    } finally {
      setLoadingHistory(false);
    }
  };

  const customSelectStyles = {
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
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: 'var(--modals-inputs)',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused
        ? 'var(--color-trodd)'
        : state.isSelected
        ? 'var(--color-primary)'
        : 'var(--box-color)',
      color: 'var(--text-color)',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: 'var(--text-color)',
    }),
    input: (provided) => ({
      ...provided,
      color: 'var(--text-color)',
    }),
  };

  return (
    <div className={styles.counterContainer}>
      {/* Data atual com animação suave */}
      <motion.div 
        className={styles.counterHeader}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {dayjs().tz().format('DD/MM/YYYY')}
      </motion.div>

      {/* Container do contador com efeito de hover */}
      <motion.div 
        className={styles.counterDisplay}
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        <motion.button
          className={`${styles.counterButton} ${styles.decrementButton}`}
          onClick={handleDecrement}
          disabled={loading || count === 0}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          <Minus size={32} />
        </motion.button>

        <AnimatePresence mode="wait">
          <motion.div 
            key={count}
            className={styles.counterValue}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {loading ? '...' : count}
          </motion.div>
        </AnimatePresence>

        <motion.button
          className={`${styles.counterButton} ${styles.incrementButton}`}
          onClick={handleIncrement}
          disabled={loading}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          <Plus size={32} />
        </motion.button>
      </motion.div>

      {/* Botões de ação melhorados */}
      <div className={styles.actionButtons}>
        <motion.button
          className={styles.clearButton}
          onClick={handleClear}
          disabled={loading || count === 0}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2 }}
        >
          <div className={styles.clearButtonContent}>
            <Trash2 size={20} />
            <span>Limpar Contagem do Dia</span>
          </div>
        </motion.button>

        <motion.button
          className={styles.exportButton}
          onClick={exportToCSV}
          disabled={loading || !history || history.length === 0}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2 }}
        >
          <div className={styles.exportButtonContent}>
            <Download size={20} />
            <span>Exportar CSV</span>
          </div>
        </motion.button>

        <motion.button
          className={styles.shortcutsButton}
          onClick={() => setShowShortcuts(!showShortcuts)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2 }}
        >
          <div className={styles.shortcutsButtonContent}>
            <Keyboard size={20} />
            <span>Atalhos</span>
          </div>
        </motion.button>
      </div>

      {/* Modal de Atalhos */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            className={styles.shortcutsModal}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <div className={styles.shortcutsContent}>
              <h3>Atalhos de Teclado</h3>
              <div className={styles.shortcutsList}>
                <div className={styles.shortcutItem}>
                  <kbd>+</kbd> <span>Incrementar contador</span>
                </div>
                <div className={styles.shortcutItem}>
                  <kbd>-</kbd> <span>Decrementar contador</span>
                </div>
                <div className={styles.shortcutItem}>
                  <kbd>C</kbd> <span>Limpar contagem</span>
                </div>
                <div className={styles.shortcutItem}>
                  <kbd>E</kbd> <span>Exportar CSV</span>
                </div>
                <div className={styles.shortcutItem}>
                  <kbd>H</kbd> <span>Mostrar/Ocultar atalhos</span>
                </div>
                <div className={styles.shortcutItem}>
                  <kbd>ESC</kbd> <span>Fechar atalhos</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barra de Progresso */}
      <ProgressBar count={count} />

      {/* MELHORIA 3: Painel de Estatísticas */}
      <motion.div 
        className={styles.statisticsPanel}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <h3 className={styles.statisticsTitle}>
          <TrendingUp size={20} />
          Estatísticas
        </h3>
        
        <div className={styles.statisticsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{statistics.dailyAverage}</div>
            <div className={styles.statLabel}>Média Geral</div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statValue}>{statistics.weeklyAverage}</div>
            <div className={styles.statLabel}>Média (7 dias)</div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statValue}>{statistics.monthlyAverage}</div>
            <div className={styles.statLabel}>Média (30 dias)</div>
          </div>
          
          <div className={styles.statCard}>
            <div className={`${styles.statValue} ${statistics.comparisonYesterday >= 0 ? styles.positive : styles.negative}`}>
              {statistics.comparisonYesterday > 0 ? '+' : ''}{statistics.comparisonYesterday}%
            </div>
            <div className={styles.statLabel}>vs Ontem</div>
          </div>
          
          {statistics.bestDay && (
            <div className={styles.statCard}>
              <div className={styles.statValue}>{statistics.bestDay.total_count}</div>
              <div className={styles.statLabel}>
                Melhor Dia
                <br />
                <small>{dayjs(statistics.bestDay.count_date).format('DD/MM')}</small>
              </div>
            </div>
          )}
          
          <div className={styles.statCard}>
            <div className={`${styles.statValue} ${styles.trendIcon}`}>
              {statistics.trend === 'up' ? '📈' : statistics.trend === 'down' ? '📉' : '📊'}
            </div>
            <div className={styles.statLabel}>Tendência</div>
          </div>
        </div>
      </motion.div>

      {/* Histórico */}
      <div className={styles.historyContainer}>
        <div className={styles.historyHeader}>
          <div className={styles.filterContainer}>
            <Select
              value={dateFilter}
              onChange={(option) => {
                setDateFilter(option);
                setPage(1);
              }}
              options={filterOptions}
              styles={customSelectStyles}
              className={styles.selectFilter}
              isSearchable={false}
            />
          </div>

          {dateFilter.value === 'custom' && (
            <div className={styles.dateRangeContainer}>
              <input
                type="date"
                value={customRange.startDate}
                onChange={(e) => setCustomRange(prev => ({ ...prev, startDate: e.target.value }))}
                className={styles.dateInput}
              />
              <input
                type="date"
                value={customRange.endDate}
                onChange={(e) => setCustomRange(prev => ({ ...prev, endDate: e.target.value }))}
                className={styles.dateInput}
              />
            </div>
          )}
        </div>

        {/* Gráfico */}
        {loadingHistory ? (
          <div className={styles.loadingContainer}>
            <ThreeDotsLoader message="Carregando histórico..." />
          </div>
        ) : chartData && chartData.length > 0 ? (
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  tick={{ fill: 'var(--text-color)' }}
                />
                <YAxis 
                  tick={{ fill: 'var(--text-color)' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--box-color)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--text-color)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="var(--color-accent3)" 
                  strokeWidth={2}
                  dot={{ fill: 'var(--color-accent3)', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: 'var(--color-accent3)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : null}

        {/* Tabela de Histórico */}
        <div className={tableStyles.tableWrapper}>
          {loadingHistory ? (
            <div className={styles.loadingContainer}>
              <ThreeDotsLoader message="Carregando registros..." />
            </div>
          ) : (
            <table className={tableStyles.modernTable}>
              <thead>
                <tr className={tableStyles.tableHeader}>
                  <th className={tableStyles.tableHeaderCell}>Data</th>
                  <th className={tableStyles.tableHeaderCell}>Total de Chamados</th>
                  <th className={tableStyles.tableHeaderCell}>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.length > 0 ? (
                  history.map((record, index) => (
                    <tr key={index} className={tableStyles.tableRow}>
                      <td className={`${tableStyles.tableCell} ${tableStyles.dateCell}`}>
                        {dayjs(record.count_date).format('DD/MM/YYYY')}
                      </td>
                      <td className={`${tableStyles.tableCell} ${tableStyles.countCell}`}>
                        {record.total_count}
                      </td>
                      <td className={`${tableStyles.tableCell} ${tableStyles.statusCell}`}>
                        <StatusBadge count={record.total_count} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className={tableStyles.emptyMessage}>
                      Nenhum registro encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginação */}
        <div className={styles.pagination}>
          <div className={styles.paginationInfo}>
            <span>Total de registros: {totalCount}</span>
            <span>Total de chamados: {totalTickets}</span>
          </div>
          {totalCount > 0 && (
            <div>
              <button
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1 || loadingHistory}
                className={styles.paginationButton}
              >
                Anterior
              </button>
              <span style={{ margin: '0 1rem' }}>
                Página {page} de {Math.max(1, totalPages)}
              </span>
              <button
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages || totalPages === 0 || loadingHistory}
                className={styles.paginationButton}
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TicketCounter;