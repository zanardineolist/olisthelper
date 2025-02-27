import React from 'react';
import { motion } from 'framer-motion';
import { FaThLarge, FaList, FaSortAmountDown, FaSortAmountUp, FaFire } from 'react-icons/fa';
import { useMessageContext } from './MessageContext';
import styles from '../../styles/SharedMessages.module.css';

const MessageFilters = () => {
  const { 
    viewMode, 
    toggleViewMode, 
    sortOrder, 
    setSortOrder 
  } = useMessageContext();

  // Opções de ordenação
  const sortOptions = [
    { id: 'newest', label: 'Mais recentes', icon: <FaSortAmountDown /> },
    { id: 'oldest', label: 'Mais antigas', icon: <FaSortAmountUp /> },
    { id: 'popular', label: 'Mais populares', icon: <FaFire /> }
  ];

  return (
    <div className={styles.filtersContainer}>
      <div className={styles.filtersWrapper}>
        {/* Ordenação */}
        <div className={styles.sortOptions}>
          <span className={styles.filterLabel}>Ordenar por:</span>
          <div className={styles.sortButtons}>
            {sortOptions.map(option => (
              <motion.button
                key={option.id}
                className={`${styles.sortButton} ${sortOrder === option.id ? styles.activeSort : ''}`}
                onClick={() => setSortOrder(option.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={option.label}
                title={option.label}
                aria-pressed={sortOrder === option.id}
              >
                <span className={styles.sortIcon}>{option.icon}</span>
                <span className={styles.sortLabel}>{option.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Alternar modo de visualização */}
        <motion.button
          className={styles.viewModeToggle}
          onClick={toggleViewMode}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label={`Alternar para visualização em ${viewMode === 'grid' ? 'lista' : 'grade'}`}
          title={`Alternar para visualização em ${viewMode === 'grid' ? 'lista' : 'grade'}`}
        >
          {viewMode === 'grid' ? (
            <FaList className={styles.viewModeIcon} />
          ) : (
            <FaThLarge className={styles.viewModeIcon} />
          )}
        </motion.button>
      </div>
    </div>
  );
};

export default MessageFilters;