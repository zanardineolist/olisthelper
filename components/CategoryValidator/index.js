// components/CategoryValidator/index.js
import { useState, useEffect, useCallback } from 'react';
import { SearchIcon } from 'lucide-react';
import { debounce } from 'lodash';
import { CategoryCache } from './services/storage';
import styles from './styles.module.css';

const cache = new CategoryCache();

export default function CategoryValidator() {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [errorMessage, setErrorMessage] = useState('');
  const [variationPopup, setVariationPopup] = useState(null);

  const fetchSuggestions = async (query) => {
    if (!query) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      
      // Tenta buscar do cache primeiro
      const cachedResults = cache.searchCategories(query);
      if (cachedResults.length > 0) {
        setSuggestions(cachedResults);
        setShowSuggestions(true);
        return;
      }

      const res = await fetch(`/api/category-validator/suggestions?query=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (res.ok) {
        setSuggestions(data.suggestions);
        data.suggestions.forEach(category => cache.saveCategory(category));
      } else {
        throw new Error(data.message);
      }
      setShowSuggestions(true);
    } catch (error) {
      setErrorMessage('Erro ao buscar sugestões');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const debouncedFetch = useCallback(
    debounce(fetchSuggestions, 300),
    []
  );

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCurrentIndex(-1);
    debouncedFetch(value);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setCurrentIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setCurrentIndex(prev => 
          prev > 0 ? prev - 1 : prev
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (currentIndex >= 0) {
          handleCategorySelect(suggestions[currentIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const handleCategorySelect = async (category) => {
    setSearchTerm(category.id);
    setShowSuggestions(false);
    await fetchCategoryDetails(category.id);
  };

  const fetchCategoryDetails = async (categoryId) => {
    try {
      setLoading(true);
      setErrorMessage('');

      // Tenta buscar do cache primeiro
      const cachedCategory = cache.getCategory(categoryId);
      if (cachedCategory) {
        setSelectedCategory(cachedCategory);
        return;
      }

      const res = await fetch(`/api/category-validator/details?categoryId=${categoryId}`);
      const data = await res.json();

      if (res.ok) {
        setSelectedCategory(data);
        cache.saveCategory(data);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      setErrorMessage('Erro ao carregar detalhes da categoria');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cache.clearOldCache();

    const handleClickOutside = (e) => {
      if (!e.target.closest(`.${styles.inputContainer}`)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const renderCategoryDetails = () => {
    if (!selectedCategory) return null;

    return (
      <>
        <div className={styles.categoryInfo}>
          Estrutura: {selectedCategory.id} - {selectedCategory.hierarquia_completa}
          <span className={`${styles.badge} ${selectedCategory.status === 'enabled' ? styles.badgeSuccess : styles.badgeError}`}>
            {selectedCategory.status === 'enabled' ? 'Ativa' : 'Desativada'}
          </span>
        </div>

        <div className={styles.detailsContainer}>
          <h3>Especificações da Categoria</h3>
          <div className={styles.detailsGrid}>
            <div className={styles.detailsItem}>
              <p className={styles.title}>Último Nível:</p>
              <p className={styles.value}>{selectedCategory.is_ultimo_nivel ? 'Sim' : 'Não'}</p>
            </div>
            <div className={styles.detailsItem}>
              <p className={styles.title}>Comprimento Máx. Descrição:</p>
              <p className={styles.value}>{selectedCategory.max_description_length || 'Não especificado'}</p>
            </div>
            <div className={styles.detailsItem}>
              <p className={styles.title}>Máx. Fotos por Item:</p>
              <p className={styles.value}>{selectedCategory.max_pictures_per_item || 'Não especificado'}</p>
            </div>
            <div className={styles.detailsItem}>
              <p className={styles.title}>Máx. Fotos por Variação:</p>
              <p className={styles.value}>{selectedCategory.max_pictures_per_item_var || 'Não especificado'}</p>
            </div>
            <div className={styles.detailsItem}>
              <p className={styles.title}>Comprimento Máx. Título:</p>
              <p className={styles.value}>{selectedCategory.max_title_length || 'Não especificado'}</p>
            </div>
            <div className={styles.detailsItem}>
              <p className={styles.title}>Máx. Variações Permitidas:</p>
              <p className={styles.value}>{selectedCategory.max_variations_allowed || 'Não especificado'}</p>
            </div>
            <div className={styles.detailsItem}>
              <p className={styles.title}>Preço Mínimo:</p>
              <p className={styles.value}>{`${selectedCategory.minimum_price || 'N/A'} ${selectedCategory.minimum_price_currency || ''}`}</p>
            </div>
            <div className={styles.detailsItem}>
              <p className={styles.title}>Estoque:</p>
              <p className={styles.value}>{selectedCategory.stock === 'required' ? 'Obrigatório' : 'Opcional'}</p>
            </div>
          </div>
        </div>

        {selectedCategory.variacoes && selectedCategory.variacoes.length > 0 && (
          <div className={styles.variationsContainer}>
            <strong>Variações: </strong>
            {selectedCategory.variacoes.map((variacao) => (
              <span
                key={variacao.id}
                className={styles.variationTag}
                onClick={() => setVariationPopup(variacao)}
              >
                {variacao.name}
              </span>
            ))}
          </div>
        )}

        {errorMessage && <div className={styles.error}>{errorMessage}</div>}
      </>
    );
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        Validador de categoria <span>Mercado Livre</span>
      </h1>

      <div className={styles.inputContainer}>
        <SearchIcon className={styles.searchIcon} size={20} />
        <input
          type="text"
          className={styles.searchInput}
          value={searchTerm}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Pesquise pelo ID ou nome da categoria (ex: MLB270227)"
        />
        {loading && <div className={styles.spinner} />}

        {showSuggestions && suggestions.length > 0 && (
          <div className={styles.suggestionsContainer}>
            <p className={styles.suggestionsInfo}>
              {suggestions.length} categorias encontradas
            </p>
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.id}
                className={`${styles.suggestionItem} ${index === currentIndex ? styles.active : ''}`}
                onClick={() => handleCategorySelect(suggestion)}
                onMouseEnter={() => setCurrentIndex(index)}
              >
                <strong>{suggestion.hierarquia_completa}</strong>
                <span>
                  ID: {suggestion.id} | Último Nível: {suggestion.is_ultimo_nivel ? 'Sim' : 'Não'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {renderCategoryDetails()}

      {selectedCategory?.attributes && (
        <RequiredAttributes attributes={selectedCategory.attributes} />
      )}

      {variationPopup && (
        <>
          <div className={styles.overlay} onClick={() => setVariationPopup(null)} />
          <div className={styles.modal}>
            <button 
              className={styles.closeButton}
              onClick={() => setVariationPopup(null)}
            >
              Fechar
            </button>
            <div className={styles.modalHeader}>
              Valores aceitos de: {variationPopup.name}
            </div>
            <div className={styles.modalContent}>
              {variationPopup.values && variationPopup.values.length > 0 ? (
                variationPopup.values.map((value, index) => (
                  <p key={index}>{value.name}</p>
                ))
              ) : (
                <p>Nenhum valor disponível para essa variação.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}