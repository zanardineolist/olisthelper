import React, { useState, useEffect, useMemo } from 'react';
import styles from '../styles/Ocorrencias.module.css';
import { 
  TextField, 
  Button, 
  Dialog,
  DialogContent, 
  DialogActions, 
  Snackbar, 
  Alert,
  IconButton,
  FormControlLabel,
  Checkbox,
  Typography,
  Chip,
  Container,
  FormGroup,
  Box,
  CircularProgress,
  Tooltip,
  Badge,
  Collapse,
  Paper
} from '@mui/material';

// Importando o React Select
import Select from 'react-select';

import { 
  Search as SearchIcon, 
  Close as CloseIcon, 
  FilterList as FilterListIcon, 
  ContentCopy as ContentCopyIcon, 
  Info as InfoIcon, 
  Description as DescriptionIcon, 
  FilterAlt as FilterAltIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  BugReport as BugReportIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import axios from 'axios';
import { toast } from 'react-hot-toast';

// Função para formatar data do formato brasileiro para DD/MM/AA HH:MM
const formatBrazilianDate = (dateString) => {
  if (!dateString || dateString.trim() === '') return '';
  
  try {
    // Mapeamento de meses em português para números
    const monthMap = {
      'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04',
      'mai': '05', 'jun': '06', 'jul': '07', 'ago': '08',
      'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
    };
    
    // Regex melhorado para capturar diferentes formatos
    // Formato: "24 de jul., 2025 21h39min57s" ou "1° de jan., 2025 10h15min30s"
    const regex = /(\d{1,2})[°]?\s+de\s+(\w{3})\.?,?\s+(\d{4})\s+(\d{1,2})h(\d{1,2})min(\d{1,2})?s?/i;
    const match = dateString.match(regex);
    
    if (!match) {
      return dateString;
    }
    
    const [, day, monthStr, year, hour, minute] = match;
    
    // Converter mês para número
    const month = monthMap[monthStr.toLowerCase()];
    if (!month) {
      return dateString;
    }
    
    // Formatar componentes
    const formattedDay = day.padStart(2, '0');
    const formattedMonth = month;
    const formattedYear = year.slice(-2); // Pegar últimos 2 dígitos do ano
    const formattedHour = hour.padStart(2, '0');
    const formattedMinute = minute.padStart(2, '0');
    
    return `${formattedDay}/${formattedMonth}/${formattedYear} ${formattedHour}:${formattedMinute}`;
  } catch (error) {
    console.warn('Erro ao formatar data:', dateString, error);
    return dateString; // Retorna original em caso de erro
  }
};

// Função para converter data brasileira para Date object para comparação
const parseDataBrasileira = (dateString) => {
  if (!dateString || dateString.trim() === '') return null;
  
  try {
    const monthMap = {
      'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3,
      'mai': 4, 'jun': 5, 'jul': 6, 'ago': 7,
      'set': 8, 'out': 9, 'nov': 10, 'dez': 11
    };
    
    const regex = /(\d{1,2})[°]?\s+de\s+(\w{3})\.?,?\s+(\d{4})\s+(\d{1,2})h(\d{1,2})min(\d{1,2})?s?/i;
    const match = dateString.match(regex);
    
    if (!match) return null;
    
    const [, day, monthStr, year, hour, minute] = match;
    const month = monthMap[monthStr.toLowerCase()];
    
    if (month === undefined) return null;
    
    return new Date(parseInt(year), month, parseInt(day), parseInt(hour), parseInt(minute));
  } catch (error) {
    return null;
  }
};

export default function Ocorrencias({ user }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [marcadorFilter, setMarcadorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');
  const [filtrosAtivos, setFiltrosAtivos] = useState(0);
  const [marcadores, setMarcadores] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);

  // Verificar número de filtros ativos
  useEffect(() => {
    let count = 0;
    
    if (marcadorFilter) count++;
    if (statusFilter) count++;
    if (searchQuery) count++;
    if (dateFromFilter) count++;
    if (dateToFilter) count++;
    
    setFiltrosAtivos(count);
  }, [marcadorFilter, statusFilter, searchQuery, dateFromFilter, dateToFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/ocorrencias');
      
      if (response.data && response.data.dados) {
        const ocorrencias = response.data.dados;
        setData(ocorrencias);
        
        // Extrair opções únicas para filtros
        extrairOpcoesDeFiltros(ocorrencias);
        
        // Aplicar filtros iniciais
        applyFilters(ocorrencias, '', '', '', '', '');
      } else {
        console.error('Erro ao buscar dados: formato inesperado');
        toast.error('Erro ao carregar os dados');
        setData([]);
        setFilteredData([]);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar os dados');
      setData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const extrairOpcoesDeFiltros = (items) => {
    if (!items || items.length === 0) return;

    // Extrair marcadores únicos (dividindo por espaço, quebra de linha, etc.)
    const uniqueMarcadores = [...new Set(
      items.flatMap(item => {
        if (!item.Marcadores || item.Marcadores.trim() === '') return [];
        // Dividir por espaço, quebra de linha, vírgula ou ponto e vírgula
        return item.Marcadores
          .split(/[\s\n,;]+/)
          .map(m => m.trim())
          .filter(m => m !== '');
      })
    )].sort();

    // Extrair status únicos
    const uniqueStatus = [...new Set(items.map(item => item.Status))]
      .filter(status => status && status.trim() !== '')
      .sort();

    setMarcadores(uniqueMarcadores);
    setStatusOptions(uniqueStatus);
  };

  const applyFilters = (allData, marcadorValue, statusValue, searchValue, dateFrom, dateTo) => {
    if (!allData || allData.length === 0) return;

    let filteredItems = [...allData];

    // Filtrar por Marcador (verificando se o marcador está contido na string)
    if (marcadorValue) {
      filteredItems = filteredItems.filter(item => {
        if (!item.Marcadores) return false;
        // Dividir marcadores e verificar se algum corresponde ao filtro
        const itemMarcadores = item.Marcadores
          .split(/[\s\n,;]+/)
          .map(m => m.trim())
          .filter(m => m !== '');
        return itemMarcadores.includes(marcadorValue);
      });
    }
    
    // Filtrar por Status
    if (statusValue) {
      filteredItems = filteredItems.filter(item => item.Status === statusValue);
    }
    
    // Filtrar por texto de busca
    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
      filteredItems = filteredItems.filter(item => {
        return (
          (item.Problema && item.Problema.toLowerCase().includes(searchLower)) ||
          (item.Resumo && item.Resumo.toLowerCase().includes(searchLower)) ||
          (item.Motivo && item.Motivo.toLowerCase().includes(searchLower)) ||
          (item.Modulo && item.Modulo.toLowerCase().includes(searchLower))
        );
      });
    }

    // Filtrar por período
    if (dateFrom || dateTo) {
      filteredItems = filteredItems.filter(item => {
        const itemDate = parseDataBrasileira(item.DataHora);
        if (!itemDate) return true; // Se não conseguir fazer parse, mantém o item
        
        let isInRange = true;
        
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          isInRange = isInRange && itemDate >= fromDate;
        }
        
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          isInRange = isInRange && itemDate <= toDate;
        }
        
        return isInRange;
      });
    }
    
    setFilteredData(filteredItems);
  };

  useEffect(() => {
    if (data && data.length > 0) {
      applyFilters(data, marcadorFilter, statusFilter, searchQuery, dateFromFilter, dateToFilter);
    }
  }, [data]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setSearchActive(true);
      applyFilters(data, marcadorFilter, statusFilter, searchQuery, dateFromFilter, dateToFilter);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Quando o campo de busca for limpo, resetar a busca automaticamente
    if (!value.trim()) {
      setSearchActive(false);
      applyFilters(data, marcadorFilter, statusFilter, '', dateFromFilter, dateToFilter);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchActive(false);
    applyFilters(data, marcadorFilter, statusFilter, '', dateFromFilter, dateToFilter);
  };

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopySuccess('Informação copiada para a área de transferência!');
        setSnackbarOpen(true);
      },
      (err) => {
        console.error('Não foi possível copiar: ', err);
        setCopySuccess('Falha ao copiar texto!');
        setSnackbarOpen(true);
      }
    );
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const resetFilters = () => {
    setMarcadorFilter('');
    setStatusFilter('');
    setSearchQuery('');
    setDateFromFilter('');
    setDateToFilter('');
    setSearchActive(false);
    applyFilters(data, '', '', '', '', '');
  };

  const handleOpenModal = (item) => {
    setModalData(item);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setModalData(null);
  };

  const handleMarcadorChange = (selectedOption) => {
    const valor = selectedOption ? selectedOption.value : '';
    setMarcadorFilter(valor);
    applyFilters(data, valor, statusFilter, searchQuery, dateFromFilter, dateToFilter);
  };

  const handleStatusChange = (selectedOption) => {
    const valor = selectedOption ? selectedOption.value : '';
    setStatusFilter(valor);
    applyFilters(data, marcadorFilter, valor, searchQuery, dateFromFilter, dateToFilter);
  };

  const handleDateFromChange = (event) => {
    const valor = event.target.value;
    setDateFromFilter(valor);
    applyFilters(data, marcadorFilter, statusFilter, searchQuery, valor, dateToFilter);
  };

  const handleDateToChange = (event) => {
    const valor = event.target.value;
    setDateToFilter(valor);
    applyFilters(data, marcadorFilter, statusFilter, searchQuery, dateFromFilter, valor);
  };

  // Função para gerar cor baseada no status - Padrão globals.css
  const getColorForStatus = (status) => {
    if (!status) return { 
      main: 'var(--neutral-color)', 
      bg: 'var(--neutral-bg)', 
      border: 'var(--neutral-color)'
    };
    
    switch (status.toLowerCase()) {
      case 'corrigido':
        return { 
          main: 'var(--excellent-color)', 
          bg: 'var(--excellent-bg)', 
          border: 'var(--excellent-color)'
        };
      case 'novo':
        return { 
          main: 'var(--warning-color)', 
          bg: 'var(--warning-bg)', 
          border: 'var(--warning-color)'
        };
      default:
        return { 
          main: 'var(--primary-color)', 
          bg: 'var(--primary-bg)', 
          border: 'var(--primary-color)'
        };
    }
  };

  // Função para gerar cor baseada em hash da string (para marcadores) - Padrão globals.css
  const getColorForMarcador = (marcador) => {
    if (!marcador) return { 
      main: 'var(--neutral-color)', 
      bg: 'var(--neutral-bg)', 
      border: 'var(--neutral-color)'
    };
    
    // Hash simples
    let hash = 0;
    for (let i = 0; i < marcador.length; i++) {
      hash = marcador.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Lista de cores usando variáveis do globals.css
    const colors = [
      { main: 'var(--primary-color)', bg: 'var(--primary-bg)', border: 'var(--primary-color)' },
      { main: 'var(--poor-color)', bg: 'var(--poor-bg)', border: 'var(--poor-color)' },
      { main: 'var(--excellent-color)', bg: 'var(--excellent-bg)', border: 'var(--excellent-color)' },
      { main: 'var(--good-color)', bg: 'var(--good-bg)', border: 'var(--good-color)' },
      { main: 'var(--warning-color)', bg: 'var(--warning-bg)', border: 'var(--warning-color)' },
      { main: 'var(--neutral-color)', bg: 'var(--neutral-bg)', border: 'var(--neutral-color)' },
      { main: 'var(--first-color)', bg: 'var(--first-bg)', border: 'var(--first-color)' },
      { main: 'var(--second-color)', bg: 'var(--second-bg)', border: 'var(--second-color)' },
      { main: 'var(--third-color)', bg: 'var(--third-bg)', border: 'var(--third-color)' }
    ];
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Função para renderizar múltiplos marcadores
  const renderMarcadores = (marcadoresString) => {
    if (!marcadoresString || marcadoresString.trim() === '') return null;
    
    const marcadoresList = marcadoresString
      .split(/[\s\n,;]+/)
      .map(m => m.trim())
      .filter(m => m !== '');
    
    return marcadoresList.map((marcador, index) => {
      const marcadorColor = getColorForMarcador(marcador);
      return (
        <Chip 
          key={index}
          label={marcador} 
          variant="outlined" 
          className={styles.marcadorChip}
          size="small"
          style={{
            color: marcadorColor.main,
            borderColor: marcadorColor.border,
            backgroundColor: marcadorColor.bg,
            margin: '2px'
          }}
        />
      );
    });
  };

  // Configuração do tema do React Select
  const selectTheme = theme => ({
    ...theme,
    colors: {
      ...theme.colors,
      primary: 'var(--color-primary)',
      primary25: 'rgba(10, 78, 228, 0.08)',
      primary50: 'rgba(10, 78, 228, 0.16)',
      neutral0: 'var(--background-color)',
      neutral10: 'var(--color-border)',
      neutral20: 'var(--color-border)',
      neutral30: 'var(--color-border)',
      neutral80: 'var(--title-color)',
    },
  });

  // Configuração de estilos customizados
  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: 'var(--background-color)',
      borderColor: state.isFocused ? 'var(--color-primary)' : 'var(--color-border)',
      borderRadius: '8px',
      minHeight: '40px',
      height: '40px',
      boxShadow: state.isFocused ? '0 0 0 1px var(--color-primary)' : 'none',
      '&:hover': {
        borderColor: 'var(--color-primary)',
      },
    }),
    valueContainer: (provided) => ({
      ...provided,
      padding: '0 8px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
    }),
    input: (provided) => ({
      ...provided,
      margin: '0px',
      color: 'var(--title-color)'
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    indicatorsContainer: (provided) => ({
      ...provided,
      height: '40px',
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      padding: '0 8px',
      color: 'var(--title-color)',
    }),
    clearIndicator: (provided) => ({
      ...provided,
      padding: '0 8px',
      color: 'var(--title-color)',
    }),
    option: (provided, state) => ({
      ...provided,
      color: 'var(--title-color)',
      backgroundColor: state.isSelected 
        ? 'rgba(10, 78, 228, 0.08)' 
        : state.isFocused 
          ? 'var(--box-color2)' 
          : 'var(--background-color)',
      padding: '8px 16px',
      fontSize: '0.9rem',
      cursor: 'pointer',
      '&:active': {
        backgroundColor: 'rgba(10, 78, 228, 0.16)',
      }
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: 'var(--background-color)',
      border: '1px solid var(--color-border)',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: 9999,
    }),
    menuList: (provided) => ({
      ...provided,
      padding: '8px 0',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: 'var(--text-color)',
      opacity: 0.7,
      fontSize: '0.9rem',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: 'var(--title-color)',
      fontSize: '0.9rem',
    }),
  };

  const renderFiltros = () => {
    // Preparar opções para o React Select
    const marcadorOptions = marcadores.length > 0
      ? [{ label: "Todos", value: "" }, ...marcadores.map(marcador => ({ label: marcador, value: marcador }))]
      : [{ label: "Todos", value: "" }];
    
    const statusSelectOptions = statusOptions.length > 0
      ? [{ label: "Todos", value: "" }, ...statusOptions.map(status => ({ label: status, value: status }))]
      : [{ label: "Todos", value: "" }];
    
    // Valores selecionados atuais
    const selectedMarcador = marcadorOptions.find(option => option.value === marcadorFilter) || null;
    const selectedStatus = statusSelectOptions.find(option => option.value === statusFilter) || null;
    
    return (
      <div className={styles.filterControls}>
        <div className={styles.formControl}>
          <span className={styles.inputLabel}>Marcadores</span>
          <Select
            value={selectedMarcador}
            options={marcadorOptions}
            onChange={handleMarcadorChange}
            placeholder="Selecione Marcador"
            isClearable
            className={styles.reactSelect}
            theme={selectTheme}
            styles={customSelectStyles}
            aria-label="Marcadores"
          />
        </div>
        
        <div className={styles.formControl}>
          <span className={styles.inputLabel}>Status</span>
          <Select
            value={selectedStatus}
            options={statusSelectOptions}
            onChange={handleStatusChange}
            placeholder="Selecione Status"
            isClearable
            className={styles.reactSelect}
            theme={selectTheme}
            styles={customSelectStyles}
            aria-label="Status"
          />
        </div>
        
        <div className={styles.formControl}>
          <span className={styles.inputLabel}>Data Inicial</span>
          <TextField
            type="date"
            value={dateFromFilter}
            onChange={handleDateFromChange}
            size="small"
            InputLabelProps={{
              shrink: true,
            }}
            className={styles.inputRoot}
          />
        </div>
        
        <div className={styles.formControl}>
          <span className={styles.inputLabel}>Data Final</span>
          <TextField
            type="date"
            value={dateToFilter}
            onChange={handleDateToChange}
            size="small"
            InputLabelProps={{
              shrink: true,
            }}
            className={styles.inputRoot}
          />
        </div>
        
        <div className={styles.formControl}>
          <span className={styles.inputLabel}>&nbsp;</span>
          <Button
            variant="outlined"
            color="secondary"
            onClick={resetFilters}
            className={styles.resetButton}
            sx={{ 
              color: 'var(--color-accent1)', 
              borderColor: 'var(--color-accent1)',
              '&:hover': {
                backgroundColor: 'rgba(230, 78, 54, 0.08)',
                borderColor: 'var(--color-accent1)'
              }
            }}
            disabled={!marcadorFilter && !statusFilter && !searchQuery && !dateFromFilter && !dateToFilter}
            size="small"
          >
            LIMPAR FILTROS
          </Button>
        </div>
      </div>
    );
  };

  const renderFiltersSection = () => {
    return (
      <div className={styles.filtersContainer}>
        {renderFiltros()}
      </div>
    );
  };
  
  const renderFiltersBlock = () => {
    return (
      <div className={styles.searchContainer}>
        <div className={styles.searchInputWrapper}>
          <TextField
            fullWidth
            label="Buscar"
            variant="outlined"
            value={searchQuery}
            onChange={handleSearchInputChange}
            onKeyPress={handleKeyPress}
            size="small"
            InputProps={{
              className: styles.inputRoot,
              endAdornment: searchQuery ? (
                <IconButton size="small" onClick={handleClearSearch} className={styles.iconButton}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              ) : null,
              classes: { 
                notchedOutline: styles.inputOutline 
              }
            }}
            InputLabelProps={{
              className: styles.inputLabel
            }}
          />
          <div className={styles.searchButtonsContainer}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSearch}
              startIcon={<SearchIcon />}
              className={`${styles.searchButton} ${styles.btnContained}`}
              disabled={!searchQuery.trim()}
              size="medium"
            >
              BUSCAR
            </Button>
            <Badge badgeContent={filtrosAtivos} color="primary" invisible={filtrosAtivos === 0}>
              <Button
                variant="outlined"
                onClick={() => setShowFilters(!showFilters)}
                startIcon={<FilterListIcon />}
                className={`${styles.filterButton} ${styles.btnOutlined}`}
                size="medium"
              >
                FILTROS
              </Button>
            </Badge>
          </div>
        </div>
        
        <Collapse in={showFilters} timeout={300}>
          {renderFiltersSection()}
        </Collapse>
      </div>
    );
  };

  const renderResultsInfo = () => {
    return (
      <div className={styles.resultsInfo}>
        <Typography variant="body2">
          {filteredData.length === 0 
            ? "Nenhuma ocorrência encontrada" 
            : `${filteredData.length} ${filteredData.length === 1 ? 'ocorrência encontrada' : 'ocorrências encontradas'}`}
        </Typography>
      </div>
    );
  };

  const renderTable = () => {
    return (
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead className={styles.tableHead}>
            <tr>
              <th className={styles.tableHeader}>Data/Hora</th>
              <th className={styles.tableHeader}>Status</th>
              <th className={styles.tableHeader}>Problema</th>
              <th className={styles.tableHeader}>Marcadores</th>
              <th className={styles.tableHeader}>Resumo</th>
              <th className={styles.tableHeader}>Data Correção</th>
              <th className={styles.tableHeader}>Ações</th>
            </tr>
          </thead>
          <tbody className={styles.tableBody}>
            {filteredData.map((item, index) => {
              const statusColor = getColorForStatus(item.Status);
              const marcadorColor = getColorForMarcador(item.Marcadores);
              
              return (
                <tr key={index} className={styles.tableRow}>
                  <td className={styles.tableCell}>
                    <Typography variant="body2" className={styles.dateTime}>
                      {formatBrazilianDate(item.DataHora)}
                    </Typography>
                  </td>
                  <td className={styles.tableCell}>
                    <Chip 
                      label={item.Status || 'Novo'} 
                      variant="outlined" 
                      size="small"
                      className={styles.statusChip}
                      style={{
                        color: statusColor.main,
                        borderColor: statusColor.border,
                        backgroundColor: statusColor.bg
                      }}
                    />
                  </td>
                  <td className={styles.tableCell}>
                    <Typography variant="body2" className={styles.problemText}>
                      {item.Problema}
                    </Typography>
                  </td>
                  <td className={styles.tableCell}>
                    <div className={styles.marcadoresContainer}>
                      {renderMarcadores(item.Marcadores)}
                    </div>
                  </td>
                  <td className={styles.tableCell}>
                    <Typography variant="body2" className={styles.resumoText}>
                      {item.Resumo && item.Resumo.length > 80 
                        ? `${item.Resumo.substring(0, 80)}...` 
                        : item.Resumo}
                    </Typography>
                  </td>
                  <td className={styles.tableCell}>
                    {item.Status === 'Corrigido' && item.DataCorrecao && (
                      <Typography variant="body2" className={styles.dateTime}>
                        {formatBrazilianDate(item.DataCorrecao)}
                      </Typography>
                    )}
                  </td>
                  <td className={styles.tableCell}>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      onClick={() => handleOpenModal(item)}
                      startIcon={<VisibilityIcon />}
                      className={styles.viewButton}
                    >
                      Ver
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderModalContent = () => {
    const statusColor = getColorForStatus(modalData.Status);
    
    return (
      <>
        <div className={styles.modalHeader}>
          <Typography variant="h6" component="h2" className={styles.modalTitle}>
            {modalData.Problema}
          </Typography>
          
          <div className={styles.modalChips}>
            <Chip 
              icon={<ScheduleIcon fontSize="small" />}
              label={formatBrazilianDate(modalData.DataHora)} 
              color="default" 
              size="small"
              className={styles.modalChip}
            />
            <div className={styles.marcadoresContainer}>
              {renderMarcadores(modalData.Marcadores)}
            </div>
            {modalData.Modulo && (
              <Chip 
                label={modalData.Modulo} 
                color="primary" 
                size="small"
                className={styles.modalChip}
              />
            )}
            <Chip 
              label={modalData.Status || 'Novo'} 
              variant="outlined" 
              size="small"
              style={{
                color: statusColor.main,
                borderColor: statusColor.border,
                backgroundColor: statusColor.bg
              }}
            />
            {modalData.Status === 'Corrigido' && modalData.DataCorrecao && (
              <Chip 
                icon={<CheckCircleIcon fontSize="small" />}
                label={`Corrigido em: ${formatBrazilianDate(modalData.DataCorrecao)}`} 
                color="success"
                size="small"
                className={styles.modalChip}
                style={{
                  backgroundColor: 'var(--excellent-bg)',
                  color: 'var(--excellent-color)',
                  borderColor: 'var(--excellent-color)'
                }}
              />
            )}
          </div>
        </div>

        {modalData.Resumo && modalData.Resumo.trim() !== '' && (
          <div className={styles.resumoBox}>
            <div className={styles.solutionHeader}>
              <div className={styles.sectionTitleWrapper}>
                <DescriptionIcon className={styles.sectionIcon} />
                <Typography variant="subtitle1" component="h3" className={styles.sectionTitle}>
                  Resumo do Problema
                </Typography>
              </div>
              <Tooltip title="Copiar resumo">
                <IconButton 
                  onClick={() => handleCopyToClipboard(modalData.Resumo)}
                  size="small"
                  className={styles.copyButton}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </div>
            <Box className={styles.solutionScrollbox}>
              <Typography variant="body2" className={styles.solutionText}>
                {modalData.Resumo}
              </Typography>
            </Box>
          </div>
        )}

        {(modalData.Modulo && modalData.Modulo.trim() !== '') || (modalData.Motivo && modalData.Motivo.trim() !== '') ? (
          <Box className={styles.observationBox}>
            <div className={styles.sectionTitleWrapper}>
              <InfoIcon className={styles.sectionIcon} />
              <Typography variant="subtitle1" component="h3" className={styles.sectionTitle}>
                Classificação dos casos
              </Typography>
            </div>
            {modalData.Modulo && modalData.Modulo.trim() !== '' && (
              <Typography variant="body2" className={styles.observationText}>
                <strong>Módulo:</strong> {modalData.Modulo}
              </Typography>
            )}
            {modalData.Motivo && modalData.Motivo.trim() !== '' && (
              <Typography variant="body2" className={styles.observationText}>
                <strong>Motivo:</strong> {modalData.Motivo}
              </Typography>
            )}
          </Box>
        ) : null}
      </>
    );
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <CircularProgress />
        <p>Carregando ocorrências...</p>
      </div>
    );
  }

  return (
    <Container maxWidth="xl" className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Ocorrências</h1>
        <p className={styles.pageDescription}>
          Mantenha-se atualizado sobre as ocorrências existentes no suporte e seus status de correção.
        </p>
      </div>

      {renderFiltersBlock()}

      {filteredData.length > 0 && renderResultsInfo()}

      <div className={styles.tableWrapper}>
        {filteredData.length > 0 ? (
          renderTable()
        ) : (
          <div className={styles.noResults}>
            <Typography variant="body1">
              Nenhuma ocorrência encontrada para os filtros selecionados.
            </Typography>
            {filtrosAtivos > 0 && (
              <Button 
                variant="outlined" 
                color="primary"
                onClick={resetFilters}
                startIcon={<FilterAltIcon />}
                style={{ marginTop: '10px' }}
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        )}
      </div>

      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        className={styles.dialog}
        PaperProps={{ className: styles.dialogPaper }}
      >
        {modalData && (
          <>
            <DialogContent className={styles.dialogContent}>
              {renderModalContent()}
            </DialogContent>
            <DialogActions className={styles.dialogActions}>
              <Button 
                onClick={handleCloseModal} 
                className={styles.dialogButton}
                variant="outlined"
              >
                Fechar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success">
          {copySuccess}
        </Alert>
      </Snackbar>
    </Container>
  );
} 