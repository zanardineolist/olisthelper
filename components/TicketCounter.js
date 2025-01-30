import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Swal from 'sweetalert2';
import dayjs from 'dayjs';
import Select from 'react-select';
import styles from '../styles/Tools.module.css';

export default function TicketCounter() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState(null);
  const [dateFilter, setDateFilter] = useState({ value: 'today', label: 'Hoje' });
  const [customRange, setCustomRange] = useState({
    startDate: dayjs().format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD')
  });
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const filterOptions = [
    { value: 'today', label: 'Hoje' },
    { value: '7days', label: 'Últimos 7 dias' },
    { value: '30days', label: 'Últimos 30 dias' },
    { value: 'month', label: 'Este mês' },
    { value: 'year', label: 'Este ano' },
    { value: 'custom', label: 'Período específico' }
  ];

  // Estilos do Select baseados no GraphData
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

  useEffect(() => {
    loadTodayCount();
    loadHistoryData();
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
      text: 'Esta ação irá zerar todas as contagens registradas hoje. Deseja continuar?',
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
        Swal.fire('Sucesso', 'Contagem do dia removida com sucesso', 'success');
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
      
      switch (dateFilter.value) {
        case 'today':
          startDate = dayjs().format('YYYY-MM-DD');
          endDate = dayjs().format('YYYY-MM-DD');
          break;
        case '7days':
          startDate = dayjs().subtract(7, 'days').format('YYYY-MM-DD');
          endDate = dayjs().format('YYYY-MM-DD');
          break;
        case '30days':
          startDate = dayjs().subtract(30, 'days').format('YYYY-MM-DD');
          endDate = dayjs().format('YYYY-MM-DD');
          break;
        case 'month':
          startDate = dayjs().startOf('month').format('YYYY-MM-DD');
          endDate = dayjs().endOf('month').format('YYYY-MM-DD');
          break;
        case 'year':
          startDate = dayjs().startOf('year').format('YYYY-MM-DD');
          endDate = dayjs().endOf('year').format('YYYY-MM-DD');
          break;
        case 'custom':
          startDate = customRange.startDate || dayjs().format('YYYY-MM-DD');
          endDate = customRange.endDate || dayjs().format('YYYY-MM-DD');
          break;
        default:
          startDate = dayjs().format('YYYY-MM-DD');
          endDate = dayjs().format('YYYY-MM-DD');
      }

      const res = await fetch(
        `/api/ticket-count?period=true&startDate=${startDate}&endDate=${endDate}&page=${page}`
      );
      
      if (!res.ok) throw new Error('Erro ao carregar histórico');
      
      const data = await res.json();
      setHistory(data.records);
      setTotalPages(Math.max(1, data.totalPages));
      setTotalCount(data.totalCount);
      
      // Usar todos os registros para o gráfico
      setChartData(data.allRecords.map(record => ({
        date: dayjs(record.count_date).format('DD/MM/YYYY'),
        count: record.total_count
      })));

    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      if (!error.message.includes('no data')) {
        Swal.fire('Erro', 'Erro ao carregar histórico', 'error');
      }
      setHistory([]);
      setChartData(null);
      setTotalPages(1);
      setTotalCount(0);
    }
  };

  return (
    <div className={styles.counterContainer}>
      {/* Data atual e Contador */}
      <div className={styles.counterHeader}>
        {dayjs().format('DD/MM/YYYY')}
      </div>

      <div className={styles.counterDisplay}>
        <button
          onClick={handleDecrement}
          disabled={loading || count === 0}
          className={`${styles.counterButton} ${styles.decrementButton}`}
        >
          -
        </button>

        <div className={styles.counterValue}>
          {loading ? '...' : count}
        </div>

        <button
          onClick={handleIncrement}
          disabled={loading}
          className={`${styles.counterButton} ${styles.incrementButton}`}
        >
          +
        </button>
      </div>

      <button
        onClick={handleClear}
        disabled={loading || count === 0}
        className={styles.clearButton}
      >
        Limpar Contagem do Dia
      </button>

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
        <table className={styles.historyTable}>
          <thead>
            <tr>
              <th>Data</th>
              <th>Total de Chamados</th>
            </tr>
          </thead>
          <tbody>
            {history.length > 0 ? (
              history.map((record, index) => (
                <tr key={index}>
                  <td>{dayjs(record.count_date).format('DD/MM/YYYY')}</td>
                  <td>{record.total_count}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="2" style={{ textAlign: 'center' }}>
                  Nenhum registro encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Paginação */}
        <div className={styles.pagination}>
          <span>Total de registros: {totalCount}</span>
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