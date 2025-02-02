// components/validador-ml/ValidadorML.js
import React, { useState, useEffect } from 'react';
import { SearchBar } from './SearchBar';
import { Suggestions } from './Suggestions';
import { CategoryDetails } from './CategoryDetails';
import { useDebounce } from '../../hooks/validador-ml/useDebounce';
import { useKeyboardNavigation } from '../../hooks/validador-ml/useKeyboardNavigation';
import { categoryCache } from '../../utils/validador-ml/cache';
import { categoryApi } from '../../utils/validador-ml/api';
import styles from '../../styles/ValidadorML.module.css';

const ValidadorML = ({ user }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [categoryDetails, setCategoryDetails] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const initializeComponent = async () => {
      const cachedCategories = categoryCache.getCategories();
      if (cachedCategories) {
        setSuggestions(cachedCategories);
      }
    };

    initializeComponent();
  }, []);

  useEffect(() => {
    if (debouncedQuery.length >= 3) {
      searchCategories(debouncedQuery);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedQuery]);

  const [selectedSuggestionIndex] = useKeyboardNavigation(
    suggestions,
    handleSuggestionSelect,
    showSuggestions
  );

  async function searchCategories(searchQuery, page = 0) {
    if (!searchQuery || searchQuery.length < 3) return;
    
    setIsLoading(true);
    try {
      const result = await categoryApi.searchCategories(searchQuery, page);
      
      if (page === 0) {
        setSuggestions(result.categories);
      } else {
        setSuggestions(prev => [...prev, ...result.categories]);
      }
      
      setTotalResults(result.total);
      setHasMore(result.hasMore);
      setShowSuggestions(true);
      setCurrentPage(page);
    } catch (error) {
      console.error('Erro ao buscar sugestões:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSearch(categoryId = query) {
    if (!categoryId) return;
    
    setIsLoading(true);
    setShowSuggestions(false);
    
    try {
      // Primeiro tenta buscar do cache
      const cachedDetails = categoryCache.getCategoryDetails(categoryId);
      if (cachedDetails) {
        setCategoryDetails(cachedDetails);
        return;
      }

      // Se não estiver no cache, busca da API
      const details = await categoryApi.getCategoryDetails(categoryId);
      if (details) {
        setCategoryDetails(details);
        categoryCache.setCategoryDetails(categoryId, details);
      }
    } catch (error) {
      console.error('Erro na pesquisa:', error);
      // Aqui você pode adicionar uma notificação de erro usando o sistema do Olist Helper
    } finally {
      setIsLoading(false);
    }
  }

  function handleSuggestionSelect(categoryId) {
    setQuery(categoryId);
    setShowSuggestions(false);
    handleSearch(categoryId);
  }

  function handleLoadMore() {
    if (!hasMore || isLoading) return;
    const nextPage = currentPage + 1;
    searchCategories(query, nextPage);
  }

  return (
    <div className={styles.container}>
      <SearchBar
        value={query}
        onChange={setQuery}
        onSearch={() => handleSearch()}
        loading={isLoading}
      />

      {showSuggestions && (
        <Suggestions
          suggestions={suggestions}
          onSelect={handleSuggestionSelect}
          totalCount={totalResults}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          loading={isLoading}
          selectedIndex={selectedSuggestionIndex}
        />
      )}

      {categoryDetails && (
        <CategoryDetails details={categoryDetails} />
      )}
    </div>
  );
};

export default ValidadorML;