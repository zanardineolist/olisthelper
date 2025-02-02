// components/validador-ml/ValidadorML.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { SearchBar } from './SearchBar';
import { Suggestions } from './Suggestions';
import { ValidationGrid } from './ValidationGrid';
import { VariationsList } from './VariationsList';
import { RequiredAttributes } from './RequiredAttributes';
import { useDebounce } from '../../hooks/validador-ml/useDebounce';
import { categoryCache } from '../../utils/validador-ml/categoryCache';
import { categoryHelpers } from '../../utils/validador-ml/categoryHelpers';
import styles from '../../styles/ValidadorML.module.css';

const ValidadorML = ({ user }) => {
  const [currentQuery, setCurrentQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [categoryDetails, setCategoryDetails] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  const debouncedQuery = useDebounce(currentQuery, 300);

  useEffect(() => {
    const initializeComponent = async () => {
      await carregarCategoriasUltimoNivelComCache();
    };
    initializeComponent();
  }, []);

  useEffect(() => {
    if (debouncedQuery.length >= 3) {
      handleSearchSuggestions(debouncedQuery);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedQuery]);

  const carregarCategoriasUltimoNivelComCache = async () => {
    const cachedCategories = categoryCache.getCategories();
    if (cachedCategories) {
      return cachedCategories;
    }

    try {
      const { data, error } = await supabase
        .from('ml_categories')
        .select('*')
        .eq('is_ultimo_nivel', true);

      if (error) throw error;

      if (data?.length > 0) {
        categoryCache.setCategories(data);
      }
      return data || [];
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      return [];
    }
  };

  const handleSearch = async (query = currentQuery) => {
    if (!query) return;
    
    setIsLoading(true);
    setShowSuggestions(false);
    
    try {
      const cachedDetails = categoryCache.getCategoryDetails(query);
      if (cachedDetails) {
        setCategoryDetails(cachedDetails);
      } else {
        const response = await fetch(`/api/validador-ml/pesquisar-categoria?categoriaId=${query}`);
        const data = await response.json();
        
        if (response.ok) {
          setCategoryDetails(data);
          categoryCache.setCategoryDetails(query, data);
        } else {
          throw new Error(data.mensagemErro || 'Erro ao buscar categoria');
        }
      }
    } catch (error) {
      console.error('Erro na pesquisa:', error);
      // Aqui você pode adicionar um toast ou notificação de erro
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSuggestions = async (query, page = 0) => {
    if (!query || query.length < 3) return;
    
    setIsLoading(true);
    try {
      const result = await categoryHelpers.searchCategories(query, page, 20);
      
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
  };

  const handleSuggestionSelect = async (categoryId) => {
    setCurrentQuery(categoryId);
    setShowSuggestions(false);
    await handleSearch(categoryId);
  };

  const handleInputChange = (value) => {
    setCurrentQuery(value);
    setCurrentPage(0);
  };

  const loadMoreSuggestions = () => {
    if (!hasMore || isLoading) return;
    const nextPage = currentPage + 1;
    handleSearchSuggestions(currentQuery, nextPage);
  };

  return (
    <Card className={styles.mainContainer}>
      <CardContent>
        <SearchBar
          value={currentQuery}
          onChange={handleInputChange}
          onSearch={() => handleSearch()}
          loading={isLoading}
        />

        {showSuggestions && (
          <Suggestions
            suggestions={suggestions}
            onSelect={handleSuggestionSelect}
            totalCount={totalResults}
            onLoadMore={loadMoreSuggestions}
            hasMore={hasMore}
            loading={isLoading}
          />
        )}

        {categoryDetails && (
          <div className={styles.detailsContainer}>
            <div className={styles.categoryHeader}>
              <h2>{categoryDetails.hierarquia_completa}</h2>
              <span className={`${styles.badge} ${categoryDetails.status === 'enabled' ? styles.badgeSuccess : styles.badgeDanger}`}>
                {categoryDetails.status === 'enabled' ? 'Ativa' : 'Desativada'}
              </span>
            </div>

            <ValidationGrid details={categoryDetails} />

            {categoryDetails.variacoes?.length > 0 && (
              <VariationsList variations={categoryDetails.variacoes} />
            )}

            <RequiredAttributes 
              attributes={categoryDetails.cardsHtml ? 
                processAttributesData(categoryDetails.cardsHtml) : 
                []
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const processAttributesData = (cardsHtml) => {
  if (!cardsHtml) return [];
  
  // Criar um parser temporário
  const parser = new DOMParser();
  const doc = parser.parseFromString(cardsHtml, 'text/html');
  
  // Extrair os dados dos cards
  const cards = doc.querySelectorAll('.card');
  const attributes = [];
  
  cards.forEach(card => {
    const title = card.querySelector('h2')?.textContent;
    const detailsContent = card.querySelector('.details pre')?.textContent;
    
    try {
      if (detailsContent) {
        const attributeData = JSON.parse(detailsContent);
        attributes.push(attributeData);
      }
    } catch (error) {
      console.error('Erro ao processar atributo:', error);
    }
  });
  
  return attributes;
};

export default ValidadorML;