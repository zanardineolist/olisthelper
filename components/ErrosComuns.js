import { useState, useEffect } from 'react';
import styles from '../styles/ErrosComuns.module.css';
import { 
  TextField, 
  Button,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  CardActions,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Divider
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';

export default function ErrosComuns({ user }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    anuncios: [],
    expedicao: [],
    notasFiscais: []
  });
  const [filteredData, setFilteredData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTab, setCurrentTab] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [integracaoFilter, setIntegracaoFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const tabOptions = [
    { label: 'Anúncios', value: 'anuncios' },
    { label: 'Expedição', value: 'expedicao' },
    { label: 'Notas Fiscais', value: 'notasFiscais' }
  ];

  // Lista de integrações e tipos para filtros
  const [integracoes, setIntegracoes] = useState([]);
  const [tipos, setTipos] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/erros-comuns');
      if (!response.ok) {
        throw new Error('Falha ao carregar dados');
      }
      
      const result = await response.json();
      setData(result);
      
      // Processar dados para filtros
      const allIntegracoes = new Set();
      const allTipos = new Set();
      
      // Extrair integrações dos anúncios
      result.anuncios.forEach(item => {
        if (item.Integração) allIntegracoes.add(item.Integração);
        if (item.Tipo) allTipos.add(item.Tipo);
      });
      
      // Extrair integrações da expedição
      result.expedicao.forEach(item => {
        if (item.Logística) allIntegracoes.add(item.Logística);
        if (item.Tipo) allTipos.add(item.Tipo);
      });
      
      // Extrair tipos das notas fiscais
      result.notasFiscais.forEach(item => {
        if (item.Tipo) allTipos.add(item.Tipo);
      });
      
      setIntegracoes(Array.from(allIntegracoes).sort());
      setTipos(Array.from(allTipos).sort());
      
      // Inicializar dados filtrados com a primeira aba
      applyFilters(result, 0, '', '');
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const applyFilters = (dataToFilter = data, tab = currentTab, integracao = integracaoFilter, tipo = tipoFilter, query = searchQuery) => {
    const currentTabData = dataToFilter[tabOptions[tab].value] || [];
    
    let filtered = [...currentTabData];
    
    // Aplicar filtro de integração
    if (integracao) {
      if (tab === 0) { // Anúncios
        filtered = filtered.filter(item => item.Integração === integracao);
      } else if (tab === 1) { // Expedição
        filtered = filtered.filter(item => item.Logística === integracao);
      }
    }
    
    // Aplicar filtro de tipo
    if (tipo) {
      filtered = filtered.filter(item => item.Tipo === tipo);
    }
    
    // Aplicar filtro de busca
    if (query) {
      const searchLower = query.toLowerCase();
      filtered = filtered.filter(item => {
        // Anúncios
        if (tab === 0) {
          return (
            (item.Erro && item.Erro.toLowerCase().includes(searchLower)) ||
            (item.Solução && item.Solução.toLowerCase().includes(searchLower)) ||
            (item.Integração && item.Integração.toLowerCase().includes(searchLower))
          );
        }
        // Expedição
        else if (tab === 1) {
          return (
            (item.Erro && item.Erro.toLowerCase().includes(searchLower)) ||
            (item.Solução && item.Solução.toLowerCase().includes(searchLower)) ||
            (item.Logística && item.Logística.toLowerCase().includes(searchLower))
          );
        }
        // Notas Fiscais
        else {
          return (
            (item.Erro && item.Erro.toLowerCase().includes(searchLower)) ||
            (item.Solução && item.Solução.toLowerCase().includes(searchLower))
          );
        }
      });
    }
    
    setFilteredData(filtered);
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    // Resetar filtros ao mudar de aba
    setIntegracaoFilter('');
    setTipoFilter('');
    applyFilters(data, newValue, '', '', searchQuery);
  };

  const handleSearch = () => {
    applyFilters();
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    applyFilters(data, currentTab, integracaoFilter, tipoFilter, '');
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
    setSearchQuery('');
    applyFilters(data, currentTab, '', '', '');
  };

  const handleOpenModal = (item) => {
    setSelectedItem(item);
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

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <CircularProgress />
        <p>Carregando dados...</p>
      </div>
    );
  }

  const getIntegrationLabel = () => {
    return currentTab === 0 ? 'Integração' : currentTab === 1 ? 'Logística' : 'Tipo';
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Base de Conhecimento de Erros</h1>
        <p className={styles.pageDescription}>
          Esta ferramenta exibe erros comuns e suas soluções para anúncios, expedição e notas fiscais.
        </p>
      </div>

      <Tabs
        value={currentTab}
        onChange={handleTabChange}
        className={styles.tabs}
        variant="fullWidth"
      >
        <Tab label="Anúncios" />
        <Tab label="Expedição" />
        <Tab label="Notas Fiscais" />
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
              endAdornment: searchQuery ? (
                <IconButton size="small" onClick={handleClearSearch}>
                  <CloseIcon />
                </IconButton>
              ) : null,
            }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleSearch}
            startIcon={<SearchIcon />}
            className={styles.searchButton}
          >
            Buscar
          </Button>
          <Button
            variant="outlined"
            onClick={() => setShowFilters(!showFilters)}
            startIcon={<FilterListIcon />}
            className={styles.filterButton}
          >
            Filtros
          </Button>
        </div>

        {showFilters && (
          <div className={styles.filtersContainer}>
            <div className={styles.filterControls}>
              {currentTab !== 2 && (
                <FormControl variant="outlined" className={styles.filterSelect}>
                  <InputLabel>{getIntegrationLabel()}</InputLabel>
                  <Select
                    value={integracaoFilter}
                    onChange={(e) => {
                      setIntegracaoFilter(e.target.value);
                      applyFilters(data, currentTab, e.target.value, tipoFilter, searchQuery);
                    }}
                    label={getIntegrationLabel()}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {integracoes.map((integ) => (
                      <MenuItem key={integ} value={integ}>
                        {integ}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <FormControl variant="outlined" className={styles.filterSelect}>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={tipoFilter}
                  onChange={(e) => {
                    setTipoFilter(e.target.value);
                    applyFilters(data, currentTab, integracaoFilter, e.target.value, searchQuery);
                  }}
                  label="Tipo"
                >
                  <MenuItem value="">Todos</MenuItem>
                  {tipos.map((tipo) => (
                    <MenuItem key={tipo} value={tipo}>
                      {tipo}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant="outlined"
                color="secondary"
                onClick={resetFilters}
                className={styles.resetButton}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        )}

        <div className={styles.resultsInfo}>
          <p>
            {filteredData.length} {filteredData.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
          </p>
        </div>
      </div>

      <div className={styles.cardsContainer}>
        {filteredData.length > 0 ? (
          filteredData.map((item, index) => (
            <Card key={index} className={styles.card}>
              <CardContent>
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
                </div>
                
                <h3 className={styles.errorTitle}>{item.Erro}</h3>
              </CardContent>
              <CardActions className={styles.cardActions}>
                <Button 
                  variant="contained" 
                  size="small" 
                  color="primary"
                  startIcon={<VisibilityIcon />}
                  onClick={() => handleOpenModal(item)}
                >
                  Ver detalhes
                </Button>
              </CardActions>
            </Card>
          ))
        ) : (
          <div className={styles.noResults}>
            <p>Nenhum resultado encontrado com os filtros aplicados.</p>
            <Button variant="outlined" onClick={resetFilters}>
              Limpar Filtros
            </Button>
          </div>
        )}
      </div>

      {/* Modal com detalhes completos */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        className={styles.detailsDialog}
      >
        {selectedItem && (
          <>
            <DialogTitle className={styles.dialogTitle}>
              <div className={styles.dialogTitleContent}>
                <Typography variant="h6" component="h2">
                  {selectedItem.Erro}
                </Typography>
                <IconButton onClick={handleCloseModal}>
                  <CloseIcon />
                </IconButton>
              </div>
              <div className={styles.tagContainer}>
                <Chip 
                  label={getTabName()} 
                  color="primary" 
                  className={styles.sectionChip} 
                />
                {getIntegrationName(selectedItem) && (
                  <Chip 
                    label={getIntegrationName(selectedItem)} 
                    color="primary" 
                    variant="outlined" 
                    className={styles.integrationChip} 
                  />
                )}
                {selectedItem.Tipo && (
                  <Chip 
                    label={selectedItem.Tipo} 
                    color="secondary" 
                    variant="outlined" 
                    className={styles.typeChip} 
                  />
                )}
                <Chip 
                  icon={selectedItem.Revisado === 'TRUE' ? <CheckCircleIcon /> : <CancelIcon />}
                  label={selectedItem.Revisado === 'TRUE' ? 'Revisado' : 'Não revisado'} 
                  color={selectedItem.Revisado === 'TRUE' ? 'success' : 'warning'}
                  variant="outlined" 
                  className={styles.revisionChip} 
                />
              </div>
            </DialogTitle>
            <DialogContent dividers>
              <Box className={styles.solutionBox}>
                <div className={styles.solutionHeader}>
                  <Typography variant="subtitle1" component="h3" className={styles.sectionTitle}>
                    Solução
                  </Typography>
                  <Tooltip title="Copiar solução">
                    <IconButton 
                      onClick={() => handleCopyToClipboard(selectedItem.Solução)}
                      size="small"
                      className={styles.copyButton}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </div>
                <Box className={styles.solutionScrollbox}>
                  <Typography variant="body2" className={styles.solutionText}>
                    {selectedItem.Solução}
                  </Typography>
                </Box>
              </Box>

              {selectedItem.Observação && selectedItem.Observação.trim() !== '' && (
                <Box className={styles.observationBox}>
                  <Typography variant="subtitle1" component="h3" className={styles.sectionTitle}>
                    Observação
                  </Typography>
                  <Typography variant="body2" className={styles.observationText}>
                    {selectedItem.Observação}
                  </Typography>
                </Box>
              )}

              {selectedItem['Sugestões de melhoria'] && selectedItem['Sugestões de melhoria'].trim() !== '' && (
                <Box className={styles.suggestionBox}>
                  <Typography variant="subtitle1" component="h3" className={styles.sectionTitle}>
                    Sugestões de melhoria
                  </Typography>
                  <Typography variant="body2" className={styles.suggestionText}>
                    {selectedItem['Sugestões de melhoria']}
                  </Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button 
                onClick={() => handleCopyToClipboard(selectedItem.Solução)}
                variant="contained"
                startIcon={<ContentCopyIcon />}
              >
                Copiar Solução
              </Button>
              <Button onClick={handleCloseModal} variant="outlined">
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
        <Alert 
          onClose={handleCloseSnackbar} 
          severity="success" 
          variant="filled"
        >
          {copySuccess}
        </Alert>
      </Snackbar>
    </div>
  );
} 