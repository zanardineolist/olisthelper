import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Trash2 } from 'lucide-react';
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
import { useLoading, LocalLoader } from '../components/LoadingIndicator';

// Configurar dayjs para trabalhar com timezone
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Sao_Paulo");

function TicketCounter() {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true); // Mantendo um estado local para controle de componentes específicos
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
      setIsLoading(false);
    }
  };

  const handleIncrement = async () => {
    try {
      // Usando o novo sistema de loading
      startLoading({ message: "Incrementando contagem..." });
      
      // Usando o novo método callApi
      const data = await callApi('/api/ticket-count', { 
        method: 'POST' 
      }, {
        message: "Incrementando contagem..."
      });
      
      setCount(prev => prev + 1);
      await loadHistoryData();
    } catch (error) {
      console.error('Erro ao incrementar:', error);
      Swal.fire('Erro', 'Erro ao adicionar contagem', 'error');
    } finally {
      stopLoading();
    }
  };

  const handleDecrement = async () => {
    try {
      // Usando o novo sistema de loading
      startLoading({ message: "Decrementando contagem..." });
      
      // Usando o novo método callApi
      const data = await callApi('/api/ticket-count', { 
        method: 'DELETE' 
      }, {
        message: "Decrementando contagem..."
      });
      
      setCount(prev => Math.max(0, prev - 1));
      await loadHistoryData();
    } catch (error) {
      console.error('Erro ao decrementar:', error);
      Swal.fire('Erro', 'Erro ao remover contagem', 'error');
    } finally {
      stopLoading();
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
        startLoading({ message: "Limpando contagem..." });
        
        // Usando o novo método callApi
        await callApi('/api/ticket-count?action=clear', { 
          method: 'DELETE' 
        }, {
          message: "Limpando contagem..."
        });
        
        setCount(0);
        await loadHistoryData();
        Swal.fire('Sucesso', 'Contagem do dia zerada com sucesso', 'success');
      } catch (error) {
        console.error('Erro ao limpar:', error);
        Swal.fire('Erro', error.message || 'Erro ao limpar contagem', 'error');
      } finally {
        stopLoading();
      }
    }
  };

  const loadHistoryData = async () => {
    try {
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

      // Usando o novo método callApi com loading local
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

      // Tratamento especial para incluir o dia atual no histórico
      const todayRecord = processedRecords.find(r => r.count_date === today);
      if (!todayRecord && count > 0) {
        processedRecords.unshift({
          count_date: today,
          total_count: count
        });
      } else if (todayRecord && count > 0) {
        todayRecord.total_count = Math.max(todayRecord.total_count, count);
      }

      // Ordenar registros por data (mais recente primeiro)
      const sortedRecords = processedRecords.sort((a, b) => 
        dayjs(b.count_date).valueOf() - dayjs(a.count_date).valueOf()
      );

      setHistory(sortedRecords);
      setTotalPages(Math.max(1, data.totalPages));
      setTotalCount(data.totalCount + (todayRecord ? 0 : count > 0 ? 1 : 0));

      // Calcular total de chamados do período
      const totalTickets = sortedRecords.reduce((sum, record) => sum + record.total_count, 0);
      setTotalTickets(totalTickets);

      // Preparar dados para o gráfico
      const chartData = sortedRecords.map(record => ({
        date: dayjs(record.count_date).format('DD/MM/YYYY'),
        count: record.total_count
      })).reverse();

      setChartData(chartData);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      if (!error.message.includes('no data')) {
        Swal.fire('Erro', 'Erro ao carregar histórico', 'error');
      }
      setHistory([]);
      setChartData(null);
      setTotalPages(1);
      setTotalCount(0);
      setTotalTickets(0);
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
    <div className={styles.ticketCounter}>
      <div className={styles.counterContainer}>
        <h2 className={styles.title}>Contador de Chamados</h2>
        
        <div className={styles.counterControls}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={styles.decrementButton}
            onClick={handleDecrement}
            disabled={count <= 0 || isLoading}
          >
            <Minus size={18} />
          </motion.button>
          
          <div className={styles.countDisplay}>
            {isLoading ? (
              <LocalLoader size="small" inline={true} />
            ) : (
              <AnimatePresence mode="wait">
                <motion.span
                  key={count}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className={styles.countNumber}
                >
                  {count}
                </motion.span>
              </AnimatePresence>
            )}
          </div>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={styles.incrementButton}
            onClick={handleIncrement}
            disabled={isLoading}
          >
            <Plus size={18} />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={styles.clearButton}
            onClick={handleClear}
            disabled={count <= 0 || isLoading}
          >
            <Trash2 size={16} />
          </motion.button>
        </div>
        
        {/* Barra de Progresso */}
        <ProgressBar count={count} />

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
          {chartData && chartData.length > 0 && (
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
          )}

          {/* Tabela de Histórico */}
          <div className={tableStyles.tableWrapper}>
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
                  disabled={page === 1}
                  className={styles.paginationButton}
                >
                  Anterior
                </button>
                <span style={{ margin: '0 1rem' }}>
                  Página {page} de {Math.max(1, totalPages)}
                </span>
                <button
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages || totalPages === 0}
                  className={styles.paginationButton}
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TicketCounter;