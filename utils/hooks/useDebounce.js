import { useState, useEffect } from 'react';

/**
 * Hook personalizado para debounce
 * @param {any} value - Valor a ser debounced
 * @param {number} delay - Delay em millisegundos
 * @returns {any} - Valor debounced
 */
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Atualizar o valor debounced após o delay especificado
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function para cancelar o timeout se value mudar
    // antes do delay ou se o componente desmontar
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook para busca em tempo real com estado de loading
 * @param {string} query - Query de busca
 * @param {number} delay - Delay do debounce (padrão: 300ms)
 * @returns {object} - { debouncedQuery, isSearching }
 */
export function useSearchDebounce(query, delay = 300) {
  const [isSearching, setIsSearching] = useState(false);
  const debouncedQuery = useDebounce(query, delay);

  useEffect(() => {
    // Se a query mudou e não é vazia, mostrar estado de busca
    if (query && query !== debouncedQuery) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [query, debouncedQuery]);

  return { debouncedQuery, isSearching };
}