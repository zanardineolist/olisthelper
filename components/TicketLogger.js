import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Download, TrendingUp, BarChart3, ExternalLink, Trash2, X, Link } from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import Select from 'react-select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Swal from 'sweetalert2';
import styles from '../styles/Tools.module.css';
import tableStyles from '../styles/HistoryTable.module.css';
import { useApiLoader } from '../utils/apiLoader';
import { ThreeDotsLoader } from './LoadingIndicator';

// Configurar dayjs
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Sao_Paulo");

function TicketLogger() {
  // Estados principais
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [ticketUrl, setTicketUrl] = useState('');
  const [description, setDescription] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  
  // Estados para histórico e filtros
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Filtros de data
  const [dateFilter, setDateFilter] = useState({ value: 'today', label: 'Hoje' });
  const [customRange, setCustomRange] = useState({
    startDate: dayjs().tz().format('YYYY-MM-DD'),
    endDate: dayjs().tz().format('YYYY-MM-DD')
  });
  
  // Dados do gráfico por hora
  const [hourlyData, setHourlyData] = useState([]);
  const [statistics, setStatistics] = useState({
    totalTickets: 0,
    dailyAverage: 0,
    bestDay: null
  });

  const { callApi } = useApiLoader();

  const filterOptions = [
    { value: 'today', label: 'Hoje' },
    { value: '7days', label: 'Últimos 7 dias' },
    { value: '30days', label: 'Últimos 30 dias' },
    { value: 'month', label: 'Este mês' },
    { value: 'year', label: 'Este ano' },
    { value: 'custom', label: 'Período específico' }
  ];

  // Toast para feedback
  const showToast = (message, type = 'success') => {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: 'var(--bg-secondary)',
      color: 'var(--text-color)',
      borderRadius: '12px',
      padding: '16px 20px'
    });

    Toast.fire({
      icon: type,
      title: message
    });
  };

  // Carregar dados iniciais
  useEffect(() => {
    loadInitialData();
  }, []);

  // Recarregar quando filtros mudarem
  useEffect(() => {
    if (!loading) {
      loadHistoryData();
      loadStatistics();
    }
  }, [dateFilter, page, customRange]);

  // Carregar dados por hora quando a contagem mudar
  useEffect(() => {
    if (!loading) {
      loadHourlyData();
    }
  }, [count]);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadTodayCount(),
        loadHistoryData(),
        loadHourlyData(),
        loadStatistics()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodayCount = async () => {
    try {
      const data = await callApi('/api/ticket-logs?type=today-count', {}, {
        showLoading: false
      });
      setCount(data.count);
    } catch (error) {
      console.error('Erro ao carregar contagem:', error);
    }
  };

  const loadHourlyData = async () => {
    try {
      const data = await callApi('/api/ticket-logs?type=hourly-data', {}, {
        showLoading: false
      });
      setHourlyData(data.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados por hora:', error);
      setHourlyData([]);
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
        `/api/ticket-logs?type=history&startDate=${startDate}&endDate=${endDate}&page=${page}`,
        {},
        { showLoading: false }
      );

      setHistory(data.records || []);
      setTotalPages(Math.max(1, data.totalPages));
      setTotalCount(data.totalCount || 0);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      setHistory([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadStatistics = async () => {
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

      const stats = await callApi(
        `/api/ticket-logs?type=stats&startDate=${startDate}&endDate=${endDate}`,
        {},
        { showLoading: false }
      );

      setStatistics(stats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      setStatistics({
        totalTickets: 0,
        dailyAverage: 0,
        bestDay: null
      });
    }
  };

  const handleAddTicket = async () => {
    if (!ticketUrl.trim()) {
      showToast('URL do chamado é obrigatória', 'error');
      return;
    }

    // Validar URL
    try {
      new URL(ticketUrl);
    } catch {
      showToast('URL inválida', 'error');
      return;
    }

    try {
      setModalLoading(true);
      
      await callApi('/api/ticket-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketUrl: ticketUrl.trim(),
          description: description.trim()
        })
      });

      // Resetar modal
      setTicketUrl('');
      setDescription('');
      setShowModal(false);
      
      // Recarregar dados
      await loadTodayCount();
      await loadHistoryData();
      await loadHourlyData();
      
      showToast('Chamado registrado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao adicionar chamado:', error);
      showToast('Erro ao registrar chamado', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const handleRemoveTicket = async (logId) => {
    const result = await Swal.fire({
      title: 'Remover chamado?',
      text: 'Esta ação não pode ser desfeita.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, remover',
      cancelButtonText: 'Cancelar',
      background: 'var(--box-color)',
      color: 'var(--text-color)'
    });

    if (result.isConfirmed) {
      try {
        await callApi(`/api/ticket-logs?logId=${logId}`, {
          method: 'DELETE'
        });

        await loadTodayCount();
        await loadHistoryData();
        await loadHourlyData();
        
        showToast('Chamado removido com sucesso!', 'success');
      } catch (error) {
        console.error('Erro ao remover chamado:', error);
        showToast('Erro ao remover chamado', 'error');
      }
    }
  };

  const exportToCSV = async () => {
    if (!history || history.length === 0) {
      showToast('Nenhum dado para exportar', 'warning');
      return;
    }

    try {
      const headers = ['Data', 'Hora', 'URL do Chamado', 'Descrição'];
      const csvData = history.map(record => [
        dayjs(record.logged_date).format('DD/MM/YYYY'),
        dayjs(record.logged_time, 'HH:mm:ss.SSSZ').format('HH:mm'),
        record.ticket_url,
        record.description || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `logs-chamados-${dayjs().format('YYYY-MM-DD')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast('📊 Arquivo CSV exportado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro na exportação:', error);
      showToast('Erro ao exportar arquivo CSV', 'error');
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
      {/* Cabeçalho */}
      <motion.div 
        className={styles.counterHeader}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {dayjs().tz().format('DD/MM/YYYY')}
      </motion.div>

      {/* Display do contador */}
      <motion.div 
        className={styles.counterDisplay}
        whileHover={{ scale: 1.005 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        <motion.div 
          className={styles.counterValue}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          {loading ? '...' : count}
          <div className={styles.counterLabel}>Chamados Hoje</div>
        </motion.div>

        <motion.button
          className={`${styles.counterButton} ${styles.addButton}`}
          onClick={() => setShowModal(true)}
          disabled={loading}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <Plus size={28} />
          <span>Adicionar Chamado</span>
        </motion.button>
      </motion.div>

      {/* Modal para adicionar chamado */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !modalLoading && setShowModal(false)}
          >
            <motion.div
              className={styles.modalContent}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3>
                  <Link size={20} />
                  Registrar Novo Chamado
                </h3>
                <button
                  className={styles.modalCloseButton}
                  onClick={() => !modalLoading && setShowModal(false)}
                  disabled={modalLoading}
                >
                  <X size={20} />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.inputGroup}>
                  <label htmlFor="ticketUrl">URL do Chamado *</label>
                  <input
                    id="ticketUrl"
                    type="url"
                    value={ticketUrl}
                    onChange={(e) => setTicketUrl(e.target.value)}
                    placeholder="https://..."
                    className={styles.modalInput}
                    disabled={modalLoading}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="description">Descrição (opcional)</label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Breve descrição do chamado..."
                    className={styles.modalTextarea}
                    rows={3}
                    disabled={modalLoading}
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  className={styles.modalSecondaryButton}
                  onClick={() => setShowModal(false)}
                  disabled={modalLoading}
                >
                  Cancelar
                </button>
                <button
                  className={styles.modalPrimaryButton}
                  onClick={handleAddTicket}
                  disabled={modalLoading || !ticketUrl.trim()}
                >
                  {modalLoading ? 'Registrando...' : 'Registrar Chamado'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Painel de Estatísticas */}
      <motion.div 
        className={styles.statisticsPanel}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <h3 className={styles.statisticsTitle}>
          <TrendingUp size={18} />
          Estatísticas
        </h3>
        
        <div className={styles.statisticsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{statistics.totalTickets}</div>
            <div className={styles.statLabel}>Total do Período</div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statValue}>{statistics.dailyAverage}</div>
            <div className={styles.statLabel}>Média Diária</div>
          </div>
          
          {statistics.bestDay && (
            <div className={styles.statCard}>
              <div className={styles.statValue}>{statistics.bestDay.count}</div>
              <div className={styles.statLabel}>
                Melhor Dia
                <br />
                <small>{dayjs(statistics.bestDay.date).format('DD/MM')}</small>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Botões de ação */}
      <motion.div 
        className={styles.actionButtons}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <motion.button
          className={styles.exportButton}
          onClick={exportToCSV}
          disabled={loading || !history || history.length === 0}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          transition={{ duration: 0.2 }}
        >
          <Download size={18} />
          <span>Exportar CSV</span>
        </motion.button>
      </motion.div>

      {/* Gráfico por hora do dia */}
      <div className={styles.chartSection}>
        <h3 className={styles.chartTitle}>
          <BarChart3 size={18} />
          Chamados por Hora - Hoje
        </h3>
        
        {hourlyData.length > 0 ? (
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="hour"
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
                <Bar 
                  dataKey="count" 
                  fill="var(--color-accent3)" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className={styles.emptyChart}>
            <p>Nenhum chamado registrado hoje</p>
          </div>
        )}
      </div>

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
                  <th className={tableStyles.tableHeaderCell}>Data/Hora</th>
                  <th className={tableStyles.tableHeaderCell}>Chamado</th>
                  <th className={tableStyles.tableHeaderCell}>Descrição</th>
                  <th className={tableStyles.tableHeaderCell}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {history.length > 0 ? (
                  history.map((record) => (
                    <tr key={record.id} className={tableStyles.tableRow}>
                      <td className={`${tableStyles.tableCell} ${tableStyles.dateCell}`}>
                        <div>
                          <div>{dayjs(record.logged_date).format('DD/MM/YYYY')}</div>
                          <small>{dayjs(record.logged_time, 'HH:mm:ss.SSSZ').format('HH:mm')}</small>
                        </div>
                      </td>
                      <td className={`${tableStyles.tableCell} ${styles.linkCell}`}>
                        <a
                          href={record.ticket_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.ticketLink}
                        >
                          <ExternalLink size={16} />
                          Ver Chamado
                        </a>
                      </td>
                      <td className={`${tableStyles.tableCell} ${styles.descriptionCell}`}>
                        {record.description || '-'}
                      </td>
                      <td className={`${tableStyles.tableCell} ${styles.actionCell}`}>
                        <button
                          className={styles.removeButton}
                          onClick={() => handleRemoveTicket(record.id)}
                          title="Remover chamado"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className={tableStyles.emptyMessage}>
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

export default TicketLogger; 