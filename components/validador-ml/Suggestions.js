// components/validador-ml/Suggestions.js
import React from 'react';
import { useKeyboardNavigation } from '../../hooks/validador-ml/useKeyboardNavigation';
import { useInfiniteScroll } from '../../hooks/validador-ml/useInfiniteScroll';
import styles from '../../styles/ValidadorML.module.css';

export const Suggestions = ({ 
  suggestions, 
  onSelect, 
  totalCount, 
  onLoadMore,
  hasMore,
  loading 
}) => {
  const { highlightedIndex, setHighlightedIndex } = useKeyboardNavigation(
    suggestions,
    onSelect
  );

  const containerRef = useInfiniteScroll(onLoadMore, hasMore, loading);

  return (
    <div className={styles.suggestionsContainer}>
      <p className={styles.suggestionsInfo}>{totalCount} categorias encontradas</p>
      
      {suggestions.map((suggestion, index) => (
        <div
          key={suggestion.id}
          className={`${styles.suggestionItem} ${
            index === highlightedIndex ? styles.highlighted : ''
          }`}
          onClick={() => onSelect(suggestion.id)}
          onMouseEnter={() => setHighlightedIndex(index)}
          onMouseLeave={() => setHighlightedIndex(-1)}
        >
          <strong className={styles.suggestionTitle}>
            {suggestion.hierarquia_completa}
          </strong>
          <span className={styles.suggestionId}>
            ID: {suggestion.id} | Último Nível: {suggestion.is_ultimo_nivel ? 'Sim' : 'Não'}
          </span>
        </div>
      ))}

      {hasMore && (
        <div ref={containerRef} className={styles.loadingMore}>
          {loading && (
            <div className={styles.spinnerContainer}>
              <div className={styles.spinner} />
              <span>Carregando mais categorias...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};