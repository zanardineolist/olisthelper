import React from 'react';
import Select from 'react-select';
import { FaSearch } from 'react-icons/fa';
import styles from '../../styles/SharedMessages.module.css';

const SearchBar = ({ searchTerm, setSearchTerm, selectedTags, setSelectedTags, availableTags }) => {
  // Estilos customizados para o React-Select
  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: 'var(--modals-inputs)',
      borderColor: state.isFocused ? 'var(--color-primary)' : 'var(--color-border)',
      color: 'var(--text-color)',
      boxShadow: state.isFocused ? `0 0 0 1px var(--color-primary)` : 'none',
      '&:hover': {
        borderColor: 'var(--color-primary)'
      },
      height: '46px'
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: 'var(--modals-inputs)',
      zIndex: 10
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused ? 'var(--color-trodd)' : 'var(--box-color)',
      color: 'var(--text-color)'
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: 'var(--color-primary)',
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: 'var(--color-white)',
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: 'var(--color-white)',
      '&:hover': {
        backgroundColor: 'var(--color-primary-hover)',
        color: 'var(--color-white)',
      }
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
        <FaSearch className={styles.searchIcon} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar mensagens..."
          className={styles.searchInput}
          aria-label="Buscar mensagens por texto"
        />
      </div>
      
      <Select
        isMulti
        options={availableTags}
        value={selectedTags}
        onChange={setSelectedTags}
        placeholder="Filtrar por tags..."
        styles={customSelectStyles}
        className={styles.tagSelect}
        aria-label="Filtrar mensagens por tags"
        noOptionsMessage={() => "Nenhuma tag disponível"}
        isClearable={true}
      />
    </div>
  );
};

export default SearchBar;