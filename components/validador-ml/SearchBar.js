// components/validador-ml/SearchBar.js
import React from 'react';
import styles from '../../styles/ValidadorML.module.css';

export const SearchBar = ({ value, onChange, onSearch, loading }) => (
  <div className={styles.searchContainer}>
    <input
      type="text"
      className={styles.searchInput}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Pesquise pelo ID ou nome da categoria (ex: MLB270227)"
    />
    <button
      className={styles.searchButton}
      onClick={onSearch}
      disabled={loading}
    >
      {loading ? (
        <div className={styles.spinner} />
      ) : (
        <i className="fas fa-search"></i>
      )}
    </button>
  </div>
);