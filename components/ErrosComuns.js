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

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/erros-comuns');
      
      if (response.data) {
        // Extrair abas e dados
        const { abas, dados } = response.data;
        
        setAbas(abas);
        setData(dados);
        
        // Se temos abas disponíveis
        if (abas && abas.length > 0) {
          // Usar a primeira aba por padrão
          const primeiraAba = abas[0];
          const currentTabData = dados[primeiraAba] || [];
          
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
          (item.Observação && item.Observação.toLowerCase().includes(searchLower)) ||
          (item.Sugestões && item.Sugestões.toLowerCase().includes(searchLower))
        );
      });
    }
    
    setFilteredData(filteredItems);
  };

  useEffect(() => {
    if (abas && abas.length > 0 && data && Object.keys(data).length > 0) {
      const abaAtual = abas[currentTab];
      const currentItems = data[abaAtual] || [];
      
      applyFilters(currentItems, currentTab, tag1Filter, tag2Filter, filtroRevisao, searchQuery);
      extrairOpcoesDeTags(currentItems);
    }
  }, [currentTab, data, abas]);

  const extrairOpcoesDeTags = (items) => {
    if (!items || items.length === 0) return;

    // Extrair tags únicas (Tag1 e Tag2)
    const uniqueTags = {
      tag1: [...new Set(items.map(item => item.Tag1))].filter(Boolean).sort(),
      tag2: [...new Set(items.map(item => item.Tag2))].filter(Boolean).sort()
    };

    setTags(uniqueTags);
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    setTag1Filter('');
    setTag2Filter('');
    setSearchQuery('');
    setSearchActive(false);
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

  const handleTag1Change = (event) => {
    const valor = event.target.value;
    setTag1Filter(valor);
    const abaAtual = abas[currentTab];
    const currentItems = data[abaAtual] || [];
    applyFilters(currentItems, currentTab, valor, tag2Filter, filtroRevisao, searchQuery);
  };

  const handleTag2Change = (event) => {
    const valor = event.target.value;
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

  const renderFiltroTag1 = () => {
    if (!tags || !tags.tag1 || tags.tag1.length === 0) return null;
    
    return (
      <FormControl variant="outlined" size="small" className={styles.formControl}>
        <InputLabel id="tag1-select-label">Marcador 1</InputLabel>
        <Select
          labelId="tag1-select-label"
          id="tag1-select"
          value={tag1Filter}
          onChange={handleTag1Change}
          label="Marcador 1"
        >
          <MenuItem value="">
            <em>Todos</em>
          </MenuItem>
          {tags.tag1.map((tag) => (
            <MenuItem key={tag} value={tag}>{tag}</MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

  const renderFiltroTag2 = () => {
    if (!tags || !tags.tag2 || tags.tag2.length === 0) return null;
    
    return (
      <FormControl variant="outlined" size="small" className={styles.formControl}>
        <InputLabel id="tag2-select-label">Marcador 2</InputLabel>
        <Select
          labelId="tag2-select-label"
          id="tag2-select"
          value={tag2Filter}
          onChange={handleTag2Change}
          label="Marcador 2"
        >
          <MenuItem value="">
            <em>Todos</em>
          </MenuItem>
          {tags.tag2.map((tag) => (
            <MenuItem key={tag} value={tag}>{tag}</MenuItem>
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
        {item.Tag1 && (
          <Chip 
            label={item.Tag1} 
            color="primary" 
            variant="outlined" 
            className={styles.integrationChip} 
          />
        )}
        {item.Tag2 && (
          <Chip 
            label={item.Tag2} 
            color="secondary" 
            variant="outlined" 
            className={styles.typeChip} 
          />
        )}
        <Chip 
          icon={item.Revisado === 'Sim' ? <CheckCircleIcon /> : <CancelIcon />}
          label={item.Revisado === 'Sim' ? 'Revisado' : 'Não revisado'} 
          color={item.Revisado === 'Sim' ? 'success' : 'warning'}
          variant="outlined" 
          size="small"
          className={styles.revisaoChip} 
        />
      </div>
      
      <h3 className={styles.errorTitle}>{item.Erro}</h3>
      
      {item.Solução && (
        <Typography variant="body2" className={styles.cardPreview} noWrap>
          {item.Solução.substring(0, 120)}{item.Solução.length > 120 ? '...' : ''}
        </Typography>
      )}
      
      <div className={styles.cardActions}>
        <Button
          variant="outlined"
          color="primary"
          size="small"
          onClick={() => handleOpenModal(item)}
          startIcon={<VisibilityIcon />}
          className={styles.viewButton}
        >
          Ver mais
        </Button>
      </div>
    </div>
  );

  const renderModalContent = () => (
    <>
      <div className={styles.modalHeader}>
        <Typography variant="h6" component="h2" className={styles.modalTitle}>
          {modalData.Erro}
        </Typography>
        
        <div className={styles.modalChips}>
          {modalData.Tag1 && (
            <Chip 
              label={modalData.Tag1} 
              color="primary" 
              variant="outlined" 
              size="small"
              className={styles.modalChip}
            />
          )}
          {modalData.Tag2 && (
            <Chip 
              label={modalData.Tag2} 
              color="secondary" 
              variant="outlined" 
              size="small"
              className={styles.modalChip}
            />
          )}
          <Chip 
            icon={modalData.Revisado === 'Sim' ? <CheckCircleIcon /> : <CancelIcon />}
            label={modalData.Revisado === 'Sim' ? 'Revisado' : 'Não revisado'} 
            color={modalData.Revisado === 'Sim' ? 'success' : 'warning'}
            variant="outlined" 
            size="small"
          />
        </div>
      </div>

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

      {modalData.Sugestões && modalData.Sugestões.trim() !== '' && (
        <Box className={styles.suggestionBox}>
          <Typography variant="subtitle1" component="h3" className={styles.sectionTitle}>
            Sugestões de melhoria
          </Typography>
          <Typography variant="body2" className={styles.suggestionText}>
            {modalData.Sugestões}
          </Typography>
        </Box>
      )}
    </>
  );

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
          Esta ferramenta exibe erros comuns e suas soluções cadastradas na planilha.
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
                  {renderFiltroTag1()}
                  {renderFiltroTag2()}
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
            {filteredData.length > 0 ? (
              filteredData.map((item, index) => renderCard(item, index))
            ) : (
              <div className={styles.noResults}>
                <Typography variant="body1">
                  Nenhum resultado encontrado para os filtros selecionados.
                </Typography>
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