// components/CategoryValidator/index.js
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, TextField } from '@mui/material';
import { debounce } from 'lodash';
import { CategoryCache } from './services/indexedDB';
import { LoadingOverlay, StatusMessage, NoResults } from './components';
import CategoryDetails from './components/CategoryDetails';
import VariationModal from './components/VariationModal';
import styles from './styles.module.css';

const cache = new CategoryCache();

export default function CategoryValidator() {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ message: '', type: 'info' });
  const [selectedVariation, setSelectedVariation] = useState(null);

  // Limpa cache antigo ao montar o componente
  useEffect(() => {
    cache.clearOldCache();
  }, []);

  // Função para mostrar mensagem de status temporária
  const showStatus = (message, type = 'info') => {
    setStatus({ message, type });
    setTimeout(() => setStatus({ message: '', type: 'info' }), 3000);
  };

  // Busca categoria no cache ou na API
  const fetchCategoryDetails = async (categoryId) => {
    try {
      setLoading(true);
      
      // Tenta buscar do cache primeiro
      const cachedCategory = await cache.getCategory(categoryId);
      if (cachedCategory) {
        setSelectedCategory(cachedCategory);
        showStatus('Dados carregados do cache', 'success');
        return;
      }

      // Se não estiver no cache, busca da API
      const res = await fetch(`/api/category-validator/details?categoryId=${categoryId}`);
      const data = await res.json();
      
      if (res.ok) {
        setSelectedCategory(data);
        // Salva no cache
        await cache.saveCategory(data);
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

  // Busca sugestões com debounce
  const debouncedSearch = useCallback(
    debounce(async (term) => {
      if (!term) {
        setSuggestions([]);
        return;
      }

      try {
        setLoading(true);
        
        // Tenta buscar sugestões do cache primeiro
        const cachedResults = await cache.searchCategories(term);
        if (cachedResults.length > 0) {
          setSuggestions(cachedResults);
          return;
        }

        // Se não encontrar no cache, busca da API
        const res = await fetch(`/api/category-validator/suggestions?query=${encodeURIComponent(term)}`);
        const data = await res.json();
        
        if (res.ok) {
          setSuggestions(data.suggestions);
          // Salva resultados no cache
          data.suggestions.forEach(category => cache.saveCategory(category));
        } else {
          throw new Error(data.message);
        }
      } catch (err) {
        showStatus('Erro ao buscar sugestões', 'error');
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  // Handle search input change
  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  // Handle category selection
  const handleCategorySelect = async (categoryId) => {
    setSuggestions([]);
    setSearchTerm(categoryId);
    await fetchCategoryDetails(categoryId);
  };

  // Handle variation click
  const handleVariationClick = (variation) => {
    setSelectedVariation(variation);
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

      <Card className={styles.searchCard}>
        <CardContent>
          <div className={styles.searchContainer}>
            <TextField
              fullWidth
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Pesquise pelo ID ou nome da categoria (ex: MLB270227)"
              variant="outlined"
              InputProps={{
                className: styles.searchInput
              }}
              disabled={loading}
            />
          </div>

          {suggestions.length > 0 && (
            <div className={`${styles.suggestionsList} ${styles.fadeIn}`}>
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={styles.suggestionItem}
                  onClick={() => handleCategorySelect(suggestion.id)}
                >
                  <strong>{suggestion.hierarquia_completa}</strong>
                  <span className={styles.categoryId}>ID: {suggestion.id}</span>
                </div>
              ))}
            </div>
          )}

          {!loading && suggestions.length === 0 && searchTerm && (
            <NoResults />
          )}
        </CardContent>
      </Card>

      {selectedCategory && (
        <div className={styles.slideIn}>
          <CategoryDetails 
            category={selectedCategory} 
            onClose={() => setSelectedCategory(null)}
            onVariationClick={handleVariationClick}
          />
        </div>
      )}

      {selectedVariation && (
        <VariationModal
          variation={selectedVariation}
          open={!!selectedVariation}
          onClose={() => setSelectedVariation(null)}
        />
      )}

      {loading && <LoadingOverlay />}
    </div>
  );
}