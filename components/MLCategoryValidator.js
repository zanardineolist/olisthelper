import React, { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from 'lodash';
import { mlServices } from '../services/mlServices';
import { mlUtils } from '../utils/mlUtils';
import styles from '../styles/MLValidator.module.css';

const MLCategoryValidator = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryDetails, setCategoryDetails] = useState(null);
  const [error, setError] = useState(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchCategories = useCallback(
    debounce(async (searchQuery) => {
      if (!searchQuery.trim()) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const cachedResults = mlUtils.getCache(`search_${searchQuery}`);
        if (cachedResults) {
          setSuggestions(cachedResults);
          setLoading(false);
          return;
        }

        const results = await mlServices.searchCategories(searchQuery);
        mlUtils.setCache(`search_${searchQuery}`, results);
        setSuggestions(results);
      } catch (err) {
        setError('Erro ao buscar categorias');
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  const loadCategoryDetails = async (categoryId) => {
    setLoading(true);
    setError(null);

    try {
      const cachedDetails = mlUtils.getCache(`details_${categoryId}`);
      if (cachedDetails) {
        setCategoryDetails(cachedDetails);
        setLoading(false);
        return;
      }

      const details = await mlServices.getCategoryDetails(categoryId);
      const variations = await mlServices.getCategoryVariations(categoryId);
      
      const fullDetails = {
        ...details,
        variations,
        parsedSpecs: mlUtils.parseTechnicalSpecs(details.technicalSpecs)
      };

      mlUtils.setCache(`details_${categoryId}`, fullDetails);
      setCategoryDetails(fullDetails);
    } catch (err) {
      setError('Erro ao carregar detalhes da categoria');
      setCategoryDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    searchCategories(value);
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setQuery(category.id);
    setSuggestions([]);
    loadCategoryDetails(category.id);
  };

  return (
    <div className={styles.container}>
      <div className={styles.searchContainer}>
        <input
          type="text"
          className={styles.searchInput}
          value={query}
          onChange={handleInputChange}
          placeholder="Busque por ID ou nome da categoria (ex: MLB270227)"
        />
        {loading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner} />
          </div>
        )}
        {suggestions.length > 0 && (
          <div className={styles.suggestionsContainer} ref={suggestionsRef}>
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={styles.suggestionItem}
                onClick={() => handleCategorySelect(suggestion)}
              >
                <div className={styles.suggestionTitle}>
                  {suggestion.hierarchy_complete}
                </div>
                <div className={styles.suggestionInfo}>
                  ID: {suggestion.id} | Último Nível: {suggestion.is_last_level ? 'Sim' : 'Não'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {categoryDetails && (
        <div className={styles.detailsContainer}>
          <div className={styles.detailsHeader}>
            <h2 className={styles.detailsTitle}>
              {categoryDetails.category.hierarchy_complete}
            </h2>
            <div className={`${styles.statusBadge} ${styles[mlUtils.formatStatus(categoryDetails.category.status).color]}`}>
              {mlUtils.formatStatus(categoryDetails.category.status).label}
            </div>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Último Nível</div>
              <div className={styles.infoValue}>
                {categoryDetails.category.is_last_level ? 'Sim' : 'Não'}
              </div>
            </div>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Comprimento Máx. Título</div>
              <div className={styles.infoValue}>
                {categoryDetails.category.max_title_length || 'N/A'}
              </div>
            </div>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Máx. Fotos por Item</div>
              <div className={styles.infoValue}>
                {categoryDetails.category.max_pictures_per_item || 'N/A'}
              </div>
            </div>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Preço Mínimo</div>
              <div className={styles.infoValue}>
                {mlUtils.formatCurrency(categoryDetails.category.minimum_price)}
              </div>
            </div>
          </div>

          <div className={styles.attributesSection}>
            <h3 className={styles.attributesTitle}>Atributos Obrigatórios</h3>
            <div className={styles.attributesList}>
              {categoryDetails.parsedSpecs.requiredAttributes.map((attr) => (
                <div key={attr.id} className={styles.attributeCard}>
                  <div className={styles.attributeName}>{attr.name}</div>
                  <div className={styles.attributeDetails}>
                    <div>Grupo: {attr.group}</div>
                    <div>Tipo: {attr.type}</div>
                    {attr.values.length > 0 && (
                      <div>
                        Valores permitidos: {attr.values.length}
                        <button 
                          onClick={() => window.alert(JSON.stringify(attr.values, null, 2))}
                          className={styles.viewValuesButton}
                        >
                          Ver valores
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {categoryDetails.variations.length > 0 && (
            <div className={styles.attributesSection}>
              <h3 className={styles.attributesTitle}>Variações Permitidas</h3>
              <div className={styles.attributesList}>
                {categoryDetails.variations.map((variation) => (
                  <div key={variation.id} className={styles.attributeCard}>
                    <div className={styles.attributeName}>{variation.name}</div>
                    <div className={styles.attributeDetails}>
                      <div>ID: {variation.id}</div>
                      <div>Tipo: {variation.value_type}</div>
                      {variation.values && (
                        <button 
                          onClick={() => window.alert(JSON.stringify(variation.values, null, 2))}
                          className={styles.viewValuesButton}
                        >
                          Ver valores permitidos
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MLCategoryValidator;