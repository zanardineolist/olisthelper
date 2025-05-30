import React, { useState, useEffect, useRef, useMemo } from 'react';
import styles from '../../styles/ErrosComuns.module.css';
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
    setFiltroRevisao({ TRUE: true, FALSE: true });
  };

  const openModal = (item) => {
    setModalData(item);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalData(null);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Texto copiado para a área de transferência!');
    } catch (err) {
      console.error('Falha ao copiar: ', err);
      toast.error('Falha ao copiar texto');
    }
  };

  const handleSearchChange = (event) => {
    const searchValue = event.target.value;
    setSearchQuery(searchValue);
    setSearchActive(searchValue.trim() !== '');
    
    // Aplicar filtros em tempo real
    if (abas && abas.length > 0 && data && Object.keys(data).length > 0) {
      const abaAtual = abas[currentTab];
      const currentItems = data[abaAtual] || [];
      applyFilters(currentItems, currentTab, tag1Filter, tag2Filter, filtroRevisao, searchValue);
    }
  };

  const handleTag1Change = (selectedOption) => {
    const tag1Value = selectedOption ? selectedOption.value : '';
    setTag1Filter(tag1Value);
    
    // Aplicar filtros em tempo real
    if (abas && abas.length > 0 && data && Object.keys(data).length > 0) {
      const abaAtual = abas[currentTab];
      const currentItems = data[abaAtual] || [];
      applyFilters(currentItems, currentTab, tag1Value, tag2Filter, filtroRevisao, searchQuery);
    }
  };

  const handleTag2Change = (selectedOption) => {
    const tag2Value = selectedOption ? selectedOption.value : '';
    setTag2Filter(tag2Value);
    
    // Aplicar filtros em tempo real
    if (abas && abas.length > 0 && data && Object.keys(data).length > 0) {
      const abaAtual = abas[currentTab];
      const currentItems = data[abaAtual] || [];
      applyFilters(currentItems, currentTab, tag1Filter, tag2Value, filtroRevisao, searchQuery);
    }
  };

  const handleRevisaoChange = (event) => {
    const newFiltroRevisao = {
      ...filtroRevisao,
      [event.target.name]: event.target.checked
    };
    setFiltroRevisao(newFiltroRevisao);
    
    // Aplicar filtros em tempo real
    if (abas && abas.length > 0 && data && Object.keys(data).length > 0) {
      const abaAtual = abas[currentTab];
      const currentItems = data[abaAtual] || [];
      applyFilters(currentItems, currentTab, tag1Filter, tag2Filter, newFiltroRevisao, searchQuery);
    }
  };

  const clearAllFilters = () => {
    setTag1Filter('');
    setTag2Filter('');
    setSearchQuery('');
    setFiltroRevisao({ TRUE: true, FALSE: true });
    setSearchActive(false);
    
    // Aplicar filtros limpos
    if (abas && abas.length > 0 && data && Object.keys(data).length > 0) {
      const abaAtual = abas[currentTab];
      const currentItems = data[abaAtual] || [];
      applyFilters(currentItems, currentTab, '', '', { TRUE: true, FALSE: true }, '');
    }
  };

  // Opções para os selects de tag
  const tag1Options = useMemo(() => [
    { value: '', label: 'Todas as categorias' },
    ...tags.tag1?.map(tag => ({ value: tag, label: tag })) || []
  ], [tags.tag1]);

  const tag2Options = useMemo(() => [
    { value: '', label: 'Todos os tipos' },
    ...tags.tag2?.map(tag => ({ value: tag, label: tag })) || []
  ], [tags.tag2]);

  // Estilos customizados para os react-select
  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: 'var(--labels-bg)',
      borderColor: state.isFocused ? 'var(--color-primary)' : 'var(--color-border)',
      color: 'var(--text-color)',
      borderRadius: '5px',
      padding: '2px',
      boxShadow: 'none',
      '&:hover': {
        borderColor: 'var(--color-primary)',
      },
      outline: 'none',
      minHeight: '38px',
    }),
    input: (provided) => ({
      ...provided,
      color: 'var(--text-color)',
      caretColor: 'var(--text-color)',
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: 'var(--labels-bg)',
      maxHeight: '200px',
      overflowY: 'auto',
      zIndex: 9999,
    }),
    menuList: (provided) => ({
      ...provided,
      padding: 0,
      maxHeight: '200px',
      '&::-webkit-scrollbar': {
        width: '8px',
      },
      '&::-webkit-scrollbar-track': {
        background: 'var(--scroll-bg)',
      },
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: 'var(--scroll)',
        borderRadius: '10px',
        border: '2px solid var(--scroll-bg)',
      },
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused
        ? 'var(--color-trodd)'
        : state.isSelected
        ? 'var(--color-primary)'
        : 'var(--box-color)',
      color: 'var(--text-color)',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: 'var(--color-trodd)',
      },
    }),
    singleValue: (provided) => ({
      ...provided,
      color: 'var(--text-color)',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: 'var(--text-color2)',
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      color: 'var(--text-color)',
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: 'var(--color-border)',
    }),
  };

  if (loading) {
    return (
      <Container maxWidth="lg" className={styles.container}>
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
          <CircularProgress size={50} />
          <Typography variant="h6" style={{ marginLeft: 16, color: 'var(--text-color)' }}>
            Carregando dados...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" className={styles.container}>
      {/* Header */}
      <Box className={styles.header}>
        <Typography variant="h4" className={styles.title}>
          <AnnouncementIcon className={styles.titleIcon} />
          Erros Comuns e Soluções
        </Typography>
        <Typography variant="body1" className={styles.subtitle}>
          Encontre soluções para problemas frequentes
        </Typography>
      </Box>

      {/* Tabs */}
      <Paper elevation={1} className={styles.tabsContainer}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          className={styles.tabs}
        >
          {abas.map((aba, index) => (
            <Tab 
              key={index} 
              label={
                <span className={styles.tabLabel}>
                  {aba}
                  <Chip 
                    label={data[aba]?.length || 0} 
                    size="small" 
                    className={styles.tabChip}
                  />
                </span>
              }
              className={styles.tab}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Filtros */}
      <Paper elevation={1} className={styles.filtersContainer}>
        <Box className={styles.filtersHeader}>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            endIcon={
              filtrosAtivos > 0 && (
                <Badge badgeContent={filtrosAtivos} color="error" />
              )
            }
            onClick={() => setShowFilters(!showFilters)}
            className={styles.filterToggle}
          >
            Filtros
          </Button>
          
          {filtrosAtivos > 0 && (
            <Button
              variant="text"
              size="small"
              onClick={clearAllFilters}
              className={styles.clearFilters}
            >
              Limpar Filtros
            </Button>
          )}
        </Box>

        <Collapse in={showFilters}>
          <Box className={styles.filtersContent}>
            {/* Campo de busca */}
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Buscar por erro, solução ou observação..."
              value={searchQuery}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchActive && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchActive(false);
                        if (abas && abas.length > 0 && data && Object.keys(data).length > 0) {
                          const abaAtual = abas[currentTab];
                          const currentItems = data[abaAtual] || [];
                          applyFilters(currentItems, currentTab, tag1Filter, tag2Filter, filtroRevisao, '');
                        }
                      }}
                    >
                      <CloseIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              className={styles.searchField}
            />

            <Box className={styles.selectFilters}>
              {/* Filtro Tag1 */}
              <Box className={styles.selectContainer}>
                <Typography variant="body2" className={styles.selectLabel}>
                  Categoria:
                </Typography>
                <Select
                  options={tag1Options}
                  value={tag1Options.find(option => option.value === tag1Filter)}
                  onChange={handleTag1Change}
                  styles={customSelectStyles}
                  placeholder="Todas as categorias"
                  isClearable
                  isSearchable
                  className={styles.selectInput}
                />
              </Box>

              {/* Filtro Tag2 */}
              <Box className={styles.selectContainer}>
                <Typography variant="body2" className={styles.selectLabel}>
                  Tipo:
                </Typography>
                <Select
                  options={tag2Options}
                  value={tag2Options.find(option => option.value === tag2Filter)}
                  onChange={handleTag2Change}
                  styles={customSelectStyles}
                  placeholder="Todos os tipos"
                  isClearable
                  isSearchable
                  className={styles.selectInput}
                />
              </Box>
            </Box>

            {/* Filtro de Revisão */}
            <Box className={styles.checkboxFilters}>
              <Typography variant="body2" className={styles.selectLabel}>
                Status de Revisão:
              </Typography>
              <FormGroup row>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={filtroRevisao.TRUE}
                      onChange={handleRevisaoChange}
                      name="TRUE"
                      color="primary"
                    />
                  }
                  label="Revisado"
                  className={styles.checkbox}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={filtroRevisao.FALSE}
                      onChange={handleRevisaoChange}
                      name="FALSE"
                      color="primary"
                    />
                  }
                  label="Não Revisado"
                  className={styles.checkbox}
                />
              </FormGroup>
            </Box>
          </Box>
        </Collapse>
      </Paper>

      {/* Resultados */}
      <Box className={styles.resultsContainer}>
        <Box className={styles.resultsHeader}>
          <Typography variant="h6" className={styles.resultsTitle}>
            <DescriptionIcon className={styles.resultsIcon} />
            {filteredData.length} {filteredData.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
          </Typography>
        </Box>

        {filteredData.length === 0 ? (
          <Paper elevation={1} className={styles.noResults}>
            <Box className={styles.noResultsContent}>
              <InfoIcon className={styles.noResultsIcon} />
              <Typography variant="h6" className={styles.noResultsTitle}>
                Nenhum resultado encontrado
              </Typography>
              <Typography variant="body2" className={styles.noResultsText}>
                Tente ajustar os filtros ou usar termos de busca diferentes.
              </Typography>
              {filtrosAtivos > 0 && (
                <Button
                  variant="outlined"
                  onClick={clearAllFilters}
                  className={styles.clearFiltersButton}
                >
                  Limpar Filtros
                </Button>
              )}
            </Box>
          </Paper>
        ) : (
          <Box className={styles.resultsList}>
            {filteredData.map((item, index) => (
              <Paper key={index} elevation={2} className={styles.resultCard}>
                <Box className={styles.cardHeader}>
                  <Box className={styles.cardTags}>
                    {item.Tag1 && (
                      <Chip
                        label={item.Tag1}
                        size="small"
                        color="primary"
                        className={styles.tag1Chip}
                      />
                    )}
                    {item.Tag2 && (
                      <Chip
                        label={item.Tag2}
                        size="small"
                        color="secondary"
                        className={styles.tag2Chip}
                      />
                    )}
                    {currentTab === 0 && item.Aba && (
                      <Chip
                        label={item.Aba}
                        size="small"
                        variant="outlined"
                        className={styles.abaChip}
                      />
                    )}
                  </Box>
                  <Box className={styles.cardActions}>
                    <Tooltip title={item.Revisado === 'Sim' ? 'Revisado' : 'Não Revisado'}>
                      {item.Revisado === 'Sim' ? (
                        <CheckCircleIcon className={styles.revisedIcon} />
                      ) : (
                        <CancelIcon className={styles.notRevisedIcon} />
                      )}
                    </Tooltip>
                  </Box>
                </Box>

                <Box className={styles.cardContent}>
                  <Typography variant="h6" className={styles.errorTitle}>
                    {item.Erro}
                  </Typography>
                  
                  <Typography variant="body2" className={styles.solutionText}>
                    <strong>Solução:</strong> {item.Solução && item.Solução.length > 200
                      ? `${item.Solução.substring(0, 200)}...`
                      : item.Solução}
                  </Typography>

                  {item.Observação && (
                    <Typography variant="body2" className={styles.observationText}>
                      <strong>Observação:</strong> {item.Observação.length > 150
                        ? `${item.Observação.substring(0, 150)}...`
                        : item.Observação}
                    </Typography>
                  )}
                </Box>

                <Box className={styles.cardFooter}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<VisibilityIcon />}
                    onClick={() => openModal(item)}
                    className={styles.viewButton}
                  >
                    Ver Detalhes
                  </Button>
                  <Button
                    variant="text"
                    size="small"
                    startIcon={<ContentCopyIcon />}
                    onClick={() => copyToClipboard(item.Solução)}
                    className={styles.copyButton}
                  >
                    Copiar Solução
                  </Button>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Box>

      {/* Modal de Detalhes */}
      <Dialog
        open={modalOpen}
        onClose={closeModal}
        maxWidth="md"
        fullWidth
        className={styles.modal}
      >
        {modalData && (
          <>
            <DialogContent className={styles.modalContent}>
              <Box className={styles.modalHeader}>
                <Typography variant="h5" className={styles.modalTitle}>
                  {modalData.Erro}
                </Typography>
                <Box className={styles.modalTags}>
                  {modalData.Tag1 && (
                    <Chip
                      label={modalData.Tag1}
                      color="primary"
                      className={styles.modalTag1}
                    />
                  )}
                  {modalData.Tag2 && (
                    <Chip
                      label={modalData.Tag2}
                      color="secondary"
                      className={styles.modalTag2}
                    />
                  )}
                  <Chip
                    icon={modalData.Revisado === 'Sim' ? 
                      <FontAwesomeIcon icon={faCheck} /> : 
                      <FontAwesomeIcon icon={faXmark} />
                    }
                    label={modalData.Revisado === 'Sim' ? 'Revisado' : 'Não Revisado'}
                    color={modalData.Revisado === 'Sim' ? 'success' : 'default'}
                    className={styles.modalRevisionChip}
                  />
                </Box>
              </Box>

              <Box className={styles.modalBody}>
                <Box className={styles.modalSection}>
                  <Typography variant="h6" className={styles.modalSectionTitle}>
                    Solução:
                  </Typography>
                  <Typography variant="body1" className={styles.modalSectionContent}>
                    {modalData.Solução}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ContentCopyIcon />}
                    onClick={() => copyToClipboard(modalData.Solução)}
                    className={styles.modalCopyButton}
                  >
                    Copiar Solução
                  </Button>
                </Box>

                {modalData.Observação && (
                  <Box className={styles.modalSection}>
                    <Typography variant="h6" className={styles.modalSectionTitle}>
                      Observação:
                    </Typography>
                    <Typography variant="body1" className={styles.modalSectionContent}>
                      {modalData.Observação}
                    </Typography>
                  </Box>
                )}
              </Box>
            </DialogContent>

            <DialogActions className={styles.modalActions}>
              <Button
                onClick={() => copyToClipboard(modalData.Solução)}
                startIcon={<ContentCopyIcon />}
                className={styles.modalActionButton}
              >
                Copiar Solução
              </Button>
              <Button 
                onClick={closeModal} 
                variant="contained"
                className={styles.modalCloseButton}
              >
                Fechar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Snackbar para feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity="success" 
          onClose={() => setSnackbarOpen(false)}
          className={styles.snackbar}
        >
          {copySuccess}
        </Alert>
      </Snackbar>
    </Container>
  );
} 