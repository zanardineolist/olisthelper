// hooks/validador-ml/useKeyboardNavigation.js
import { useState, useEffect, useCallback } from 'react';

export const useKeyboardNavigation = (suggestions, onSelect, showSuggestions) => {
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const handleKeyDown = useCallback((event) => {
    if (!showSuggestions || !suggestions.length) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0) {
          onSelect(suggestions[selectedIndex].id);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setSelectedIndex(-1);
        break;
    }
  }, [suggestions, selectedIndex, onSelect, showSuggestions]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

  return [selectedIndex, setSelectedIndex];
};