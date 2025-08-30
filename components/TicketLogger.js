import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Trash2, Download, TrendingUp, BarChart3, ExternalLink, X, Link, Copy } from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import Select from 'react-select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Swal from 'sweetalert2';
import styles from '../styles/Tools.module.css';
import tableStyles from '../styles/HistoryTable.module.css';
import ProgressBarLogger from './ProgressBarLogger';
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
  const [ticketType, setTicketType] = useState({ value: 'novo', label: 'Novo', color: '#10B981' });
  const [modalLoading, setModalLoading] = useState(false);
  const [urlValidationError, setUrlValidationError] = useState('');
  
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
    bestDay: null,
    typeStats: {
      novo: 0,
      interacao: 0,
      rfc: 0
    }
  });

  const { callApi } = useApiLoader();

  // Função para obter informações do tipo de registro
  const getTicketTypeInfo = (type) => {
    const typeMap = {
      'novo': { label: 'Novo', color: '#10B981' },
      'interacao': { label: 'Retorno', color: '#3B82F6' },
      'rfc': { label: 'RFC', color: '#F59E0B' }
    };
    return typeMap[type] || { label: 'Novo', color: '#10B981' };
  };

  // Opções de tipo de registro
  const ticketTypeOptions = [
    { value: 'novo', label: 'Novo', color: '#10B981' },
    { value: 'interacao', label: 'Retorno', color: '#3B82F6' },
    { value: 'rfc', label: 'RFC', color: '#F59E0B' }
  ];

  const filterOptions = [
    { value: 'today', label: 'Hoje' },
    { value: '7days', label: 'Últimos 7 dias' },
    { value: '30days', label: 'Últimos 30 dias' },
    { value: 'month', label: 'Este mês' },
    { value: 'year', label: 'Este ano' },
    { value: 'custom', label: 'Período específico' }
  ];

  // Toast profissional e limpo
  const showToast = (message, type = 'success') => {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: 'var(--box-color)',
      color: 'var(--text-color)',
      padding: '16px 20px',
      width: '350px',
      showClass: {
        popup: 'animate__animated animate__slideInRight animate__faster'
      },
      hideClass: {
        popup: 'animate__animated animate__slideOutRight animate__faster'
      },
      customClass: {
        popup: 'clean-toast-logger',
        timerProgressBar: 'clean-timer-bar-logger'
      },
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
        
        // Estilos limpos e profissionais
        const style = document.createElement('style');
        style.textContent = `
          .clean-toast-logger {
            border: 1px solid var(--color-border) !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif !important;
            font-size: 14px !important;
            font-weight: 500 !important;
            border-radius: 8px !important;
            border-left: 4px solid ${type === 'success' ? '#22c55e' : 
                                     type === 'error' ? '#ef4444' : 
                                     '#f59e0b'} !important;
          }
          .clean-timer-bar-logger {
            background: ${type === 'success' ? '#22c55e' : 
                          type === 'error' ? '#ef4444' : 
                          '#f59e0b'} !important;
            height: 3px !important;
          }
          .swal2-toast .swal2-icon {
            border: none !important;
            margin: 0 12px 0 0 !important;
            width: 20px !important;
            height: 20px !important;
            min-width: 20px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex-shrink: 0 !important;
            font-size: 16px !important;
          }
          .swal2-toast .swal2-icon.swal2-success {
            color: #22c55e !important;
          }
          .swal2-toast .swal2-icon.swal2-error {
            color: #ef4444 !important;
          }
          .swal2-toast .swal2-icon.swal2-warning {
            color: #f59e0b !important;
          }
          .swal2-toast .swal2-title {
            font-size: 14px !important;
            margin: 0 !important;
            padding: 0 !important;
            line-height: 1.5 !important;
            font-weight: 500 !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            white-space: normal !important;
            flex: 1 !important;
          }
          .swal2-toast .swal2-html-container {
            margin: 0 !important;
            padding: 0 !important;
          }
          .swal2-toast .swal2-content {
            display: flex !important;
            align-items: flex-start !important;
            gap: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        `;
        document.head.appendChild(style);
        
        // Remover o estilo após o toast desaparecer
        setTimeout(() => {
          if (document.head.contains(style)) {
            document.head.removeChild(style);
          }
        }, 3500);
      }
    });

    Toast.fire({
      icon: type,
      title: message
    });
  };

  // Atalhos de teclado
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
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [loading, count]);

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
        bestDay: null,
        typeStats: {
          novo: 0,
          interacao: 0,
          rfc: 0
        }
      });
    }
  };

  const handleIncrement = () => {
    setShowModal(true);
  };

  const handleDecrement = async () => {
    // Buscar o último registro do dia para remover
    if (count === 0) {
      showToast('Nenhum chamado para remover', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: 'Remover último chamado?',
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
        // Buscar o último registro do dia
        const today = dayjs().tz().format('YYYY-MM-DD');
        const data = await callApi(
          `/api/ticket-logs?type=history&startDate=${today}&endDate=${today}&page=1`,
          {},
          { showLoading: false }
        );

        if (data.records && data.records.length > 0) {
          // Remover o primeiro registro (mais recente)
          const lastRecord = data.records[0];
          await callApi(`/api/ticket-logs?logId=${lastRecord.id}`, {
            method: 'DELETE'
          });

          await loadTodayCount();
          await loadHistoryData();
          await loadHourlyData();
          
          showToast('Último chamado removido com sucesso!', 'success');
        } else {
          showToast('Nenhum chamado encontrado para remover', 'warning');
        }
      } catch (error) {
        console.error('Erro ao remover último chamado:', error);
        showToast('Erro ao remover chamado', 'error');
      }
    }
  };

  // Função para validar URL do ERP (Olist ou Tiny)
  const validateErpUrl = (url) => {
    const cleanUrl = url.trim();
    
    // Bloquear URLs de exemplo
    if (cleanUrl === 'https://erp.olist.com/suporte#edit/ID_DO_CHAMADO' || 
        cleanUrl === 'https://erp.tiny.com.br/suporte#edit/ID_DO_CHAMADO') {
      return false;
    }
    
    // Padrões aceitos: 
    // - https://erp.olist.com/suporte#edit/ID_NUMERICO
    // - https://erp.tiny.com.br/suporte#edit/ID_NUMERICO
    const olistUrlPattern = /^https:\/\/erp\.olist\.com\/suporte#edit\/\d+$/;
    const tinyUrlPattern = /^https:\/\/erp\.tiny\.com\.br\/suporte#edit\/\d+$/;
    
    return olistUrlPattern.test(cleanUrl) || tinyUrlPattern.test(cleanUrl);
  };

  // Validação em tempo real da URL
  const handleUrlChange = (value) => {
    setTicketUrl(value);
    
    if (value.trim() === '') {
      setUrlValidationError('');
      return;
    }

    // Verificar se é uma URL válida primeiro
    try {
      new URL(value);
    } catch {
      setUrlValidationError('URL inválida');
      return;
    }

    // Verificar se segue o padrão do ERP (Olist ou Tiny)
    if (!validateErpUrl(value)) {
      setUrlValidationError('URL deve seguir o padrão: https://erp.olist.com/suporte#edit/ID_NUMERICO ou https://erp.tiny.com.br/suporte#edit/ID_NUMERICO');
    } else {
      setUrlValidationError('');
    }
  };

  const handleAddTicket = async () => {
    if (!ticketUrl.trim()) {
      showToast('URL do chamado é obrigatória', 'error');
      return;
    }

    // Validar se é uma URL válida
    try {
      new URL(ticketUrl);
    } catch {
      showToast('URL inválida', 'error');
      return;
    }

    // Validar se segue o padrão do ERP (Olist ou Tiny)
    if (!validateErpUrl(ticketUrl)) {
      await Swal.fire({
        title: 'URL Inválida',
        html: `
          <div style="text-align: left; padding: 10px;">
            <p style="margin-bottom: 15px; color: #dc2626; font-weight: 500;">
              ❌ A URL não segue o padrão exigido dos sistemas ERP.
            </p>
            
            <p style="margin-bottom: 10px; font-weight: 500; color: #333;">
              📋 <strong>Formatos aceitos:</strong>
            </p>
            <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; border: 1px solid #d1d5db; margin-bottom: 15px;">
              <code style="color: #059669; font-family: monospace; font-size: 13px;">
                https://erp.olist.com/suporte#edit/ID_DO_CHAMADO
              </code>
              <br />
              <code style="color: #059669; font-family: monospace; font-size: 13px;">
                https://erp.tiny.com.br/suporte#edit/ID_DO_CHAMADO
              </code>
            </div>
            
            <p style="margin-bottom: 10px; font-weight: 500; color: #333;">
              💡 <strong>Exemplos válidos:</strong>
            </p>
            <div style="background: #ecfdf5; padding: 12px; border-radius: 6px; border: 1px solid #bbf7d0; margin-bottom: 15px;">
              <code style="color: #059669; font-family: monospace; font-size: 13px;">
                https://erp.olist.com/suporte#edit/1062209674
              </code>
              <br />
              <code style="color: #059669; font-family: monospace; font-size: 13px;">
                https://erp.tiny.com.br/suporte#edit/1062209674
              </code>
            </div>
            
            <p style="margin-bottom: 5px; color: #6b7280; font-size: 14px;">
              <strong>Verifique se:</strong>
            </p>
            <ul style="margin: 5px 0 0 20px; color: #6b7280; font-size: 14px;">
              <li>A URL começa com <code>https://erp.olist.com/suporte#edit/</code> ou <code>https://erp.tiny.com.br/suporte#edit/</code></li>
              <li>Termina com o ID numérico do chamado</li>
              <li>Não possui caracteres extras no final</li>
            </ul>
          </div>
        `,
        icon: 'error',
        confirmButtonText: 'Entendi',
        confirmButtonColor: '#dc2626',
        background: 'var(--box-color)',
        color: 'var(--text-color)',
        width: '550px'
      });
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
          description: description.trim(),
          ticketType: ticketType.value
        })
      });

      // Resetar modal
      setTicketUrl('');
      setDescription('');
      setTicketType({ value: 'novo', label: 'Novo', color: '#10B981' });
      setUrlValidationError('');
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

  const handleClear = async () => {
    const result = await Swal.fire({
      title: 'Limpar contagem do dia?',
      text: 'Esta ação irá remover todos os chamados registrados hoje. Não pode ser desfeita.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, limpar',
      cancelButtonText: 'Cancelar',
      background: 'var(--box-color)',
      color: 'var(--text-color)'
    });

    if (result.isConfirmed) {
      try {
        // Buscar todos os registros do dia
        const today = dayjs().tz().format('YYYY-MM-DD');
        const data = await callApi(
          `/api/ticket-logs?type=history&startDate=${today}&endDate=${today}&page=1`,
          {},
          { showLoading: false }
        );

        if (data.records && data.records.length > 0) {
          // Remover todos os registros do dia
          const deletePromises = data.records.map(record => 
            callApi(`/api/ticket-logs?logId=${record.id}`, {
              method: 'DELETE'
            })
          );

          await Promise.all(deletePromises);

          await loadTodayCount();
          await loadHistoryData();
          await loadHourlyData();
          
          showToast('Contagem zerada com sucesso!', 'success');
        } else {
          showToast('Nenhum registro encontrado para limpar', 'warning');
        }
      } catch (error) {
        console.error('Erro ao limpar contagem:', error);
        showToast('Erro ao limpar contagem', 'error');
      }
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
        (() => {
          const timeStr = record.logged_time;
          if (!timeStr) return '--:--';
          
          // Se for um timestamp completo, extrair apenas a hora
          if (timeStr.includes('T') || timeStr.includes(' ')) {
            return dayjs(timeStr).format('HH:mm');
          }
          
          // Se for apenas time, usar formato simples
          if (timeStr.includes(':')) {
            const timeParts = timeStr.split(':');
            return `${timeParts[0]}:${timeParts[1]}`;
          }
          
          return timeStr;
        })(),
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

  const exportFechamento = async () => {
    try {
      const dataAtual = dayjs().tz().format('DD/MM/YYYY');
      const typeStats = statistics.typeStats || { novo: 0, interacao: 0, rfc: 0 };
      
      const fechamentoText = `Fechamento: ${dataAtual}

Novos: ${typeStats.novo}
Retornos: ${typeStats.interacao}
RFC: ${typeStats.rfc}`;
      
      // Copiar para área de transferência
      await navigator.clipboard.writeText(fechamentoText);
      
      showToast('📋 Dados de fechamento copiados para área de transferência!', 'success');
    } catch (error) {
      console.error('Erro ao copiar para área de transferência:', error);
      showToast('Erro ao copiar dados de fechamento', 'error');
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

      {/* Container do contador com efeito de hover */}
      <motion.div 
        className={styles.counterDisplay}
        whileHover={{ scale: 1.005 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        <motion.button
          className={`${styles.counterButton} ${styles.decrementButton}`}
          onClick={handleDecrement}
          disabled={loading || count === 0}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <Minus size={28} />
        </motion.button>

        <AnimatePresence mode="wait">
          <motion.div 
            key={count}
            className={styles.counterValue}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {loading ? '...' : count}
          </motion.div>
        </AnimatePresence>

        <motion.button
          className={`${styles.counterButton} ${styles.incrementButton}`}
          onClick={handleIncrement}
          disabled={loading}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <Plus size={28} />
        </motion.button>
      </motion.div>

      {/* Barra de Progresso */}
      <ProgressBarLogger count={count} />

      {/* Botão Limpar Contagem */}
      <motion.div
        className={styles.clearButtonContainer}
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <motion.button
          className={styles.clearButton}
          onClick={handleClear}
          disabled={loading || count === 0}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          transition={{ duration: 0.2 }}
        >
          <div className={styles.clearButtonContent}>
            <Trash2 size={18} />
            <span>Limpar Contagem do Dia</span>
          </div>
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
            onClick={() => {
              if (!modalLoading) {
                setTicketUrl('');
                setDescription('');
                setTicketType({ value: 'novo', label: 'Novo', color: '#10B981' });
                setUrlValidationError('');
                setShowModal(false);
              }
            }}
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
                  onClick={() => {
                    if (!modalLoading) {
                      setTicketUrl('');
                      setDescription('');
                      setTicketType({ value: 'novo', label: 'Novo', color: '#10B981' });
                      setUrlValidationError('');
                      setShowModal(false);
                    }
                  }}
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
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://erp.olist.com/suporte#edit/ID_DO_CHAMADO"
                    className={`${styles.modalInput} ${urlValidationError ? styles.inputError : ''}`}
                    disabled={modalLoading}
                  />
                  {urlValidationError && (
                    <div className={styles.errorMessage}>
                      {urlValidationError}
                    </div>
                  )}
                  <div className={styles.urlExample}>
                    <small>
                      <strong>Exemplos:</strong> https://erp.olist.com/suporte#edit/ID_DO_CHAMADO ou https://erp.tiny.com.br/suporte#edit/ID_DO_CHAMADO
                    </small>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>Tipo de Registro *</label>
                  <div className={styles.radioGroup}>
                    {ticketTypeOptions.map((option) => (
                      <label key={option.value} className={styles.radioOption}>
                        <input
                          type="radio"
                          name="ticketType"
                          value={option.value}
                          checked={ticketType?.value === option.value}
                          onChange={() => setTicketType(option)}
                          disabled={modalLoading}
                          className={styles.radioInput}
                        />
                        <div className={styles.radioLabel}>
                          <div
                            className={styles.radioIndicator}
                            style={{
                              backgroundColor: option.color
                            }}
                          />
                          <span>{option.label}</span>
                        </div>
                      </label>
                    ))}
                  </div>
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
                  onClick={() => {
                    setTicketUrl('');
                    setDescription('');
                    setTicketType({ value: 'novo', label: 'Novo', color: '#10B981' });
                    setUrlValidationError('');
                    setShowModal(false);
                  }}
                  disabled={modalLoading}
                >
                  Cancelar
                </button>
                <button
                  className={styles.modalPrimaryButton}
                  onClick={handleAddTicket}
                  disabled={modalLoading || !ticketUrl.trim() || urlValidationError !== ''}
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
        
        {/* Totalizadores por tipo de registro */}
        {statistics.typeStats && (
          <div className={styles.typeStatsSection}>
            <div className={styles.typeStatsGrid}>
              <div className={styles.typeStatCard}>
                <div className={styles.typeStatValue} style={{ color: '#10b981' }}>
                  {statistics.typeStats.novo}
                </div>
                <div className={styles.typeStatLabel}>
                  <span className={styles.typeTag} style={{ backgroundColor: '#10b981', color: 'white' }}>
                    Novo
                  </span>
                </div>
              </div>
              
              <div className={styles.typeStatCard}>
                <div className={styles.typeStatValue} style={{ color: '#3b82f6' }}>
                  {statistics.typeStats.interacao}
                </div>
                <div className={styles.typeStatLabel}>
                  <span className={styles.typeTag} style={{ backgroundColor: '#3b82f6', color: 'white' }}>
                    Retorno
                  </span>
                </div>
              </div>
              
              <div className={styles.typeStatCard}>
                <div className={styles.typeStatValue} style={{ color: '#f59e0b' }}>
                  {statistics.typeStats.rfc}
                </div>
                <div className={styles.typeStatLabel}>
                  <span className={styles.typeTag} style={{ backgroundColor: '#f59e0b', color: 'white' }}>
                    RFC
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
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
        
        <motion.button
          className={styles.exportButton}
          onClick={exportFechamento}
          disabled={loading}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          transition={{ duration: 0.2 }}
        >
          <Copy size={18} />
          <span>Exportar Fechamento</span>
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
                  <th className={tableStyles.tableHeaderCell}>Tipo</th>
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
                          <small>
                            {(() => {
                              // Tentar diferentes formatos para o logged_time
                              const timeStr = record.logged_time;
                              if (!timeStr) return '--:--';
                              
                              // Se for um timestamp completo, extrair apenas a hora
                              if (timeStr.includes('T') || timeStr.includes(' ')) {
                                return dayjs(timeStr).format('HH:mm');
                              }
                              
                              // Se for apenas time, usar formato simples
                              if (timeStr.includes(':')) {
                                const timeParts = timeStr.split(':');
                                return `${timeParts[0]}:${timeParts[1]}`;
                              }
                              
                              return timeStr;
                            })()}
                          </small>
                        </div>
                      </td>
                      <td className={`${tableStyles.tableCell} ${styles.typeCell}`}>
                        {(() => {
                          const typeInfo = getTicketTypeInfo(record.ticket_type);
                          return (
                            <div 
                              className={styles.ticketTypeTag}
                              style={{
                                backgroundColor: typeInfo.color,
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                textAlign: 'center',
                                whiteSpace: 'nowrap',
                                display: 'inline-block'
                              }}
                            >
                              {typeInfo.label}
                            </div>
                          );
                        })()} 
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
                    <td colSpan="5" className={tableStyles.emptyMessage}>
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