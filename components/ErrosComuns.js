import React, { useState, useEffect, useRef, useMemo } from 'react';
import styles from '../styles/ErrosComuns.module.css';
import { 
  TextField, 
  Tab, 
  Tabs, 
  Button, 
  Dialog,
  DialogContent, 
  DialogActions, 
  Snackbar, 
  Alert,
  IconButton,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  Typography,
  Chip,
  Container,
  FormGroup,
  Box,
  CircularProgress,
  Tooltip,
  Badge,
  Collapse,
  Paper,
  Link
} from '@mui/material';

// Importando o React Select
import Select from 'react-select';

import { Search as SearchIcon, Close as CloseIcon, FilterList as FilterListIcon, ContentCopy as ContentCopyIcon, Info as InfoIcon, Description as DescriptionIcon, FilterAlt as FilterAltIcon, Announcement as AnnouncementIcon } from '@mui/icons-material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function ErrosComuns({ user }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({});
  const [abas, setAbas] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [tags, setTags] = useState([]);
  const [tag1Filter, setTag1Filter] = useState('');
  const [tag2Filter, setTag2Filter] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [filtroRevisao, setFiltroRevisao] = useState({ TRUE: true, FALSE: true });
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');
  const [cabecalhos, setCabecalhos] = useState({});
  const [filtrosAtivos, setFiltrosAtivos] = useState(0);
  const [allData, setAllData] = useState([]);

  // Verificar número de filtros ativos
  useEffect(() => {
    let count = 0;
    
    if (tag1Filter) count++;
    if (tag2Filter) count++;
    if (filtroRevisao.TRUE && !filtroRevisao.FALSE) count++;
    if (!filtroRevisao.TRUE && filtroRevisao.FALSE) count++;
    if (searchQuery) count++;
    
    setFiltrosAtivos(count);
  }, [tag1Filter, tag2Filter, filtroRevisao, searchQuery]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/erros-comuns');
      
      if (response.data) {
        // Extrair abas, dados e cabeçalhos
        const { abas, dados, cabecalhos } = response.data;
        
        // Adicionar todos os dados em um único array para a aba "Todos"
        let todosOsDados = [];
        Object.keys(dados).forEach(aba => {
          // Adicionar o nome da aba a cada item para identificação
          const itensComAba = (dados[aba] || []).map(item => ({
            ...item,
            Aba: aba
          }));
          todosOsDados = [...todosOsDados, ...itensComAba];
        });
        setAllData(todosOsDados);
        
        // Adicionar aba "Todos" ao início do array
        setAbas(['Todos', ...abas]);
        setData({ Todos: todosOsDados, ...dados });
        setCabecalhos(cabecalhos || {});
        
        // Se temos abas disponíveis
        if (abas && abas.length > 0) {
          // Usar a aba "Todos" por padrão
          const currentTabData = todosOsDados;
          
          // Aplicar filtros iniciais e extrair opções de tags
          applyFilters(currentTabData, 0, '', '', filtroRevisao, '');
          extrairOpcoesDeTags(currentTabData);
        } else {
          setFilteredData([]);
        }
      } else {
        console.error('Erro ao buscar dados: formato inesperado');
        toast.error('Erro ao carregar os dados');
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar os dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtrarPorRevisao = (items, filtroRevisao) => {
    if ((filtroRevisao.TRUE && filtroRevisao.FALSE) || (!filtroRevisao.TRUE && !filtroRevisao.FALSE)) {
      return items;
    }
    
    if (filtroRevisao.TRUE && !filtroRevisao.FALSE) {
      return items.filter(item => item.Revisado === 'Sim');
    }
    
    if (!filtroRevisao.TRUE && filtroRevisao.FALSE) {
      return items.filter(item => item.Revisado === 'Não');
    }
    
    return items;
  };

  const applyFilters = (allData, tabIndex, tag1Value, tag2Value, revisaoValue, searchValue) => {
    if (!allData || allData.length === 0) return;

    let filteredItems = [...allData];

    // Filtrar por Tag1
    if (tag1Value) {
      filteredItems = filteredItems.filter(item => item.Tag1 === tag1Value);
    }
    
    // Filtrar por Tag2
    if (tag2Value) {
      filteredItems = filteredItems.filter(item => item.Tag2 === tag2Value);
    }
    
    // Filtrar por status de revisão
    filteredItems = filtrarPorRevisao(filteredItems, revisaoValue);
    
    // Filtrar por texto de busca
    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
      filteredItems = filteredItems.filter(item => {
        return (
          (item.Erro && item.Erro.toLowerCase().includes(searchLower)) ||
          (item.Solução && item.Solução.toLowerCase().includes(searchLower)) ||
          (item.Observação && item.Observação.toLowerCase().includes(searchLower))
        );
      });
    }
    
    setFilteredData(filteredItems);
  };

  useEffect(() => {
    if (abas && abas.length > 0 && data && Object.keys(data).length > 0) {
      const abaAtual = abas[currentTab];
      const currentItems = data[abaAtual] || [];
      
      // Extrair opções de tags para a aba atual
      if (abaAtual === 'Todos') {
        extrairOpcoesDeTags(allData);
      } else {
        extrairOpcoesDeTags(currentItems);
      }
      
      applyFilters(currentItems, currentTab, tag1Filter, tag2Filter, filtroRevisao, searchQuery);
    }
  }, [currentTab, data, abas]);

  const extrairOpcoesDeTags = (items) => {
    if (!items || items.length === 0) return;

    // Extrair tags únicas (Tag1 e Tag2)
    const uniqueTags = {
      tag1: [...new Set(items.map(item => item.Tag1))].filter(tag => tag && tag.trim() !== '').sort(),
      tag2: [...new Set(items.map(item => item.Tag2))].filter(tag => tag && tag.trim() !== '').sort()
    };

    setTags(uniqueTags);
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    setTag1Filter('');
    setTag2Filter('');
    setSearchQuery('');
    setSearchActive(false);
    
    // Atualizar filtros quando muda de aba
    if (abas && abas.length > 0 && data && Object.keys(data).length > 0) {
      const novaAba = abas[newValue];
      const novosDadosAba = data[novaAba] || [];
      extrairOpcoesDeTags(novosDadosAba);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setSearchActive(true);
      const abaAtual = abas[currentTab];
      const currentItems = data[abaAtual] || [];
      applyFilters(currentItems, currentTab, tag1Filter, tag2Filter, filtroRevisao, searchQuery);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSearchKeyPress = handleKeyPress;

  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Quando o campo de busca for limpo, resetar a busca automaticamente
    if (!value.trim()) {
      setSearchActive(false);
      const abaAtual = abas[currentTab];
      const currentItems = data[abaAtual] || [];
      applyFilters(currentItems, currentTab, tag1Filter, tag2Filter, filtroRevisao, '');
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchActive(false);
    const abaAtual = abas[currentTab];
    const currentItems = data[abaAtual] || [];
    applyFilters(currentItems, currentTab, tag1Filter, tag2Filter, filtroRevisao, '');
  };

  const handleRevisadoFilterChange = (value) => {
    const newRevisadoFilter = { ...filtroRevisao };
    newRevisadoFilter[value] = !newRevisadoFilter[value];
    setFiltroRevisao(newRevisadoFilter);
    const abaAtual = abas[currentTab];
    const currentItems = data[abaAtual] || [];
    applyFilters(currentItems, currentTab, tag1Filter, tag2Filter, newRevisadoFilter, searchQuery);
  };

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopySuccess('Solução copiada para a área de transferência!');
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
    setTag1Filter('');
    setTag2Filter('');
    setFiltroRevisao({ TRUE: true, FALSE: true });
    setSearchQuery('');
    const abaAtual = abas[currentTab];
    const currentItems = data[abaAtual] || [];
    applyFilters(currentItems, currentTab, '', '', { TRUE: true, FALSE: true }, '');
  };

  const handleOpenModal = (item) => {
    setModalData(item);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const getTabName = () => {
    return abas[currentTab] || "";
  };

  const handleTag1Change = (selectedOption) => {
    const valor = selectedOption ? selectedOption.value : '';
    setTag1Filter(valor);
    const abaAtual = abas[currentTab];
    const currentItems = data[abaAtual] || [];
    applyFilters(currentItems, currentTab, valor, tag2Filter, filtroRevisao, searchQuery);
  };

  const handleTag2Change = (selectedOption) => {
    const valor = selectedOption ? selectedOption.value : '';
    setTag2Filter(valor);
    const abaAtual = abas[currentTab];
    const currentItems = data[abaAtual] || [];
    applyFilters(currentItems, currentTab, tag1Filter, valor, filtroRevisao, searchQuery);
  };

  const handleRevisaoChange = (event) => {
    const { name, checked } = event.target;
    const novoFiltro = { ...filtroRevisao, [name]: checked };
    setFiltroRevisao(novoFiltro);
    const abaAtual = abas[currentTab];
    const currentItems = data[abaAtual] || [];
    applyFilters(currentItems, currentTab, tag1Filter, tag2Filter, novoFiltro, searchQuery);
  };

  // Função para gerar cor baseada em hash da string
  const getColorForTag = (tag) => {
    if (!tag) return { main: '#9e9e9e', bg: 'rgba(158, 158, 158, 0.08)', border: 'rgba(158, 158, 158, 0.3)' };
    
    // Hash simples
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Lista de cores predefinidas com boa visibilidade
    const colors = [
      { main: '#1976d2', bg: 'rgba(25, 118, 210, 0.08)', border: 'rgba(25, 118, 210, 0.3)' },   // azul
      { main: '#e53935', bg: 'rgba(229, 57, 53, 0.08)', border: 'rgba(229, 57, 53, 0.3)' },     // vermelho
      { main: '#7b1fa2', bg: 'rgba(123, 31, 162, 0.08)', border: 'rgba(123, 31, 162, 0.3)' },   // roxo
      { main: '#388e3c', bg: 'rgba(56, 142, 60, 0.08)', border: 'rgba(56, 142, 60, 0.3)' },     // verde
      { main: '#f57c00', bg: 'rgba(245, 124, 0, 0.08)', border: 'rgba(245, 124, 0, 0.3)' },     // laranja
      { main: '#0288d1', bg: 'rgba(2, 136, 209, 0.08)', border: 'rgba(2, 136, 209, 0.3)' },     // azul claro
      { main: '#455a64', bg: 'rgba(69, 90, 100, 0.08)', border: 'rgba(69, 90, 100, 0.3)' },     // azul cinza
      { main: '#5d4037', bg: 'rgba(93, 64, 55, 0.08)', border: 'rgba(93, 64, 55, 0.3)' },       // marrom
      { main: '#00796b', bg: 'rgba(0, 121, 107, 0.08)', border: 'rgba(0, 121, 107, 0.3)' },     // verde azulado
      { main: '#c2185b', bg: 'rgba(194, 24, 91, 0.08)', border: 'rgba(194, 24, 91, 0.3)' }      // rosa
    ];
    
    // Usar o hash para selecionar uma cor da lista
    const index = Math.abs(hash) % colors.length;
    return colors[index];
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
    if (!abas || abas.length === 0) return null;
    
    const abaAtual = abas[currentTab] || '';
    const labelTag1 = cabecalhos[abaAtual]?.colA || 'Integração';
    const labelTag2 = cabecalhos[abaAtual]?.colB || 'Tipo';
    
    // Verificar se existem valores nas tags 
    const temValoresTag1 = tags && tags.tag1 && tags.tag1.length > 0;
    const temValoresTag2 = tags && tags.tag2 && tags.tag2.length > 0;
    
    // Preparar opções para o React Select
    const tag1Options = temValoresTag1
      ? [{ label: "Todos", value: "" }, ...tags.tag1.map(tag => ({ label: tag, value: tag }))]
      : [{ label: "Todos", value: "" }];
    
    const tag2Options = temValoresTag2
      ? [{ label: "Todos", value: "" }, ...tags.tag2.map(tag => ({ label: tag, value: tag }))]
      : [{ label: "Todos", value: "" }];
    
    // Valor selecionado atual
    const selectedTag1 = tag1Options.find(option => option.value === tag1Filter) || null;
    const selectedTag2 = tag2Options.find(option => option.value === tag2Filter) || null;
    
    return (
      <div className={styles.filterControls}>
        {temValoresTag1 && (
          <div className={styles.formControl}>
            <span className={styles.inputLabel}>{labelTag1}</span>
            <Select
              value={selectedTag1}
              options={tag1Options}
              onChange={handleTag1Change}
              placeholder={`Selecione ${labelTag1}`}
              isClearable
              className={styles.reactSelect}
              theme={selectTheme}
              styles={customSelectStyles}
              aria-label={labelTag1}
            />
          </div>
        )}
        
        {temValoresTag2 && (
          <div className={styles.formControl}>
            <span className={styles.inputLabel}>{labelTag2}</span>
            <Select
              value={selectedTag2}
              options={tag2Options}
              onChange={handleTag2Change}
              placeholder={`Selecione ${labelTag2}`}
              isClearable
              className={styles.reactSelect}
              theme={selectTheme}
              styles={customSelectStyles}
              aria-label={labelTag2}
            />
          </div>
        )}
        
        <div className={styles.formControl}>
          <span className={styles.inputLabel}>Status</span>
          <FormGroup row className={styles.checkboxGroup}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={filtroRevisao.TRUE}
                  onChange={(e) => handleRevisaoChange(e)}
                  name="TRUE"
                  color="primary"
                  className={styles.checkboxRevisado}
                  size="small"
                />
              }
              label="Revisado"
              className={styles.checkboxLabel}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={filtroRevisao.FALSE}
                  onChange={(e) => handleRevisaoChange(e)}
                  name="FALSE"
                  color="primary"
                  className={styles.checkboxNaoRevisado}
                  size="small"
                />
              }
              label="Não Revisado"
              className={styles.checkboxLabel}
            />
          </FormGroup>
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
            disabled={!tag1Filter && !tag2Filter && filtroRevisao.TRUE && filtroRevisao.FALSE && !searchQuery}
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
            onKeyPress={handleSearchKeyPress}
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
            ? "Nenhum resultado encontrado" 
            : `${filteredData.length} ${filteredData.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}`}
        </Typography>
      </div>
    );
  };

  const renderCard = (item, index) => {
    const tag1Color = getColorForTag(item.Tag1);
    const tag2Color = getColorForTag(item.Tag2);
    const abaAtual = abas[currentTab];
    
    return (
      <div key={index} className={styles.card}>
        <div className={styles.cardStatusHeader}>
          <Chip 
            icon={item.Revisado === 'Sim' ? <CheckCircleIcon fontSize="small" /> : <CancelIcon fontSize="small" />}
            label={item.Revisado === 'Sim' ? 'Revisado' : 'Não revisado'} 
            color={item.Revisado === 'Sim' ? 'success' : 'warning'}
            variant="outlined" 
            size="small"
            className={styles.revisaoChip} 
          />
        </div>
        
        <div className={styles.cardHeader}>
          <Chip 
            label={abaAtual === 'Todos' ? item.Aba : getTabName()} 
            color="primary" 
            className={styles.sectionChip} 
          />
          {item.Tag1 && (
            <Chip 
              label={item.Tag1} 
              variant="outlined" 
              className={styles.tagChip}
              style={{
                color: tag1Color.main,
                borderColor: tag1Color.border,
                backgroundColor: tag1Color.bg
              }}
            />
          )}
          {item.Tag2 && (
            <Chip 
              label={item.Tag2} 
              variant="outlined" 
              className={styles.tagChip}
              style={{
                color: tag2Color.main,
                borderColor: tag2Color.border,
                backgroundColor: tag2Color.bg
              }}
            />
          )}
        </div>
        
        <div className={styles.cardContentArea}>
          <h3 className={styles.errorTitle}>{item.Erro}</h3>
        </div>
        
        <div className={styles.cardFooter}>
          <Button
            variant="outlined"
            color="primary"
            size="small"
            onClick={() => handleOpenModal(item)}
            startIcon={<VisibilityIcon />}
            className={styles.viewButton}
          >
            Ver detalhes
          </Button>
        </div>
      </div>
    );
  };

  const renderModalContent = () => {
    const tag1Color = getColorForTag(modalData.Tag1);
    const tag2Color = getColorForTag(modalData.Tag2);
    const abaAtual = abas[currentTab];
    
    return (
      <>
        <div className={styles.modalHeader}>
          <Typography variant="h6" component="h2" className={styles.modalTitle}>
            {modalData.Erro}
          </Typography>
          
          <div className={styles.modalChips}>
            {abaAtual === 'Todos' && modalData.Aba && (
              <Chip 
                label={modalData.Aba} 
                color="primary" 
                size="small"
                className={styles.modalChip}
              />
            )}
            {modalData.Tag1 && (
              <Chip 
                label={modalData.Tag1} 
                variant="outlined" 
                size="small"
                className={styles.modalChip}
                style={{
                  color: tag1Color.main,
                  borderColor: tag1Color.border,
                  backgroundColor: tag1Color.bg
                }}
              />
            )}
            {modalData.Tag2 && (
              <Chip 
                label={modalData.Tag2} 
                variant="outlined" 
                size="small"
                className={styles.modalChip}
                style={{
                  color: tag2Color.main,
                  borderColor: tag2Color.border,
                  backgroundColor: tag2Color.bg
                }}
              />
            )}
            <Chip 
              icon={modalData.Revisado === 'Sim' ? <CheckCircleIcon fontSize="small" /> : <CancelIcon fontSize="small" />}
              label={modalData.Revisado === 'Sim' ? 'Revisado' : 'Não revisado'} 
              color={modalData.Revisado === 'Sim' ? 'success' : 'warning'}
              variant="outlined" 
              size="small"
            />
          </div>
        </div>

        <div className={styles.solutionBox}>
          <div className={styles.solutionHeader}>
            <div className={styles.sectionTitleWrapper}>
              <DescriptionIcon className={styles.sectionIcon} />
              <Typography variant="subtitle1" component="h3" className={styles.sectionTitle}>
                Solução
              </Typography>
            </div>
            <Tooltip title="Copiar solução">
              <IconButton 
                onClick={() => handleCopyToClipboard(modalData.Solução)}
                size="small"
                className={styles.copyButton}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </div>
          <Box className={styles.solutionScrollbox}>
            <Typography variant="body2" className={styles.solutionText}>
              {modalData.Solução}
            </Typography>
          </Box>
        </div>

        {modalData.Observação && modalData.Observação.trim() !== '' && (
          <Box className={styles.observationBox}>
            <div className={styles.sectionTitleWrapper}>
              <InfoIcon className={styles.sectionIcon} />
              <Typography variant="subtitle1" component="h3" className={styles.sectionTitle}>
                Observação
              </Typography>
            </div>
            <Typography variant="body2" className={styles.observationText}>
              {modalData.Observação}
            </Typography>
          </Box>
        )}
      </>
    );
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <CircularProgress />
        <p>Carregando dados...</p>
      </div>
    );
  }

  return (
    <Container maxWidth="xl" className={styles.container}>
      <div className={styles.pageHeader}>
        <Paper 
          elevation={0} 
          className={styles.infoBanner}
          sx={{ 
            padding: '12px 16px', 
            marginBottom: '16px', 
            backgroundColor: 'var(--box-color)',
            border: '1px solid var(--color-primary)',
            color: 'var(--title-color)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <AnnouncementIcon color="primary" />
          <Typography variant="body2">
            Você tem um erro mapeado e quer compartilhar? Envie para o canal do Slack{' '}
            <Link 
              href="https://olist.slack.com/archives/C08E3GUME3U" 
              target="_blank" 
              rel="noopener noreferrer"
              sx={{ fontWeight: 500 }}
            >
              #conteúdos-suporte
            </Link>
          </Typography>
        </Paper>
        <h1 className={styles.pageTitle}>Base de Erros</h1>
        <p className={styles.pageDescription}>
          Esta ferramenta exibe erros mepeados e suas soluções para facilitar a busca e resolução de problemas.
        </p>
      </div>

      {abas.length > 0 ? (
        <>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            className={styles.tabs}
          >
            {abas.map((aba, index) => (
              <Tab key={index} label={aba} className={styles.tab} />
            ))}
          </Tabs>

          {renderFiltersBlock()}

          {filteredData.length > 0 && renderResultsInfo()}

          <div className={styles.cards}>
            {filteredData.length > 0 ? (
              filteredData.map((item, index) => renderCard(item, index))
            ) : (
              <div className={styles.noResults}>
                <Typography variant="body1">
                  Nenhum resultado encontrado para os filtros selecionados.
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
        </>
      ) : (
        <div className={styles.noResults}>
          <Typography variant="body1">
            Nenhuma aba encontrada na planilha.
          </Typography>
        </div>
      )}

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