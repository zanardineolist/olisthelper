import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import Select from 'react-select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Swal from 'sweetalert2';
import styles from '../../styles/Tools.module.css';
import tableStyles from '../../styles/HistoryTable.module.css';
import { ProgressBar, StatusBadge } from '../ui';
import { useApiLoader } from '../../utils/apiLoader';
import { useLoading, ThreeDotsLoader } from '../ui/LoadingIndicator';

// Configurar dayjs para trabalhar com timezone
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Sao_Paulo");

function TicketCounter() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true); // Mantemos o nome original para compatibilidade
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
    const interval = setInterval(checkDayReset, 60000); // Checar a cada minuto

    return () => clearInterval(interval);
  }, [lastResetDate]);

  useEffect(() => {
    const loadInitialData = async () => {
      await loadTodayCount();
      await loadHistoryData();
    };
    
    loadInitialData();
  }, [dateFilter, page, customRange]);

  const loadTodayCount = async () => {
    try {
      // Usando o novo método callApi com loading local
      const data = await callApi('/api/ticket-count', {}, {
        message: "Carregando contagem do dia...",
        type: "local",
        showLoading: false // Usando o estado local
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
      // Usando o novo sistema de loading
      startLoading({ 
        message: "Incrementando contagem...",
        type: "local" // Usando loading local para não sobrepor a tela inteira
      });
      setLoading(true);
      
      // Usando o novo método callApi
      const data = await callApi('/api/ticket-count', { 
        method: 'POST' 
      }, {
        message: "Incrementando contagem...",
        type: "local"
      });
      
      setCount(prev => prev + 1);
      await loadHistoryData();
    } catch (error) {
      console.error('Erro ao incrementar:', error);
      Swal.fire('Erro', 'Erro ao adicionar contagem', 'error');
    } finally {
      stopLoading();
      setLoading(false);
    }
  };

  const handleDecrement = async () => {
    try {
      // Usando o novo sistema de loading
      startLoading({ 
        message: "Decrementando contagem...",
        type: "local" // Usando loading local para não sobrepor a tela inteira
      });
      setLoading(true);
      
      // Usando o novo método callApi
      const data = await callApi('/api/ticket-count', { 
        method: 'DELETE' 
      }, {
        message: "Decrementando contagem...",
        type: "local"
      });
      
      setCount(prev => Math.max(0, prev - 1));
      await loadHistoryData();
    } catch (error) {
      console.error('Erro ao decrementar:', error);
      Swal.fire('Erro', 'Erro ao remover contagem', 'error');
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
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        // Usando o novo sistema de loading
        startLoading({ 
          message: "Limpando contagem...",
          type: "local" // Usando loading local para não sobrepor a tela inteira
        });
        setLoading(true);
        
        // Usando o novo método callApi
        await callApi('/api/ticket-count?action=clear', { 
          method: 'DELETE' 
        }, {
          message: "Limpando contagem...",
          type: "local"
        });
        
        setCount(0);
        await loadHistoryData();
        Swal.fire('Sucesso', 'Contagem do dia zerada com sucesso', 'success');
      } catch (error) {
        console.error('Erro ao limpar:', error);
        Swal.fire('Erro', error.message || 'Erro ao limpar contagem', 'error');
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
          startDate = now.subtract(7, 'day').format('YYYY-MM-DD');
          endDate = today;
          break;
        case '30days':
          startDate = now.subtract(30, 'day').format('YYYY-MM-DD');
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

      // Usando o novo método callApi
      const data = await callApi(`/api/ticket-history?startDate=${startDate}&endDate=${endDate}&page=${page}&limit=10`, {}, {
        message: "Carregando histórico...",
        type: "local"
      });
      
      setHistory(data.history);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
      setTotalTickets(data.totalTickets);
      setChartData(data.chartData);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      Swal.fire('Erro', 'Erro ao carregar histórico', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDateFilterChange = (selectedOption) => {
    setDateFilter(selectedOption);
    setPage(1);
  };

  const formatDate = (dateString) => {
    return dayjs(dateString).tz().format('DD/MM/YYYY');
  };

  const formatTime = (dateString) => {
    return dayjs(dateString).tz().format('HH:mm:ss');
  };

  const getProgressColor = () => {
    if (count <= 5) return 'var(--color-success)';
    if (count <= 15) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisible = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className={tableStyles.pagination}>
        <button 
          onClick={() => setPage(1)} 
          disabled={page === 1}
          className={tableStyles.pageButton}
        >
          ««
        </button>
        <button 
          onClick={() => setPage(page - 1)} 
          disabled={page === 1}
          className={tableStyles.pageButton}
        >
          ‹
        </button>
        
        {pageNumbers.map(pageNum => (
          <button
            key={pageNum}
            onClick={() => setPage(pageNum)}
            className={`${tableStyles.pageButton} ${page === pageNum ? tableStyles.activePage : ''}`}
          >
            {pageNum}
          </button>
        ))}
        
        <button 
          onClick={() => setPage(page + 1)} 
          disabled={page === totalPages}
          className={tableStyles.pageButton}
        >
          ›
        </button>
        <button 
          onClick={() => setPage(totalPages)} 
          disabled={page === totalPages}
          className={tableStyles.pageButton}
        >
          »»
        </button>
        
        <span className={tableStyles.pageInfo}>
          Página {page} de {totalPages}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <ThreeDotsLoader message="Carregando contador..." />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Contador de Chamados</h2>
        <p className={styles.description}>
          Contabilize os chamados atendidos durante o dia
        </p>
      </div>

      {/* Contador Principal */}
      <motion.div 
        className={styles.counterCard}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.counterHeader}>
          <h3>Chamados de Hoje</h3>
          <StatusBadge 
            status={count <= 5 ? 'success' : count <= 15 ? 'warning' : 'danger'}
            text={`${count} chamados`}
          />
        </div>

        <div className={styles.counterDisplay}>
          <motion.span 
            className={styles.countNumber}
            key={count}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
            style={{ color: getProgressColor() }}
          >
            {count}
          </motion.span>
        </div>

        <ProgressBar 
          value={count} 
          max={25} 
          color={getProgressColor()}
          label={`${count}/25 chamados`}
        />

        <div className={styles.counterActions}>
          <motion.button
            onClick={handleIncrement}
            className={styles.incrementButton}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={loading}
          >
            <Plus size={20} />
            Adicionar
          </motion.button>

          <motion.button
            onClick={handleDecrement}
            className={styles.decrementButton}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={count === 0 || loading}
          >
            <Minus size={20} />
            Remover
          </motion.button>

          <motion.button
            onClick={handleClear}
            className={styles.clearButton}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={count === 0 || loading}
          >
            <Trash2 size={20} />
            Limpar
          </motion.button>
        </div>
      </motion.div>

      {/* Filtros */}
      <div className={styles.filtersSection}>
        <div className={styles.filterGroup}>
          <label>Período:</label>
          <Select
            value={dateFilter}
            onChange={handleDateFilterChange}
            options={filterOptions}
            className={styles.selectInput}
            classNamePrefix="select"
            isSearchable={false}
            theme={(theme) => ({
              ...theme,
              colors: {
                ...theme.colors,
                primary: 'var(--color-primary)',
                primary25: 'var(--bg-light)',
                neutral0: 'var(--bg-color)',
                neutral80: 'var(--text-color)',
              },
            })}
          />
        </div>

        {dateFilter.value === 'custom' && (
          <div className={styles.customDateRange}>
            <div className={styles.dateGroup}>
              <label>Data inicial:</label>
              <input
                type="date"
                value={customRange.startDate}
                onChange={(e) => setCustomRange(prev => ({ ...prev, startDate: e.target.value }))}
                className={styles.dateInput}
              />
            </div>
            <div className={styles.dateGroup}>
              <label>Data final:</label>
              <input
                type="date"
                value={customRange.endDate}
                onChange={(e) => setCustomRange(prev => ({ ...prev, endDate: e.target.value }))}
                className={styles.dateInput}
              />
            </div>
          </div>
        )}
      </div>

      {/* Estatísticas */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h4>Total do Período</h4>
          <span className={styles.statValue}>{totalTickets}</span>
        </div>
        <div className={styles.statCard}>
          <h4>Registros</h4>
          <span className={styles.statValue}>{totalCount}</span>
        </div>
        <div className={styles.statCard}>
          <h4>Média Diária</h4>
          <span className={styles.statValue}>
            {totalCount > 0 ? Math.round(totalTickets / totalCount) : 0}
          </span>
        </div>
      </div>

      {/* Gráfico */}
      {chartData && chartData.length > 0 && (
        <div className={styles.chartSection}>
          <h3>Evolução dos Chamados</h3>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => formatDate(value)}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => formatDate(value)}
                  formatter={(value) => [value, 'Chamados']}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="var(--color-primary)" 
                  strokeWidth={2}
                  dot={{ fill: 'var(--color-primary)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Histórico */}
      <div className={tableStyles.tableSection}>
        <h3>Histórico de Contagens</h3>
        
        {loadingHistory ? (
          <ThreeDotsLoader message="Carregando histórico..." />
        ) : (
          <>
            <div className={tableStyles.tableContainer}>
              <table className={tableStyles.table}>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Hora</th>
                    <th>Ação</th>
                    <th>Contagem Final</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {history.map((item, index) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <td>{formatDate(item.created_at)}</td>
                        <td>{formatTime(item.created_at)}</td>
                        <td>
                          <StatusBadge
                            status={item.action === 'increment' ? 'success' : item.action === 'decrement' ? 'warning' : 'danger'}
                            text={
                              item.action === 'increment' ? 'Incremento' :
                              item.action === 'decrement' ? 'Decremento' : 'Reset'
                            }
                          />
                        </td>
                        <td>{item.count_after}</td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
              
              {history.length === 0 && (
                <div className={tableStyles.noData}>
                  <p>Nenhum registro encontrado para o período selecionado.</p>
                </div>
              )}
            </div>
            
            {renderPagination()}
          </>
        )}
      </div>
    </div>
  );
}

export default TicketCounter; 