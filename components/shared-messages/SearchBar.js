import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FaSearch, FaFilter, FaTimes } from 'react-icons/fa';
import Select from 'react-select';
import styles from '../../styles/SharedMessages.module.css';

const SearchBar = ({ searchTerm, setSearchTerm, selectedTags, setSelectedTags, availableTags }) => {
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const searchTimeout = useRef(null);
  const filterRef = useRef(null);

  // Atualizar o termo local quando o termo global muda
  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  // Limpar o timeout quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  // Fechar o filtro quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowTagFilter(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Função para lidar com a mudança no input de pesquisa
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalSearchTerm(value);
    
    // Debounce para evitar muitas chamadas enquanto o usuário digita
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      setSearchTerm(value);
    }, 300);
  };

  // Limpar a pesquisa
  const handleClearSearch = () => {
    setLocalSearchTerm('');
    setSearchTerm('');
  };

  // Configurações para o React-Select
  const customSelectStyles = {
    control: (provided) => ({
      ...provided,
      backgroundColor: 'var(--modals-inputs)',
      borderColor: 'var(--color-border)',
      boxShadow: 'none',
      '&:hover': { borderColor: 'var(--color-primary)' },
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: 'var(--box-color)',
      zIndex: 999,
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected 
        ? 'var(--color-primary)' 
        : state.isFocused 
          ? 'var(--box-color3)' 
          : 'var(--box-color)',
      color: state.isSelected ? 'white' : 'var(--text-color)',
      cursor: 'pointer',
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: 'var(--color-primary)',
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: 'white',
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: 'white',
      ':hover': {
        backgroundColor: 'var(--color-accent1)',
        color: 'white',
      },
    }),
    placeholder: (provided) => ({
      ...provided,
      color: 'var(--text-color2)',
    }),
    input: (provided) => ({
      ...provided,
      color: 'var(--text-color)',
    }),
  };

  return (
    <div className={styles.searchContainer}>
      <div className={styles.searchInputWrapper}>
        <FaSearch className={styles.searchIcon} aria-hidden="true" />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Buscar mensagens..."
          value={localSearchTerm}
          onChange={handleSearchChange}
          aria-label="Buscar mensagens"
        />
        {localSearchTerm && (
          <motion.button
            className={styles.clearSearchButton}
            onClick={handleClearSearch}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            aria-label="Limpar busca"
          >
            <FaTimes />
          </motion.button>
        )}
      </div>

      <div className={styles.filterContainer} ref={filterRef}>
        <motion.button
          className={`${styles.filterButton} ${showTagFilter ? styles.activeFilter : ''}`}
          onClick={() => setShowTagFilter(!showTagFilter)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-expanded={showTagFilter}
          aria-label="Filtrar por tags"
        >
          <FaFilter className={styles.filterIcon} />
          <span className={styles.filterLabel}>Filtrar</span>
          {selectedTags.length > 0 && (
            <span className={styles.filterBadge}>{selectedTags.length}</span>
          )}
        </motion.button>

        {showTagFilter && (
          <motion.div
            className={styles.tagFilterDropdown}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className={styles.tagFilterHeader}>
              <h3>Filtrar por tags</h3>
              {selectedTags.length > 0 && (
                <button 
                  className={styles.clearTagsButton}
                  onClick={() => setSelectedTags([])}
                >
                  Limpar filtros
                </button>
              )}
            </div>
            <Select
              isMulti
              options={availableTags}
              value={selectedTags}
              onChange={setSelectedTags}
              placeholder="Selecione tags para filtrar..."
              noOptionsMessage={() => "Nenhuma tag disponível"}
              className={styles.tagSelect}
              classNamePrefix="react-select"
              styles={customSelectStyles}
              aria-label="Filtrar por tags"
            />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SearchBar;