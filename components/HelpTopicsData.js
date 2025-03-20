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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Tooltip
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

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Temas de Dúvidas
          </Typography>
          
          <FormControl sx={{ minWidth: 200 }}>
            <Select
              value={period}
              onChange={handlePeriodChange}
              size="small"
              displayEmpty
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
          <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
            <Typography variant="body2">
              Período: {formatDateBR(startDate, 'dd/MM/yyyy')} a {formatDateBR(endDate, 'dd/MM/yyyy')}
            </Typography>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={() => setOpenDateDialog(true)}
            >
              Alterar período
            </Button>
          </Box>
        )}
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Ranking de Temas
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <div className="loader" style={{ scale: '0.5' }}></div>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Ranking</TableCell>
                    <TableCell>Tema</TableCell>
                    <TableCell align="right">Quantidade</TableCell>
                    <TableCell align="right">Porcentagem</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topics.length > 0 ? (
                    topics.map((topic, index) => (
                      <TableRow key={topic.id || index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{topic.name}</TableCell>
                        <TableCell align="right">{topic.count}</TableCell>
                        <TableCell align="right">{topic.percentage}%</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        Nenhum tema de dúvida encontrado no período selecionado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Typography variant="subtitle2" sx={{ mr: 2, alignSelf: 'center' }}>
            Exportar para:
          </Typography>
          <Button 
            variant="outlined" 
            onClick={exportToExcel}
            disabled={topics.length === 0 || loading}
            startIcon={<i className="fa-solid fa-file-excel"></i>}
          >
            Excel
          </Button>
          <Button 
            variant="outlined" 
            onClick={exportToCSV}
            disabled={topics.length === 0 || loading}
            startIcon={<i className="fa-solid fa-file-csv"></i>}
          >
            CSV
          </Button>
          <Button 
            variant="outlined" 
            onClick={exportToPDF}
            disabled={topics.length === 0 || loading}
            startIcon={<i className="fa-solid fa-file-pdf"></i>}
          >
            PDF
          </Button>
        </Box>
      </Paper>
      
      {/* Diálogo para seleção de período personalizado */}
      <Dialog open={openDateDialog} onClose={handleCloseDateDialog}>
        <DialogTitle>Selecione o período</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Data Inicial"
                  value={startDate}
                  onChange={(newValue) => setStartDate(startOfDayBR(newValue))}
                  slotProps={{ textField: { fullWidth: true } }}
                  maxDate={new Date()}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Data Final"
                  value={endDate}
                  onChange={(newValue) => setEndDate(endOfDayBR(newValue))}
                  slotProps={{ textField: { fullWidth: true } }}
                  maxDate={new Date()}
                />
              </Grid>
            </Grid>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDateDialog}>Cancelar</Button>
          <Button onClick={handleConfirmDateRange} variant="contained">Confirmar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 