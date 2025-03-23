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
  CircularProgress
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

const TIMEZONE = 'America/Sao_Paulo';

// Funções auxiliares para trabalhar com o fuso horário brasileiro
const toBRTimezone = (date) => utcToZonedTime(date, TIMEZONE);
const fromBRTimezone = (date) => zonedTimeToUtc(date, TIMEZONE);

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

  return (
    <Box sx={{ p: 2 }}>
      {/* Seção do filtro de período */}
      <Paper 
        sx={{ 
          p: 3, 
          mb: 3, 
          backgroundColor: 'var(--box-color)',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)'
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
              m: 0
            }}
          >
            Temas de Dúvidas
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

        {period === 'custom' && (
          <Box 
            sx={{ 
              display: 'flex', 
              gap: 2, 
              mb: 3, 
              alignItems: 'center',
              padding: '10px 15px',
              backgroundColor: 'var(--box-color2)',
              borderRadius: '8px'
            }}
          >
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: '0.9rem',
                color: 'var(--text-color)'
              }}
            >
              <span style={{ color: 'var(--text-color2)', fontWeight: 500, marginRight: '5px' }}>Período:</span>
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
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            >
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'var(--color-thead)' }}>
                    <TableCell 
                      sx={{ 
                        fontWeight: 600, 
                        color: 'var(--text-th)', 
                        borderBottom: '1px solid var(--color-border)' 
                      }}
                    >
                      Ranking
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontWeight: 600, 
                        color: 'var(--text-th)', 
                        borderBottom: '1px solid var(--color-border)' 
                      }}
                    >
                      Tema
                    </TableCell>
                    <TableCell 
                      align="right" 
                      sx={{ 
                        fontWeight: 600, 
                        color: 'var(--text-th)', 
                        borderBottom: '1px solid var(--color-border)' 
                      }}
                    >
                      Quantidade
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{ 
                        fontWeight: 600, 
                        color: 'var(--text-th)', 
                        borderBottom: '1px solid var(--color-border)' 
                      }}
                    >
                      Porcentagem
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topics.length > 0 ? (
                    topics.map((topic, index) => (
                      <TableRow 
                        key={topic.id || index}
                        onClick={() => handleOpenDetails(topic)}
                        sx={{ 
                          backgroundColor: index % 2 === 0 ? 'var(--color-treven)' : 'var(--color-trodd)',
                          '&:hover': {
                            backgroundColor: 'var(--box-color2)',
                            cursor: 'pointer'
                          }
                        }}
                      >
                        <TableCell 
                          sx={{ 
                            color: 'var(--text-color)',
                            borderBottom: '1px solid var(--color-border)'
                          }}
                        >
                          {index + 1}
                        </TableCell>
                        <TableCell 
                          sx={{ 
                            color: 'var(--title-color)',
                            fontWeight: 500,
                            borderBottom: '1px solid var(--color-border)'
                          }}
                        >
                          <Tooltip title="Clique para ver detalhes" arrow>
                            <Box component="span" sx={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              '&:hover': {
                                textDecoration: 'underline'
                              }
                            }}>
                              {topic.name}
                              <i className="fa-solid fa-circle-info" style={{ 
                                marginLeft: '8px', 
                                fontSize: '14px',
                                color: 'var(--color-primary)'
                              }}></i>
                            </Box>
                          </Tooltip>
                        </TableCell>
                        <TableCell 
                          align="right"
                          sx={{ 
                            color: 'var(--color-primary)',
                            fontWeight: 600,
                            borderBottom: '1px solid var(--color-border)'
                          }}
                        >
                          {topic.count}
                        </TableCell>
                        <TableCell 
                          align="right"
                          sx={{ 
                            color: 'var(--text-color)',
                            borderBottom: '1px solid var(--color-border)'
                          }}
                        >
                          {topic.percentage}%
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell 
                        colSpan={4} 
                        align="center"
                        sx={{ 
                          padding: '30px 20px',
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
                          <i className="fa-solid fa-ban" style={{ fontSize: '24px', color: 'var(--color-accent1)' }}></i>
                          <Typography>Nenhum tema de dúvida encontrado no período selecionado.</Typography>
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
            justifyContent: 'flex-end', 
            gap: 2,
            borderTop: '1px solid var(--color-border)',
            paddingTop: 3,
            marginTop: 3
          }}
        >
          <Typography 
            variant="subtitle2" 
            sx={{ 
              mr: 2, 
              alignSelf: 'center',
              color: 'var(--text-color2)',
              fontSize: '0.9rem'
            }}
          >
            Exportar para:
          </Typography>
          <Button 
            variant="outlined" 
            onClick={exportToExcel}
            disabled={topics.length === 0 || loading}
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
            disabled={topics.length === 0 || loading}
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
            disabled={topics.length === 0 || loading}
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
            Detalhes do Tema: <strong>{selectedTopic?.name}</strong>
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
    </Box>
  );
} 