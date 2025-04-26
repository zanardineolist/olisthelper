import React, { useState, useEffect, useRef } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  Typography,
  Chip,
  Container,
  FormGroup,
  Box,
  CircularProgress,
  Tooltip
} from '@mui/material';
import { Search as SearchIcon, Close as CloseIcon, FilterList as FilterListIcon, ContentCopy as ContentCopyIcon } from '@mui/icons-material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function ErrosComuns({ user }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    anuncios: [],
    expedicao: [],
    notas: []
  });
  const [filteredData, setFilteredData] = useState([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [integracoes, setIntegracoes] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [integracaoFilter, setIntegracaoFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [filtroRevisao, setFiltroRevisao] = useState({ TRUE: true, FALSE: true });
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');

  const tabOptions = [
    { label: 'Anúncios', value: 'anuncios' },
    { label: 'Expedição', value: 'expedicao' },
    { label: 'Notas Fiscais', value: 'notasFiscais' }
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/erros-comuns');
      
      if (response.data) {
        const apiData = {
          anuncios: response.data.anuncios || [],
          expedicao: response.data.expedicao || [],
          notas: response.data.notasFiscais || []
        };
        
        setData(apiData);
        
        const tabKey = currentTab === 0 ? 'anuncios' : currentTab === 1 ? 'expedicao' : 'notas';
        const currentTabData = apiData[tabKey] || [];
        
        applyFilters(currentTabData, currentTab, '', '', filtroRevisao, '');
        extrairOpcoesDeFiltragem(currentTabData, currentTab);
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
      return items.filter(item => item.Revisado === 'TRUE');
    }
    
    if (!filtroRevisao.TRUE && filtroRevisao.FALSE) {
      return items.filter(item => item.Revisado === 'FALSE');
    }
    
    return items;
  };

  const applyFilters = (allData, tabIndex, integracaoValue, tipoValue, revisaoValue, searchValue) => {
    if (!allData || allData.length === 0) return;

    let filteredItems = [...allData];

    if (tabIndex !== 2 && integracaoValue) {
      const field = tabIndex === 0 ? 'Integração' : tabIndex === 1 ? 'Logística' : null;
      if (field) {
        filteredItems = filteredItems.filter(item => item[field] === integracaoValue);
      }
    }
    
    if (tipoValue) {
      filteredItems = filteredItems.filter(item => item.Tipo === tipoValue);
    }
    
    filteredItems = filtrarPorRevisao(filteredItems, revisaoValue);
    
    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
      filteredItems = filteredItems.filter(item => {
        return (
          (item.Erro && item.Erro.toLowerCase().includes(searchLower)) ||
          (item.Solução && item.Solução.toLowerCase().includes(searchLower)) ||
          (item.Observação && item.Observação.toLowerCase().includes(searchLower)) ||
          (item['Sugestões de melhoria'] && item['Sugestões de melhoria'].toLowerCase().includes(searchLower)) ||
          (item['Sugestão de melhoria'] && item['Sugestão de melhoria'].toLowerCase().includes(searchLower))
        );
      });
    }
    
    setFilteredData(filteredItems);
  };

  useEffect(() => {
    if (data) {
      const tabKey = currentTab === 0 ? 'anuncios' : currentTab === 1 ? 'expedicao' : 'notas';
      const currentItems = data[tabKey] || [];
      
      applyFilters(currentItems, currentTab, '', '', filtroRevisao, searchQuery);
      
      extrairOpcoesDeFiltragem(currentItems, currentTab);
    }
  }, [currentTab, data]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    setIntegracaoFilter('');
    setTipoFilter('');
    setSearchQuery('');
    setSearchActive(false);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setSearchActive(true);
      const tabKey = currentTab === 0 ? 'anuncios' : currentTab === 1 ? 'expedicao' : 'notas';
      const currentItems = data[tabKey] || [];
      applyFilters(currentItems, currentTab, integracaoFilter, tipoFilter, filtroRevisao, searchQuery);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSearchKeyPress = handleKeyPress;

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchActive(false);
    const tabKey = currentTab === 0 ? 'anuncios' : currentTab === 1 ? 'expedicao' : 'notas';
    const currentItems = data[tabKey] || [];
    applyFilters(currentItems, currentTab, integracaoFilter, tipoFilter, filtroRevisao, '');
  };

  const handleRevisadoFilterChange = (value) => {
    const newRevisadoFilter = { ...filtroRevisao };
    newRevisadoFilter[value] = !newRevisadoFilter[value];
    setFiltroRevisao(newRevisadoFilter);
    const tabKey = currentTab === 0 ? 'anuncios' : currentTab === 1 ? 'expedicao' : 'notas';
    const currentItems = data[tabKey] || [];
    applyFilters(currentItems, currentTab, integracaoFilter, tipoFilter, newRevisadoFilter, searchQuery);
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
    setIntegracaoFilter('');
    setTipoFilter('');
    setFiltroRevisao({ TRUE: true, FALSE: true });
    setSearchQuery('');
    const tabKey = currentTab === 0 ? 'anuncios' : currentTab === 1 ? 'expedicao' : 'notas';
    const currentItems = data[tabKey] || [];
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
    return tabOptions[currentTab].label;
  };

  const getIntegrationName = (item) => {
    if (currentTab === 0 && item.Integração) {
      return item.Integração;
    } else if (currentTab === 1 && item.Logística) {
      return item.Logística;
    }
    return null;
  };

  const handleIntegracaoChange = (event) => {
    const valor = event.target.value;
    setIntegracaoFilter(valor);
    const tabKey = currentTab === 0 ? 'anuncios' : currentTab === 1 ? 'expedicao' : 'notas';
    const currentItems = data[tabKey] || [];
    applyFilters(currentItems, currentTab, valor, tipoFilter, filtroRevisao, searchQuery);
  };

  const handleTipoChange = (event) => {
    const valor = event.target.value;
    setTipoFilter(valor);
    const tabKey = currentTab === 0 ? 'anuncios' : currentTab === 1 ? 'expedicao' : 'notas';
    const currentItems = data[tabKey] || [];
    applyFilters(currentItems, currentTab, integracaoFilter, valor, filtroRevisao, searchQuery);
  };

  const handleRevisaoChange = (event) => {
    const { name, checked } = event.target;
    const novoFiltro = { ...filtroRevisao, [name]: checked };
    setFiltroRevisao(novoFiltro);
    const tabKey = currentTab === 0 ? 'anuncios' : currentTab === 1 ? 'expedicao' : 'notas';
    const currentItems = data[tabKey] || [];
    applyFilters(currentItems, currentTab, integracaoFilter, tipoFilter, novoFiltro, searchQuery);
  };

  const renderFiltroIntegracao = () => {
    if (currentTab === 2 || integracoes.length === 0) return null;

    const label = currentTab === 0 ? 'Integração' : 'Logística';
    
    return (
      <FormControl variant="outlined" size="small" className={styles.formControl}>
        <InputLabel id="integracao-select-label">{label}</InputLabel>
        <Select
          labelId="integracao-select-label"
          id="integracao-select"
          value={integracaoFilter}
          onChange={handleIntegracaoChange}
          label={label}
        >
          <MenuItem value="">
            <em>Todos</em>
          </MenuItem>
          {integracoes.map((integ) => (
            <MenuItem key={integ} value={integ}>{integ}</MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

  const renderFiltroTipo = () => {
    if (tipos.length === 0) return null;
    
    return (
      <FormControl variant="outlined" size="small" className={styles.formControl}>
        <InputLabel id="tipo-select-label">Tipo</InputLabel>
        <Select
          labelId="tipo-select-label"
          id="tipo-select"
          value={tipoFilter}
          onChange={handleTipoChange}
          label="Tipo"
        >
          <MenuItem value="">
            <em>Todos</em>
          </MenuItem>
          {tipos.map((tipo) => (
            <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

  const renderFiltrosRevisao = () => {
    return (
      <FormGroup row className={styles.checkboxGroup}>
        <FormControlLabel
          control={
            <Checkbox
              checked={filtroRevisao.TRUE}
              onChange={(e) => handleRevisaoChange(e)}
              name="TRUE"
              color="primary"
            />
          }
          label="Revisado"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={filtroRevisao.FALSE}
              onChange={(e) => handleRevisaoChange(e)}
              name="FALSE"
              color="primary"
            />
          }
          label="Não Revisado"
        />
      </FormGroup>
    );
  };

  const renderCard = (item, index) => (
    <div key={index} className={styles.card}>
      <div className={styles.cardHeader}>
        <Chip 
          label={getTabName()} 
          color="primary" 
          className={styles.sectionChip} 
        />
        {currentTab === 0 && item.Integração && (
          <Chip 
            label={item.Integração} 
            color="primary" 
            variant="outlined" 
            className={styles.integrationChip} 
          />
        )}
        {currentTab === 1 && item.Logística && (
          <Chip 
            label={item.Logística} 
            color="primary" 
            variant="outlined" 
            className={styles.integrationChip} 
          />
        )}
        {item.Tipo && (
          <Chip 
            label={item.Tipo} 
            color="secondary" 
            variant="outlined" 
            className={styles.typeChip} 
          />
        )}
        <Chip 
          icon={item.Revisado === 'TRUE' ? <CheckCircleIcon /> : <CancelIcon />}
          label={item.Revisado === 'TRUE' ? 'Revisado' : 'Não revisado'} 
          color={item.Revisado === 'TRUE' ? 'success' : 'warning'}
          variant="outlined" 
          size="small"
          className={styles.revisaoChip} 
        />
      </div>
      
      <h3 className={styles.errorTitle}>{item.Erro}</h3>
    </div>
  );

  const renderModalContent = () => (
    <>
      <div className={styles.solutionHeader}>
        <Typography variant="subtitle1" component="h3" className={styles.sectionTitle}>
          Solução
        </Typography>
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

      {modalData.Observação && modalData.Observação.trim() !== '' && (
        <Box className={styles.observationBox}>
          <Typography variant="subtitle1" component="h3" className={styles.sectionTitle}>
            Observação
          </Typography>
          <Typography variant="body2" className={styles.observationText}>
            {modalData.Observação}
          </Typography>
        </Box>
      )}

      {modalData['Sugestões de melhoria'] && modalData['Sugestões de melhoria'].trim() !== '' && (
        <Box className={styles.suggestionBox}>
          <Typography variant="subtitle1" component="h3" className={styles.sectionTitle}>
            Sugestões de melhoria
          </Typography>
          <Typography variant="body2" className={styles.suggestionText}>
            {modalData['Sugestões de melhoria']}
          </Typography>
        </Box>
      )}
      
      {modalData['Sugestão de melhoria'] && modalData['Sugestão de melhoria'].trim() !== '' && (
        <Box className={styles.suggestionBox}>
          <Typography variant="subtitle1" component="h3" className={styles.sectionTitle}>
            Sugestões de melhoria
          </Typography>
          <Typography variant="body2" className={styles.suggestionText}>
            {modalData['Sugestão de melhoria']}
          </Typography>
        </Box>
      )}
    </>
  );

  const getIntegrationLabel = () => {
    return currentTab === 0 ? 'Integração' : currentTab === 1 ? 'Logística' : 'Tipo';
  };

  const extrairOpcoesDeFiltragem = (data, tabIndex) => {
    if (!data || data.length === 0) return;

    if (tabIndex !== 2) {
      const field = tabIndex === 0 ? 'Integração' : 'Logística';
      const uniqueIntegracoes = [...new Set(data.map(item => item[field]))].filter(Boolean).sort();
      setIntegracoes(uniqueIntegracoes);
    } else {
      setIntegracoes([]);
    }

    const uniqueTipos = [...new Set(data.map(item => item.Tipo))].filter(Boolean).sort();
    setTipos(uniqueTipos);
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
        <h1 className={styles.pageTitle}>Base de Conhecimento de Erros</h1>
        <p className={styles.pageDescription}>
          Esta ferramenta exibe erros comuns e suas soluções para anúncios, expedição e notas fiscais.
        </p>
      </div>

      <Tabs
        value={currentTab}
        onChange={handleTabChange}
        variant="fullWidth"
        className={styles.tabs}
      >
        <Tab label="Anúncios" className={styles.tab} />
        <Tab label="Expedição" className={styles.tab} />
        <Tab label="Notas Fiscais" className={styles.tab} />
      </Tabs>

      <div className={styles.searchContainer}>
        <div className={styles.searchInputWrapper}>
          <TextField
            fullWidth
            label="Buscar"
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            InputProps={{
              className: styles.inputRoot,
              endAdornment: searchQuery ? (
                <IconButton size="small" onClick={handleClearSearch} className={styles.iconButton}>
                  <CloseIcon />
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
          <Button
            variant="contained"
            color="primary"
            onClick={handleSearch}
            startIcon={<SearchIcon />}
            className={`${styles.searchButton} ${styles.btnContained}`}
          >
            Buscar
          </Button>
          <Button
            variant="outlined"
            onClick={() => setShowFilters(!showFilters)}
            startIcon={<FilterListIcon />}
            className={`${styles.filterButton} ${styles.btnOutlined}`}
          >
            Filtros
          </Button>
        </div>

        {showFilters && (
          <div className={styles.filtersContainer}>
            <div className={styles.filterControls}>
              {renderFiltroIntegracao()}

              {renderFiltroTipo()}

              {renderFiltrosRevisao()}

              <Button
                variant="outlined"
                color="secondary"
                onClick={resetFilters}
                className={`${styles.resetButton} ${styles.btnOutlined}`}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className={styles.resultsInfo}>
        <p>
          {filteredData.length} {filteredData.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
        </p>
      </div>

      <div className={styles.cards}>
        {filteredData.map((item, index) => renderCard(item, index))}
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