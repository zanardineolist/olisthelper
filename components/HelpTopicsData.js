import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  FormControl,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  IconButton,
  Tooltip,
  CircularProgress,
  Chip,
  Badge
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import ptBR from 'date-fns/locale/pt-BR';
import { format, startOfMonth, endOfMonth, subDays, getYear, getMonth, getDate } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime, format as formatTZ } from 'date-fns-tz';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import GeminiChat from './GeminiChat';


const TIMEZONE = 'America/Sao_Paulo';

// Funções auxiliares para trabalhar com o fuso horário brasileiro
const toBRTimezone = (date) => utcToZonedTime(date, TIMEZONE);
const fromBRTimezone = (date) => zonedTimeToUtc(date, TIMEZONE);

// Função para formatar o texto da análise com markdown
const formatAnalysisText = (text) => {
  if (!text) return '';
  
  return text
    // Headers
    .replace(/^## (.*$)/gim, '<h2 style="color: var(--title-color); margin: 28px 0 16px 0; font-size: 1.3rem; font-weight: 600; border-bottom: 2px solid var(--color-primary); padding-bottom: 6px;">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 style="color: var(--title-color); margin: 24px 0 12px 0; font-size: 1.15rem; font-weight: 600;">$1</h3>')
    .replace(/^#### (.*$)/gim, '<h4 style="color: var(--title-color); margin: 20px 0 10px 0; font-size: 1.05rem; font-weight: 600;">$1</h4>')
    
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600; color: var(--title-color);">$1</strong>')
    
    // Italic text
    .replace(/\*(.*?)\*/g, '<em style="font-style: italic;">$1</em>')
    
    // Lists
    .replace(/^\- (.*$)/gim, '<li style="margin: 10px 0; padding-left: 12px; line-height: 1.6;">$1</li>')
    .replace(/^(\d+)\. (.*$)/gim, '<li style="margin: 10px 0; padding-left: 12px; line-height: 1.6;">$2</li>')
    
    // Wrap lists in ul/ol
    .replace(/(<li.*<\/li>)/gs, '<ul style="margin: 20px 0; padding-left: 24px;">$1</ul>')
    
    // Paragraphs
    .replace(/\n\n/g, '</p><p style="margin: 18px 0; line-height: 1.7;">')
    
    // Line breaks
    .replace(/\n/g, '<br>')
    
    // Wrap in paragraph tags
    .replace(/^(.*)$/gm, '<p style="margin: 10px 0; line-height: 1.7;">$1</p>')
    
    // Clean up empty paragraphs
    .replace(/<p style="margin: 10px 0; line-height: 1.7;"><\/p>/g, '')
    .replace(/<p style="margin: 18px 0; line-height: 1.7;"><\/p>/g, '')
    
    // Clean up list formatting
    .replace(/<p style="margin: 10px 0; line-height: 1.7;"><li/g, '<li')
    .replace(/<\/li><\/p>/g, '</li>')
    .replace(/<p style="margin: 18px 0; line-height: 1.7;"><li/g, '<li')
    
    // Clean up header formatting
    .replace(/<p style="margin: 10px 0; line-height: 1.7;"><h2/g, '<h2')
    .replace(/<\/h2><\/p>/g, '</h2>')
    .replace(/<p style="margin: 10px 0; line-height: 1.7;"><h3/g, '<h3')
    .replace(/<\/h3><\/p>/g, '</h3>')
    .replace(/<p style="margin: 10px 0; line-height: 1.7;"><h4/g, '<h4')
    .replace(/<\/h4><\/p>/g, '</h4>')
    
    // Add spacing around headers
    .replace(/<\/h2>/g, '</h2><div style="margin-bottom: 20px;"></div>')
    .replace(/<\/h3>/g, '</h3><div style="margin-bottom: 16px;"></div>')
    .replace(/<\/h4>/g, '</h4><div style="margin-bottom: 12px;"></div>')
    
    // Add extra spacing for better readability
    .replace(/<\/ul>/g, '</ul><div style="margin-bottom: 16px;"></div>');
};

// Versões das funções do date-fns ajustadas para o fuso horário do Brasil
const startOfDayBR = (date) => {
  const brDate = toBRTimezone(date);
  return fromBRTimezone(new Date(getYear(brDate), getMonth(brDate), getDate(brDate), 0, 0, 0));
};

const endOfDayBR = (date) => {
  const brDate = toBRTimezone(date);
  return fromBRTimezone(new Date(getYear(brDate), getMonth(brDate), getDate(brDate), 23, 59, 59, 999));
};

const startOfMonthBR = (date) => {
  const brDate = toBRTimezone(date);
  return fromBRTimezone(new Date(getYear(brDate), getMonth(brDate), 1, 0, 0, 0));
};

const endOfMonthBR = (date) => {
  const brDate = toBRTimezone(date);
  return fromBRTimezone(endOfMonth(brDate));
};

const subDaysBR = (date, amount) => {
  const brDate = toBRTimezone(date);
  return fromBRTimezone(subDays(brDate, amount));
};

const formatDateBR = (date, formatStr) => {
  return formatTZ(toBRTimezone(date), formatStr, { timeZone: TIMEZONE });
};

// Função para determinar o nível de atenção baseado na contagem
const getAttentionLevel = (count) => {
  if (count > 50) return { level: 'critical', color: '#E64E36', icon: 'fa-exclamation-triangle' };
  if (count > 30) return { level: 'high', color: '#F0A028', icon: 'fa-exclamation-circle' };
  if (count > 15) return { level: 'medium', color: '#779E3D', icon: 'fa-info-circle' };
  return { level: 'low', color: '#0A4EE4', icon: 'fa-circle-dot' };
};

export default function HelpTopicsData() {
  const [period, setPeriod] = useState('today');
  const [startDate, setStartDate] = useState(startOfDayBR(new Date()));
  const [endDate, setEndDate] = useState(endOfDayBR(new Date()));
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDateDialog, setOpenDateDialog] = useState(false);
  
  // Estados para o modal de detalhes
  const [openDetailsModal, setOpenDetailsModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [topicDetails, setTopicDetails] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Estados para análise do Gemini
  const [openGeminiModal, setOpenGeminiModal] = useState(false);
  const [geminiAnalysis, setGeminiAnalysis] = useState('');
  const [loadingGemini, setLoadingGemini] = useState(false);
  const [analysisType, setAnalysisType] = useState('insights');
  const [analysisCache, setAnalysisCache] = useState({}); // Cache para análises já realizadas
  
  // Estados para análise em etapas
  const [stagedAnalysis, setStagedAnalysis] = useState({
    stage: null, // 'collecting', 'analyzing', 'complete'
    progress: 0,
    message: '',
    includeDetails: false
  });

  // Estados para o chat
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    loadTopics();
  }, [period, startDate, endDate]);

  const handlePeriodChange = (event) => {
    const selectedPeriod = event.target.value;
    setPeriod(selectedPeriod);
    
    // Atualizar as datas baseado no período selecionado
    const now = new Date();
    
    switch(selectedPeriod) {
      case 'today':
        setStartDate(startOfDayBR(now));
        setEndDate(endOfDayBR(now));
        break;
      case 'last7days':
        setStartDate(startOfDayBR(subDaysBR(now, 6)));
        setEndDate(endOfDayBR(now));
        break;
      case 'last30days':
        setStartDate(startOfDayBR(subDaysBR(now, 29)));
        setEndDate(endOfDayBR(now));
        break;
      case 'currentMonth':
        setStartDate(startOfMonthBR(now));
        setEndDate(endOfMonthBR(now));
        break;
      case 'custom':
        setOpenDateDialog(true);
        break;
      default:
        break;
    }
  };

  const handleCloseDateDialog = () => {
    setOpenDateDialog(false);
    
    // Se cancelou a seleção personalizada e não tinha datas anteriores, voltar para "hoje"
    if (period === 'custom' && (!startDate || !endDate)) {
      setPeriod('today');
      setStartDate(startOfDayBR(new Date()));
      setEndDate(endOfDayBR(new Date()));
    }
  };

  const handleConfirmDateRange = () => {
    // Validar se as datas estão corretas
    if (!startDate || !endDate) {
      Swal.fire('Erro', 'Por favor, selecione datas válidas', 'error');
      return;
    }
    
    if (startDate > endDate) {
      Swal.fire('Erro', 'A data inicial não pode ser posterior à data final', 'error');
      return;
    }
    
    setOpenDateDialog(false);
    // Carregar os dados com o período personalizado
    loadTopics();
  };

  const loadTopics = async () => {
    try {
      setLoading(true);
      
      // Formatando as datas para enviar à API
      const formattedStartDate = formatDateBR(startDate, 'yyyy-MM-dd');
      const formattedEndDate = formatDateBR(endDate, 'yyyy-MM-dd');
      
      const res = await fetch(`/api/get-help-topics?startDate=${formattedStartDate}&endDate=${formattedEndDate}`);
      
      if (!res.ok) throw new Error('Erro ao carregar dados');
      
      const data = await res.json();
      setTopics(data.topics);
    } catch (error) {
      console.error('Erro ao carregar temas de dúvidas:', error);
      Swal.fire('Erro', 'Não foi possível carregar os temas de dúvidas.', 'error');
      setTopics([]);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(topics);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Temas de Dúvidas");
      
      // Formatando o nome do arquivo com o período
      let periodText = '';
      switch(period) {
        case 'today':
          periodText = 'hoje';
          break;
        case 'last7days':
          periodText = 'ultimos-7-dias';
          break;
        case 'last30days':
          periodText = 'ultimos-30-dias';
          break;
        case 'currentMonth':
          periodText = 'mes-atual';
          break;
        case 'custom':
          periodText = `${formatDateBR(startDate, 'dd-MM-yyyy')}_a_${formatDateBR(endDate, 'dd-MM-yyyy')}`;
          break;
      }
      
      XLSX.writeFile(workbook, `temas-duvidas-${periodText}.xlsx`);
      Swal.fire('Sucesso', 'Relatório exportado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error);
      Swal.fire('Erro', 'Não foi possível exportar o relatório.', 'error');
    }
  };

  const exportToCSV = () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(topics);
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      
      // Criar um blob e fazer download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      // Formatando o nome do arquivo com o período
      let periodText = '';
      switch(period) {
        case 'today':
          periodText = 'hoje';
          break;
        case 'last7days':
          periodText = 'ultimos-7-dias';
          break;
        case 'last30days':
          periodText = 'ultimos-30-dias';
          break;
        case 'currentMonth':
          periodText = 'mes-atual';
          break;
        case 'custom':
          periodText = `${formatDateBR(startDate, 'dd-MM-yyyy')}_a_${formatDateBR(endDate, 'dd-MM-yyyy')}`;
          break;
      }
      
      link.href = url;
      link.setAttribute('download', `temas-duvidas-${periodText}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      Swal.fire('Sucesso', 'Relatório CSV exportado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao exportar para CSV:', error);
      Swal.fire('Erro', 'Não foi possível exportar o relatório CSV.', 'error');
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Título do relatório
      doc.setFontSize(16);
      doc.text('Relatório de Temas de Dúvidas', 14, 15);
      
      // Período do relatório
      doc.setFontSize(12);
      let periodText = '';
      switch(period) {
        case 'today':
          periodText = 'Hoje';
          break;
        case 'last7days':
          periodText = 'Últimos 7 dias';
          break;
        case 'last30days':
          periodText = 'Últimos 30 dias';
          break;
        case 'currentMonth':
          periodText = 'Mês atual';
          break;
        case 'custom':
          periodText = `${formatDateBR(startDate, 'dd/MM/yyyy')} a ${formatDateBR(endDate, 'dd/MM/yyyy')}`;
          break;
      }
      doc.text(`Período: ${periodText}`, 14, 25);
      
      // Tabela de dados
      const tableColumn = ["Ranking", "Tema", "Quantidade", "Porcentagem"];
      const tableRows = topics.map((topic, index) => [
        index + 1,
        topic.name,
        topic.count,
        `${topic.percentage}%`
      ]);
      
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'grid',
        styles: {
          fontSize: 10
        }
      });
      
      doc.save(`temas-duvidas-${periodText.toLowerCase().replace(/ /g, '-')}.pdf`);
      Swal.fire('Sucesso', 'Relatório PDF exportado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao exportar para PDF:', error);
      Swal.fire('Erro', 'Não foi possível exportar o relatório PDF.', 'error');
    }
  };

  // Função para abrir o modal de detalhes ao clicar em um tema
  const handleOpenDetails = async (topic) => {
    try {
      setSelectedTopic(topic);
      setOpenDetailsModal(true);
      setLoadingDetails(true);
      
      // Formatando as datas para enviar à API
      const formattedStartDate = formatDateBR(startDate, 'yyyy-MM-dd');
      const formattedEndDate = formatDateBR(endDate, 'yyyy-MM-dd');
      
      // Buscar os detalhes do tema
      const res = await fetch(`/api/get-topic-details?categoryId=${topic.id}&startDate=${formattedStartDate}&endDate=${formattedEndDate}`);
      
      if (!res.ok) throw new Error('Erro ao carregar detalhes');
      
      const data = await res.json();
      setTopicDetails(data.details || []);
    } catch (error) {
      console.error('Erro ao buscar detalhes do tema:', error);
      Swal.fire('Erro', 'Não foi possível carregar os detalhes deste tema.', 'error');
      setTopicDetails([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Função para fechar o modal de detalhes
  const handleCloseDetails = () => {
    setOpenDetailsModal(false);
    setSelectedTopic(null);
    setTopicDetails([]);
  };

  // Função para análise em etapas com detalhes
  const handleStagedAnalysis = async (includeDetails = false) => {
    try {
      setLoadingGemini(true);
      setOpenGeminiModal(true);
      setGeminiAnalysis('');
      setStagedAnalysis({
        stage: 'collecting',
        progress: 0,
        message: 'Coletando dados básicos dos temas...',
        includeDetails
      });

      const formattedStartDate = formatDateBR(startDate, 'yyyy-MM-dd');
      const formattedEndDate = formatDateBR(endDate, 'yyyy-MM-dd');

      // Verificar cache
      const cacheKey = `${formattedStartDate}-${formattedEndDate}-staged-${includeDetails}`;
      const cachedAnalysis = analysisCache[cacheKey];

      if (cachedAnalysis) {
        setGeminiAnalysis(cachedAnalysis);
        setLoadingGemini(false);
        setStagedAnalysis({
          stage: 'complete',
          progress: 100,
          message: 'Análise carregada do cache',
          includeDetails
        });
        return;
      }

      // Simular progresso da coleta de dados
      setStagedAnalysis(prev => ({
        ...prev,
        progress: 25,
        message: includeDetails ? 'Coletando detalhes dos registros de ajuda...' : 'Preparando dados para análise...'
      }));

              // Configurar timeout para a requisição
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos para análises otimizadas

      const res = await fetch('/api/gemini-analysis-staged', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topics,
          period,
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          analysisType,
          includeDetails
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Erro ${res.status}: ${res.statusText}`);
      }

      setStagedAnalysis(prev => ({
        ...prev,
        stage: 'analyzing',
        progress: 75,
        message: 'Analisando dados com IA...'
      }));

      const data = await res.json();
      
      // Adicionar nota se houver limitação de dados
      let analysisText = data.analysis;
      if (data.metadata?.note) {
        analysisText = `📝 ${data.metadata.note}\n\n${analysisText}`;
      }
      
      // Adicionar informações sobre detalhes incluídos
      if (includeDetails && data.metadata?.detailsCount) {
        analysisText = `🔍 Análise com ${data.metadata.detailsCount} registros detalhados\n\n${analysisText}`;
      }
      
      setGeminiAnalysis(analysisText);
      setAnalysisCache(prev => ({ ...prev, [cacheKey]: analysisText })); // Adicionar ao cache
      
      setStagedAnalysis({
        stage: 'complete',
        progress: 100,
        message: 'Análise concluída com sucesso!',
        includeDetails
      });
    } catch (error) {
      console.error('Erro na análise em etapas do Gemini:', error);
      
      let errorMessage = 'Não foi possível gerar a análise em etapas.';
      if (error.name === 'AbortError') {
        errorMessage = 'A análise demorou muito. Tente com um período menor ou sem detalhes.';
      } else if (error.message.includes('504')) {
        errorMessage = 'Servidor sobrecarregado. Tente novamente em alguns instantes.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Tempo limite excedido. Tente com menos dados ou período menor.';
      } else if (error.message.includes('quota')) {
        errorMessage = 'Limite de requisições da IA excedido. Tente novamente em alguns minutos.';
      } else if (error.message.includes('API key')) {
        errorMessage = 'Erro de configuração da IA. Entre em contato com o administrador.';
      } else if (error.message.includes('500')) {
        errorMessage = 'Erro interno do servidor. Tente novamente em alguns instantes.';
      }
      
      Swal.fire('Erro', errorMessage, 'error');
      setGeminiAnalysis('Erro ao gerar análise em etapas. Tente novamente.');
      setStagedAnalysis({
        stage: null,
        progress: 0,
        message: 'Erro na análise',
        includeDetails
      });
    } finally {
      setLoadingGemini(false);
    }
  };

  // Função para análise simples do Gemini
  const handleSimpleAnalysis = async () => {
    try {
      setLoadingGemini(true);
      setOpenGeminiModal(true);
      setGeminiAnalysis('');

      const formattedStartDate = formatDateBR(startDate, 'yyyy-MM-dd');
      const formattedEndDate = formatDateBR(endDate, 'yyyy-MM-dd');

      // Verificar cache
      const cacheKey = `${formattedStartDate}-${formattedEndDate}-simple`;
      const cachedAnalysis = analysisCache[cacheKey];

      if (cachedAnalysis) {
        setGeminiAnalysis(cachedAnalysis);
        setLoadingGemini(false);
        return;
      }

      // Configurar timeout para a requisição (versão simplificada)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000); // 35 segundos

      const res = await fetch('/api/gemini-analysis-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topics,
          period,
          startDate: formattedStartDate,
          endDate: formattedEndDate
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Erro ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      
      // Adicionar nota se houver limitação de dados
      let analysisText = data.analysis;
      if (data.metadata?.note) {
        analysisText = `⚡ ${data.metadata.note}\n\n${analysisText}`;
      }
      
      // Adicionar indicador de cache se aplicável
      const isFromCache = analysisCache[cacheKey];
      if (!isFromCache) {
        analysisText = `🚀 Análise rápida gerada\n\n${analysisText}`;
      }
      
      setGeminiAnalysis(analysisText);
      setAnalysisCache(prev => ({ ...prev, [cacheKey]: analysisText })); // Adicionar ao cache
    } catch (error) {
      console.error('Erro na análise simples do Gemini:', error);
      
      let errorMessage = 'Não foi possível gerar a análise rápida.';
      if (error.name === 'AbortError') {
        errorMessage = 'A análise rápida demorou muito. Tente novamente.';
      } else if (error.message.includes('504')) {
        errorMessage = 'Servidor sobrecarregado. Tente novamente em alguns instantes.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Tempo limite excedido. Tente novamente.';
      } else if (error.message.includes('quota')) {
        errorMessage = 'Limite de requisições da IA excedido. Tente novamente em alguns minutos.';
      } else if (error.message.includes('API key')) {
        errorMessage = 'Erro de configuração da IA. Entre em contato com o administrador.';
      } else if (error.message.includes('500')) {
        errorMessage = 'Erro interno do servidor. Tente novamente em alguns instantes.';
      }
      
      Swal.fire('Erro', errorMessage, 'error');
      setGeminiAnalysis('Erro ao gerar análise rápida. Tente novamente.');
    } finally {
      setLoadingGemini(false);
    }
  };

  // Função para análise do Gemini
  const handleGeminiAnalysis = async () => {
    try {
      setLoadingGemini(true);
      setOpenGeminiModal(true);
      setGeminiAnalysis('');

      const formattedStartDate = formatDateBR(startDate, 'yyyy-MM-dd');
      const formattedEndDate = formatDateBR(endDate, 'yyyy-MM-dd');

      // Verificar cache
      const cacheKey = `${formattedStartDate}-${formattedEndDate}-${analysisType}`;
      const cachedAnalysis = analysisCache[cacheKey];

      if (cachedAnalysis) {
        setGeminiAnalysis(cachedAnalysis);
        setLoadingGemini(false);
        return;
      }

      // Configurar timeout para a requisição (otimizado para máxima performance)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 40000); // 40 segundos para análises

      const res = await fetch('/api/gemini-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topics,
          period,
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          analysisType
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      
      // Adicionar nota se houver limitação de dados
      let analysisText = data.analysis;
      if (data.metadata?.note) {
        analysisText = `📝 ${data.metadata.note}\n\n${analysisText}`;
      }
      
      // Adicionar indicador de cache se aplicável
      const isFromCache = analysisCache[cacheKey];
      if (!isFromCache) {
        analysisText = `⚡ Análise gerada em tempo real\n\n${analysisText}`;
      }
      
      setGeminiAnalysis(analysisText);
      setAnalysisCache(prev => ({ ...prev, [cacheKey]: analysisText })); // Adicionar ao cache
    } catch (error) {
      console.error('Erro na análise do Gemini:', error);
      
      let errorMessage = 'Não foi possível gerar a análise com IA.';
      if (error.name === 'AbortError') {
        errorMessage = 'A análise demorou muito. Tente com um período menor ou aguarde um pouco e tente novamente.';
      } else if (error.message.includes('504')) {
        errorMessage = 'Servidor sobrecarregado. Tente novamente em alguns instantes ou use um período menor.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Tempo limite excedido. Tente com menos dados ou período menor.';
      } else if (error.message.includes('quota')) {
        errorMessage = 'Limite de requisições da IA excedido. Tente novamente em alguns minutos.';
      } else if (error.message.includes('API key')) {
        errorMessage = 'Erro de configuração da IA. Entre em contato com o administrador.';
      } else if (error.message.includes('500')) {
        errorMessage = 'Erro interno do servidor. Tente novamente em alguns instantes.';
      }
      
      Swal.fire('Erro', errorMessage, 'error');
      setGeminiAnalysis('Erro ao gerar análise. Tente novamente.');
    } finally {
      setLoadingGemini(false);
    }
  };



  return (
    <Box sx={{ p: 2 }}>
      {/* Seção do filtro de período */}
      <Paper 
        sx={{ 
          p: 3, 
          mb: 3, 
          backgroundColor: 'var(--box-color)',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
          border: '1px solid var(--color-border)'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography 
            variant="h5" 
            component="h2" 
            sx={{ 
              color: 'var(--title-color)',
              fontSize: '1.3rem',
              fontWeight: 600,
              m: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <i className="fa-solid fa-filter" style={{ color: 'var(--color-primary)' }}></i>
            Filtros de Período
          </Typography>
          
          <FormControl 
            sx={{ 
              minWidth: 200,
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'var(--modals-inputs)',
                borderColor: 'var(--color-border)',
                color: 'var(--text-color)'
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'var(--color-border)'
              },
              '& .MuiInputLabel-root': {
                color: 'var(--text-color)'
              }
            }}
          >
            <Select
              value={period}
              onChange={handlePeriodChange}
              size="small"
              displayEmpty
              sx={{
                fontSize: '0.9rem',
                backgroundColor: 'var(--modals-inputs)',
                color: 'var(--text-color)'
              }}
            >
              <MenuItem value="today">Hoje</MenuItem>
              <MenuItem value="last7days">Últimos 7 dias</MenuItem>
              <MenuItem value="last30days">Últimos 30 dias</MenuItem>
              <MenuItem value="currentMonth">Mês atual</MenuItem>
              <MenuItem value="custom">Período personalizado</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Seção de Ações de IA */}
        {topics.length > 0 && (
          <Box 
            sx={{ 
              mb: 3,
              p: 2,
              backgroundColor: 'var(--box-color2)',
              borderRadius: '8px',
              border: '1px solid var(--color-border)'
            }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'var(--title-color)',
                fontSize: '1.1rem',
                fontWeight: 600,
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <i className="fa-solid fa-robot" style={{ color: 'var(--color-primary)' }}></i>
              Análise com Inteligência Artificial
            </Typography>
            
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'var(--text-color2)',
                fontSize: '0.9rem',
                mb: 2,
                lineHeight: 1.5
              }}
            >
              <strong>Análise IA:</strong> Análise básica dos temas principais (45s)<br/>
              <strong>Análise Detalhada:</strong> Inclui registros dos top 5 temas (45s)<br/>
              <strong>Análise Rápida:</strong> Versão simplificada para casos de emergência
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button 
                variant="contained" 
                onClick={() => handleStagedAnalysis(false)}
                disabled={loading}
                startIcon={<i className="fa-solid fa-chart-line"></i>}
                sx={{
                  backgroundColor: 'var(--color-primary)',
                  '&:hover': {
                    backgroundColor: 'var(--color-primary-hover)'
                  },
                  '&.Mui-disabled': {
                    backgroundColor: 'var(--text-color2)',
                    color: 'var(--text-color2)'
                  }
                }}
              >
                Análise IA
              </Button>
              
              <Button 
                variant="outlined" 
                onClick={() => handleStagedAnalysis(true)}
                disabled={loading}
                startIcon={<i className="fa-solid fa-search-plus"></i>}
                sx={{
                  borderColor: 'var(--color-accent3)',
                  color: 'var(--color-accent3)',
                  '&:hover': {
                    backgroundColor: 'rgba(119, 158, 61, 0.05)',
                    borderColor: 'var(--color-accent3)'
                  },
                  '&.Mui-disabled': {
                    borderColor: 'var(--text-color2)',
                    color: 'var(--text-color2)'
                  }
                }}
              >
                Análise Detalhada
              </Button>
              
              <Button 
                variant="outlined" 
                onClick={handleSimpleAnalysis}
                disabled={loading}
                startIcon={<i className="fa-solid fa-bolt"></i>}
                sx={{
                  borderColor: 'var(--color-accent2)',
                  color: 'var(--color-accent2)',
                  '&:hover': {
                    backgroundColor: 'rgba(240, 160, 40, 0.05)',
                    borderColor: 'var(--color-accent2)'
                  },
                  '&.Mui-disabled': {
                    borderColor: 'var(--text-color2)',
                    color: 'var(--text-color2)'
                  }
                }}
              >
                Análise Rápida
              </Button>
              

              
              <Button 
                variant="contained" 
                onClick={() => setShowChat(true)}
                disabled={loading}
                startIcon={<i className="fa-solid fa-comments"></i>}
                sx={{
                  backgroundColor: 'var(--color-accent2)',
                  '&:hover': {
                    backgroundColor: 'var(--color-accent2-hover)'
                  },
                  '&.Mui-disabled': {
                    backgroundColor: 'var(--text-color2)',
                    color: 'var(--text-color2)'
                  }
                }}
              >
                Chat IA
              </Button>
              

            </Box>
          </Box>
        )}

        {period === 'custom' && (
          <Box 
            sx={{ 
              display: 'flex', 
              gap: 2, 
              mb: 3, 
              alignItems: 'center',
              padding: '12px 16px',
              backgroundColor: 'var(--box-color2)',
              borderRadius: '8px',
              border: '1px solid var(--color-border)'
            }}
          >
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: '0.9rem',
                color: 'var(--text-color)',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <i className="fa-solid fa-calendar-range" style={{ color: 'var(--color-primary)' }}></i>
              <span style={{ color: 'var(--text-color2)', fontWeight: 500 }}>Período:</span>
              <span style={{ color: 'var(--title-color)', fontWeight: 600 }}>
                {formatDateBR(startDate, 'dd/MM/yyyy')} a {formatDateBR(endDate, 'dd/MM/yyyy')}
              </span>
            </Typography>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={() => setOpenDateDialog(true)}
              sx={{
                borderColor: 'var(--color-primary)',
                color: 'var(--color-primary)',
                '&:hover': {
                  borderColor: 'var(--color-primary-hover)',
                  backgroundColor: 'rgba(10, 78, 228, 0.05)'
                }
              }}
            >
              <i className="fa-solid fa-edit" style={{ marginRight: '6px' }}></i>
              Alterar período
            </Button>
          </Box>
        )}
        
        <Box sx={{ mb: 3 }}>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <div className="loader" style={{ scale: '0.5' }}></div>
            </Box>
          ) : (
            <TableContainer 
              component={Paper} 
              variant="outlined"
              sx={{ 
                backgroundColor: 'var(--box-color4)',
                borderColor: 'var(--color-border)',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}
            >
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'var(--color-thead)' }}>
                    <TableCell 
                      sx={{ 
                        fontWeight: 600, 
                        color: 'var(--text-th)', 
                        borderBottom: '2px solid var(--color-border)',
                        fontSize: '0.9rem',
                        textAlign: 'center',
                        width: '80px'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <i className="fa-solid fa-trophy" style={{ fontSize: '0.8rem' }}></i>
                        Ranking
                      </Box>
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontWeight: 600, 
                        color: 'var(--text-th)', 
                        borderBottom: '2px solid var(--color-border)',
                        fontSize: '0.9rem'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <i className="fa-solid fa-tag" style={{ fontSize: '0.8rem' }}></i>
                        Tema
                      </Box>
                    </TableCell>
                    <TableCell 
                      align="center" 
                      sx={{ 
                        fontWeight: 600, 
                        color: 'var(--text-th)', 
                        borderBottom: '2px solid var(--color-border)',
                        fontSize: '0.9rem',
                        width: '120px'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <i className="fa-solid fa-chart-bar" style={{ fontSize: '0.8rem' }}></i>
                        Quantidade
                      </Box>
                    </TableCell>
                    <TableCell 
                      align="center"
                      sx={{ 
                        fontWeight: 600, 
                        color: 'var(--text-th)', 
                        borderBottom: '2px solid var(--color-border)',
                        fontSize: '0.9rem',
                        width: '120px'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <i className="fa-solid fa-percentage" style={{ fontSize: '0.8rem' }}></i>
                        Porcentagem
                      </Box>
                    </TableCell>
                    <TableCell 
                      align="center"
                      sx={{ 
                        fontWeight: 600, 
                        color: 'var(--text-th)', 
                        borderBottom: '2px solid var(--color-border)',
                        fontSize: '0.9rem',
                        width: '100px'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <i className="fa-solid fa-eye" style={{ fontSize: '0.8rem' }}></i>
                        Ações
                      </Box>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topics.length > 0 ? (
                    topics.map((topic, index) => {
                      const attention = getAttentionLevel(topic.count);
                      return (
                        <TableRow 
                          key={topic.id || index}
                          sx={{ 
                            backgroundColor: index % 2 === 0 ? 'var(--color-treven)' : 'var(--color-trodd)',
                            '&:hover': {
                              backgroundColor: 'var(--box-color2)',
                              cursor: 'pointer',
                              transform: 'scale(1.01)',
                              transition: 'all 0.2s ease'
                            }
                          }}
                        >
                          <TableCell 
                            align="center"
                            sx={{ 
                              color: 'var(--text-color)',
                              borderBottom: '1px solid var(--color-border)',
                              fontWeight: 600,
                              fontSize: '0.9rem'
                            }}
                          >
                            <Badge 
                              badgeContent={index + 1} 
                              color="primary"
                              sx={{
                                '& .MuiBadge-badge': {
                                  backgroundColor: 'var(--color-primary)',
                                  color: 'white',
                                  fontWeight: 'bold'
                                }
                              }}
                            >
                              <Box sx={{ width: 20, height: 20 }}></Box>
                            </Badge>
                          </TableCell>
                          <TableCell 
                            sx={{ 
                              color: 'var(--title-color)',
                              fontWeight: 500,
                              borderBottom: '1px solid var(--color-border)',
                              fontSize: '0.95rem'
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Tooltip title="Clique para ver detalhes" arrow>
                                <Box component="span" sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center',
                                  cursor: 'pointer',
                                  '&:hover': {
                                    color: 'var(--color-primary)'
                                  }
                                }}>
                                  {topic.name}
                                </Box>
                              </Tooltip>
                              <Chip
                                label={attention.level === 'critical' ? 'Crítico' : 
                                       attention.level === 'high' ? 'Alto' : 
                                       attention.level === 'medium' ? 'Médio' : 'Baixo'}
                                size="small"
                                sx={{
                                  backgroundColor: attention.color,
                                  color: 'white',
                                  fontSize: '0.7rem',
                                  fontWeight: 'bold',
                                  height: '20px'
                                }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell 
                            align="center"
                            sx={{ 
                              color: 'var(--color-primary)',
                              fontWeight: 600,
                              borderBottom: '1px solid var(--color-border)',
                              fontSize: '1rem'
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                              <i className={`fa-solid ${attention.icon}`} style={{ color: attention.color }}></i>
                              {topic.count}
                            </Box>
                          </TableCell>
                          <TableCell 
                            align="center"
                            sx={{ 
                              color: 'var(--text-color)',
                              borderBottom: '1px solid var(--color-border)',
                              fontWeight: 500,
                              fontSize: '0.9rem'
                            }}
                          >
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              backgroundColor: 'rgba(10, 78, 228, 0.1)',
                              borderRadius: '12px',
                              padding: '4px 8px',
                              width: 'fit-content',
                              margin: '0 auto'
                            }}>
                              {topic.percentage}%
                            </Box>
                          </TableCell>
                          <TableCell 
                            align="center"
                            sx={{ 
                              borderBottom: '1px solid var(--color-border)'
                            }}
                          >
                            <Tooltip title="Ver detalhes" arrow>
                              <IconButton
                                size="small"
                                onClick={() => handleOpenDetails(topic)}
                                sx={{
                                  color: 'var(--color-primary)',
                                  '&:hover': {
                                    backgroundColor: 'rgba(10, 78, 228, 0.1)'
                                  }
                                }}
                              >
                                <i className="fa-solid fa-eye"></i>
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell 
                        colSpan={5} 
                        align="center"
                        sx={{ 
                          padding: '40px 20px',
                          color: 'var(--text-color2)',
                          borderBottom: '1px solid var(--color-border)'
                        }}
                      >
                        <Box 
                          sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center',
                            gap: 2
                          }}
                        >
                          <i className="fa-solid fa-ban" style={{ fontSize: '32px', color: 'var(--color-accent1)' }}></i>
                          <Typography sx={{ fontSize: '1rem', fontWeight: 500 }}>
                            Nenhum tema de dúvida encontrado no período selecionado.
                          </Typography>
                          <Typography sx={{ fontSize: '0.9rem', color: 'var(--text-color2)' }}>
                            Tente alterar o período de análise ou verificar se há dados disponíveis.
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
        
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            borderTop: '1px solid var(--color-border)',
            paddingTop: 3,
            marginTop: 3
          }}
        >
          <Typography 
            variant="subtitle2" 
            sx={{ 
              color: 'var(--text-color2)',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <i className="fa-solid fa-info-circle"></i>
            Total de {topics.length} temas encontrados
          </Typography>
          
          {topics.length > 0 && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  alignSelf: 'center',
                  color: 'var(--text-color2)',
                  fontSize: '0.9rem'
                }}
              >
                Exportar dados:
              </Typography>
              <Button 
                variant="outlined" 
                onClick={exportToExcel}
                disabled={loading}
                startIcon={<i className="fa-solid fa-file-excel"></i>}
                sx={{
                  borderColor: 'var(--color-accent3)',
                  color: 'var(--color-accent3)',
                  '&:hover': {
                    backgroundColor: 'rgba(119, 158, 61, 0.05)',
                    borderColor: 'var(--color-accent3)'
                  },
                  '&.Mui-disabled': {
                    borderColor: 'var(--text-color2)',
                    color: 'var(--text-color2)'
                  }
                }}
              >
                Excel
              </Button>
              <Button 
                variant="outlined" 
                onClick={exportToCSV}
                disabled={loading}
                startIcon={<i className="fa-solid fa-file-csv"></i>}
                sx={{
                  borderColor: 'var(--color-accent2)',
                  color: 'var(--color-accent2)',
                  '&:hover': {
                    backgroundColor: 'rgba(240, 160, 40, 0.05)',
                    borderColor: 'var(--color-accent2)'
                  },
                  '&.Mui-disabled': {
                    borderColor: 'var(--text-color2)',
                    color: 'var(--text-color2)'
                  }
                }}
              >
                CSV
              </Button>
              <Button 
                variant="outlined" 
                onClick={exportToPDF}
                disabled={loading}
                startIcon={<i className="fa-solid fa-file-pdf"></i>}
                sx={{
                  borderColor: 'var(--color-accent1)',
                  color: 'var(--color-accent1)',
                  '&:hover': {
                    backgroundColor: 'rgba(230, 78, 54, 0.05)',
                    borderColor: 'var(--color-accent1)'
                  },
                  '&.Mui-disabled': {
                    borderColor: 'var(--text-color2)',
                    color: 'var(--text-color2)'
                  }
                }}
              >
                PDF
              </Button>
            </Box>
          )}
        </Box>
      </Paper>
      
      {/* Modal de Detalhes do Tema */}
      <Dialog
        open={openDetailsModal}
        onClose={handleCloseDetails}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          style: {
            backgroundColor: 'var(--box-color)',
            color: 'var(--text-color)',
            borderRadius: '12px'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid var(--color-border)',
          padding: '16px 24px',
          color: 'var(--title-color)'
        }}>
          <span>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <i className="fa-solid fa-chart-line" style={{ color: 'var(--color-primary)' }}></i>
              Detalhes do Tema: <strong>{selectedTopic?.name}</strong>
            </Box>
            <Typography variant="subtitle2" sx={{ color: 'var(--text-color2)', mt: 0.5 }}>
              Período: {formatDateBR(startDate, 'dd/MM/yyyy')} a {formatDateBR(endDate, 'dd/MM/yyyy')}
            </Typography>
          </span>
          <IconButton
            aria-label="Fechar"
            onClick={handleCloseDetails}
            sx={{ color: 'var(--text-color)' }}
          >
            <i className="fa-solid fa-times"></i>
          </IconButton>
        </DialogTitle>
        
        <DialogContent dividers sx={{ 
          backgroundColor: 'var(--box-color4)',
          padding: 0
        }}>
          {loadingDetails ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
              <CircularProgress size={40} sx={{ color: 'var(--color-primary)' }} />
            </Box>
          ) : topicDetails.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'var(--color-thead)' }}>
                    <TableCell sx={{ fontWeight: 600, color: 'var(--text-th)' }}>Data</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'var(--text-th)' }}>Hora</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'var(--text-th)' }}>Requisitante</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'var(--text-th)' }}>Analista</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'var(--text-th)' }}>Descrição</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topicDetails.map((item) => (
                    <TableRow key={item.id} sx={{ 
                      '&:nth-of-type(odd)': { backgroundColor: 'var(--color-trodd)' },
                      '&:nth-of-type(even)': { backgroundColor: 'var(--color-treven)' },
                      '&:hover': { backgroundColor: 'var(--box-color2)' }
                    }}>
                      <TableCell sx={{ color: 'var(--text-color)' }}>{item.formattedDate}</TableCell>
                      <TableCell sx={{ color: 'var(--text-color)' }}>{item.formattedTime}</TableCell>
                      <TableCell sx={{ color: 'var(--title-color)', fontWeight: 500 }}>{item.requester_name}</TableCell>
                      <TableCell sx={{ color: 'var(--text-color)' }}>{item.analyst_name}</TableCell>
                      <TableCell 
                        sx={{ 
                          color: 'var(--text-color)',
                          maxWidth: 300,
                          whiteSpace: 'normal',
                          wordBreak: 'break-word'
                        }}
                      >
                        {item.description || "Sem descrição"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '40px 20px',
              gap: 2
            }}>
              <i className="fa-solid fa-search" style={{ fontSize: '32px', color: 'var(--color-accent2)' }}></i>
              <Typography sx={{ color: 'var(--text-color2)' }}>
                Nenhum detalhe encontrado para este tema no período selecionado.
              </Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)' }}>
          <Button 
            onClick={handleCloseDetails} 
            variant="outlined"
            startIcon={<i className="fa-solid fa-times"></i>}
            sx={{
              borderColor: 'var(--text-color2)',
              color: 'var(--text-color2)',
              '&:hover': {
                backgroundColor: 'rgba(93, 93, 93, 0.1)',
                borderColor: 'var(--text-color)'
              }
            }}
          >
            Fechar
          </Button>
          
          {topicDetails.length > 0 && (
            <Button 
              variant="contained"
              startIcon={<i className="fa-solid fa-file-excel"></i>}
              onClick={() => {
                const worksheet = XLSX.utils.json_to_sheet(
                  topicDetails.map(item => ({
                    Data: item.formattedDate,
                    Hora: item.formattedTime,
                    Tema: selectedTopic?.name,
                    Requisitante: item.requester_name,
                    Analista: item.analyst_name,
                    Descrição: item.description || 'Sem descrição'
                  }))
                );
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Detalhes");
                XLSX.writeFile(workbook, `detalhes-${selectedTopic?.name.replace(/\s+/g, '-').toLowerCase()}.xlsx`);
              }}
              sx={{
                backgroundColor: 'var(--color-accent3)',
                '&:hover': {
                  backgroundColor: 'var(--color-accent3-hover)'
                }
              }}
            >
              Exportar Detalhes
            </Button>
          )}
        </DialogActions>
      </Dialog>
      
      {/* Diálogo para seleção de período personalizado */}
      <Dialog 
        open={openDateDialog} 
        onClose={handleCloseDateDialog}
        PaperProps={{
          style: {
            backgroundColor: 'var(--box-color)',
            color: 'var(--text-color)',
            borderRadius: '12px'
          }
        }}
      >
        <DialogTitle sx={{ color: 'var(--title-color)' }}>Selecione o período</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Data Inicial"
                  value={startDate}
                  onChange={(newValue) => setStartDate(startOfDayBR(newValue))}
                  slotProps={{ 
                    textField: { 
                      fullWidth: true,
                      sx: {
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'var(--modals-inputs)',
                          color: 'var(--text-color)'
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'var(--color-border)'
                        },
                        '& .MuiInputLabel-root': {
                          color: 'var(--text-color)'
                        }
                      } 
                    } 
                  }}
                  maxDate={new Date()}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Data Final"
                  value={endDate}
                  onChange={(newValue) => setEndDate(endOfDayBR(newValue))}
                  slotProps={{ 
                    textField: { 
                      fullWidth: true,
                      sx: {
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'var(--modals-inputs)',
                          color: 'var(--text-color)'
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'var(--color-border)'
                        },
                        '& .MuiInputLabel-root': {
                          color: 'var(--text-color)'
                        }
                      } 
                    } 
                  }}
                  maxDate={new Date()}
                />
              </Grid>
            </Grid>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions sx={{ padding: '0 24px 20px 24px' }}>
          <Button 
            onClick={handleCloseDateDialog}
            sx={{ 
              color: 'var(--text-color)',
              '&:hover': {
                backgroundColor: 'rgba(93, 93, 93, 0.1)'
              }
            }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmDateRange} 
            variant="contained"
            sx={{
              backgroundColor: 'var(--color-primary)',
              '&:hover': {
                backgroundColor: 'var(--color-primary-hover)'
              }
            }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Análise do Gemini */}
      <Dialog
        open={openGeminiModal}
        onClose={() => setOpenGeminiModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          style: {
            backgroundColor: 'var(--box-color)',
            color: 'var(--text-color)',
            borderRadius: '12px'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid var(--color-border)',
          padding: '16px 24px',
          color: 'var(--title-color)'
        }}>
          <span>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <i className="fa-solid fa-robot" style={{ color: 'var(--color-primary)' }}></i>
              Análise com IA Gemini
            </Box>
            <Typography variant="subtitle2" sx={{ color: 'var(--text-color2)', mt: 0.5 }}>
              Período: {formatDateBR(startDate, 'dd/MM/yyyy')} a {formatDateBR(endDate, 'dd/MM/yyyy')}
            </Typography>
          </span>
          <IconButton
            aria-label="Fechar"
            onClick={() => setOpenGeminiModal(false)}
            sx={{ color: 'var(--text-color)' }}
          >
            <i className="fa-solid fa-times"></i>
          </IconButton>
        </DialogTitle>
        
        <DialogContent dividers sx={{ 
          backgroundColor: 'var(--box-color4)',
          padding: '20px 24px',
          maxHeight: '80vh',
          overflow: 'hidden'
        }}>
          {loadingGemini ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <CircularProgress 
                  size={40} 
                  sx={{ color: 'var(--color-primary)' }}
                  variant={stagedAnalysis.stage === 'collecting' ? 'determinate' : 'indeterminate'}
                  value={stagedAnalysis.progress}
                />
                <Typography sx={{ color: 'var(--text-color2)', textAlign: 'center', fontWeight: 500 }}>
                  {stagedAnalysis.stage === 'collecting' ? 'Coletando dados...' :
                   stagedAnalysis.stage === 'analyzing' ? 'Analisando com IA...' :
                   'Gerando análise com IA...'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--text-color2)', opacity: 0.7, textAlign: 'center' }}>
                  {stagedAnalysis.message || 'Processando dados...'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--text-color2)', opacity: 0.5, textAlign: 'center', fontSize: '0.75rem' }}>
                  {stagedAnalysis.includeDetails ? 
                    'Análise detalhada com registros de ajuda - pode levar até 45 segundos' :
                    'Análise otimizada - pode levar até 45 segundos'
                  }
                </Typography>
                {stagedAnalysis.stage === 'collecting' && stagedAnalysis.progress > 0 && (
                  <Typography variant="caption" sx={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                    {stagedAnalysis.progress}% concluído
                  </Typography>
                )}
              </Box>
            </Box>
          ) : geminiAnalysis ? (
            <Box sx={{ 
              backgroundColor: 'var(--bg-color)',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid var(--color-border)',
              maxHeight: '70vh',
              overflow: 'auto',
              '&::-webkit-scrollbar': {
                width: '8px'
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'var(--color-border)',
                borderRadius: '4px'
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'var(--color-primary)',
                borderRadius: '4px',
                '&:hover': {
                  backgroundColor: 'var(--color-primary-hover)'
                }
              }
            }}>
              <div 
                style={{ 
                  color: 'var(--text-color)',
                  lineHeight: 1.8,
                  fontSize: '0.95rem',
                  fontFamily: 'inherit',
                  paddingBottom: '20px'
                }}
                dangerouslySetInnerHTML={{
                  __html: formatAnalysisText(geminiAnalysis)
                }}
              />
            </Box>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '40px 20px',
              gap: 2
            }}>
              <i className="fa-solid fa-robot" style={{ fontSize: '32px', color: 'var(--color-primary)' }}></i>
              <Typography sx={{ color: 'var(--text-color2)', textAlign: 'center' }}>
                Clique em "Gerar Análise" para obter insights inteligentes sobre os dados.
              </Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)' }}>
          <Button 
            onClick={() => setOpenGeminiModal(false)} 
            variant="outlined"
            startIcon={<i className="fa-solid fa-times"></i>}
            sx={{
              borderColor: 'var(--text-color2)',
              color: 'var(--text-color2)',
              '&:hover': {
                backgroundColor: 'rgba(93, 93, 93, 0.1)',
                borderColor: 'var(--text-color)'
              }
            }}
          >
            Fechar
          </Button>
          

        </DialogActions>
      </Dialog>

      {/* Chat com Gemini */}
      {showChat && (
        <GeminiChat
          topics={topics}
          period={period}
          startDate={formatDateBR(startDate, 'dd/MM/yyyy')}
          endDate={formatDateBR(endDate, 'dd/MM/yyyy')}
          onClose={() => setShowChat(false)}
        />
      )}
    </Box>
  );
} 