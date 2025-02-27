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
      const res = await fetch('/api/ticket-count');
      if (!res.ok) throw new Error('Erro ao carregar contagem');
      const data = await res.json();
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
      setLoading(true);
      const res = await fetch('/api/ticket-count', { method: 'POST' });
      if (!res.ok) throw new Error('Erro ao incrementar contagem');
      setCount(prev => prev + 1);
      await loadHistoryData();
    } catch (error) {
      console.error('Erro ao incrementar:', error);
      Swal.fire('Erro', 'Erro ao adicionar contagem', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDecrement = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ticket-count', { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao decrementar contagem');
      setCount(prev => Math.max(0, prev - 1));
      await loadHistoryData();
    } catch (error) {
      console.error('Erro ao decrementar:', error);
      Swal.fire('Erro', 'Erro ao remover contagem', 'error');
    } finally {
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
        setLoading(true);
        const res = await fetch('/api/ticket-count?action=clear', { method: 'DELETE' });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || 'Erro ao limpar contagem');
        }
        setCount(0);
        await loadHistoryData();
        Swal.fire('Sucesso', 'Contagem do dia zerada com sucesso', 'success');
      } catch (error) {
        console.error('Erro ao limpar:', error);
        Swal.fire('Erro', error.message || 'Erro ao limpar contagem', 'error');
      } finally {
        setLoading(false);
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

      const res = await fetch(
        `/api/ticket-count?period=true&startDate=${startDate}&endDate=${endDate}&page=${page}`
      );

      if (!res.ok) throw new Error('Erro ao carregar histórico');

      const data = await res.json();
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
  );
}

export default TicketCounter;