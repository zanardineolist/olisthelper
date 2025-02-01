// components/CategoryValidator/index.js
import { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  CardContent, 
  TextField, 
  InputAdornment,
  CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { debounce } from 'lodash';
import { CategoryCache } from './services/storage';
import CategoryDetails from './components/CategoryDetails';
import VariationModal from './components/VariationModal';
import { LoadingOverlay, StatusMessage, NoResults } from './components';
import styles from './styles.module.css';

const cache = new CategoryCache();

export default function CategoryValidator() {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ message: '', type: 'info' });
  const [selectedVariation, setSelectedVariation] = useState(null);

  useEffect(() => {
    cache.clearOldCache();
  }, []);

  const showStatus = (message, type = 'info') => {
    setStatus({ message, type });
    setTimeout(() => setStatus({ message: '', type: 'info' }), 3000);
  };

  const fetchSuggestions = async (term) => {
    if (!term) {
      setSuggestions([]);
      return;
    }

    try {
      setLoading(true);
      const cachedResults = cache.searchCategories(term);
      
      if (cachedResults.length > 0) {
        setSuggestions(cachedResults);
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/category-validator/suggestions?query=${encodeURIComponent(term)}`);
      const data = await res.json();
      
      if (res.ok) {
        setSuggestions(data.suggestions || []);
        data.suggestions?.forEach(category => cache.saveCategory(category));
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      console.error('Erro ao buscar sugestões:', err);
      showStatus('Erro ao buscar sugestões', 'error');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = useCallback(debounce(fetchSuggestions, 300), []);

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  const handleCategorySelect = async (categoryId) => {
    try {
      setSuggestions([]);
      setSearchTerm(categoryId);
      setLoading(true);

      const cachedCategory = cache.getCategory(categoryId);
      if (cachedCategory) {
        setSelectedCategory(cachedCategory);
        showStatus('Dados carregados do cache', 'success');
        return;
      }

      const res = await fetch(`/api/category-validator/details?categoryId=${categoryId}`);
      const data = await res.json();
      
      if (res.ok) {
        setSelectedCategory(data);
        cache.saveCategory(data);
        showStatus('Dados atualizados com sucesso', 'success');
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      showStatus(err.message || 'Erro ao carregar detalhes da categoria', 'error');
      setSelectedCategory(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {status.message && (
        <StatusMessage
          message={status.message}
          type={status.type}
          onClose={() => setStatus({ message: '', type: 'info' })}
        />
      )}

      <div className={styles.inputContainer}>
        <SearchIcon className={styles.searchIcon} />
        <TextField
          fullWidth
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="Pesquise pelo ID ou nome da categoria (ex: MLB270227)"
          variant="outlined"
          className={styles.searchField}
          InputProps={{
            className: styles.searchInput,
            endAdornment: loading && (
              <InputAdornment position="end">
                <CircularProgress size={20} />
              </InputAdornment>
            )
          }}
        />
        {suggestions.length > 0 && (
          <div className={styles.suggestionsContainer}>
            <p className={styles.suggestionsInfo}>
              {suggestions.length} categorias encontradas
            </p>
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={styles.suggestionItem}
                onClick={() => handleCategorySelect(suggestion.id)}
              >
                <strong>{suggestion.hierarquia_completa}</strong>
                <span className={styles.suggestionId}>ID: {suggestion.id}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedCategory && (
        <CategoryDetails 
          category={selectedCategory}
          onClose={() => setSelectedCategory(null)}
          onVariationClick={setSelectedVariation}
        />
      )}

      {selectedVariation && (
        <VariationModal
          variation={selectedVariation}
          open={!!selectedVariation}
          onClose={() => setSelectedVariation(null)}
        />
      )}

      {loading && !suggestions.length && <LoadingOverlay />}
    </div>
  );
}