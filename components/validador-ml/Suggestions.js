// components/validador-ml/Suggestions.js
import React, { useRef } from 'react';
import { useInfiniteScroll } from '../../hooks/validador-ml/useInfiniteScroll';
import styles from '../../styles/ValidadorML.module.css';

export const Suggestions = ({
  suggestions,
  onSelect,
  totalCount,
  onLoadMore,
  hasMore,
  loading,
  selectedIndex
}) => {
  const containerRef = useRef(null);
  useInfiniteScroll(containerRef, onLoadMore, hasMore, loading);

  return (
    <div className={styles.suggestionsContainer} ref={containerRef}>
      <p className={styles.suggestionsInfo}>{totalCount} categorias encontradas</p>
      {suggestions.map((suggestion, index) => (
        <div
          key={suggestion.id}
          className={`${styles.suggestionItem} ${
            index === selectedIndex ? styles.highlighted : ''
          }`}
          onClick={() => onSelect(suggestion.id)}
        >
          <span className={styles.suggestionId}>{suggestion.id}</span>
          <span className={styles.suggestionPath}>{suggestion.hierarquia_completa}</span>
        </div>
      ))}
      {loading && hasMore && (
        <div className={styles.loadingMore}>
          <div className={styles.spinner} />
          <span>Carregando mais...</span>
        </div>
      )}
    </div>
  );
};
