// hooks/validador-ml/useKeyboardNavigation.js
import { useState, useEffect, useCallback } from 'react';

export const useKeyboardNavigation = (suggestions, onSelect) => {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const handleKeyDown = useCallback((event) => {
    if (!suggestions.length) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : prev
        );
        break;

      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0) {
          onSelect(suggestions[highlightedIndex].id);
        }
        break;

      case 'Escape':
        setHighlightedIndex(-1);
        break;
    }
  }, [suggestions, highlightedIndex, onSelect]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (suggestions.length === 0) {
      setHighlightedIndex(-1);
    }
  }, [suggestions]);

  return {
    highlightedIndex,
    setHighlightedIndex
  };
};