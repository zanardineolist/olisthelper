import React from 'react';
import styles from '../../styles/SkeletonLoader.module.css';

const SkeletonLoader = ({ 
  variant = 'rectangular', 
  width = '100%', 
  height = '20px',
  lines = 1,
  spacing = '8px',
  className = '',
  animation = 'pulse' 
}) => {
  if (variant === 'table') {
    return <TableSkeletonLoader />;
  }

  if (variant === 'chip') {
    return <ChipSkeletonLoader />;
  }

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`${styles.textContainer} ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${styles.skeleton} ${styles[animation]}`}
            style={{
              width: index === lines - 1 ? '70%' : '100%',
              height,
              marginBottom: index === lines - 1 ? '0' : spacing
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${styles.skeleton} ${styles[animation]} ${className}`}
      style={{ width, height }}
    />
  );
};

const TableSkeletonLoader = () => (
  <div className={styles.tableContainer}>
    <div className={styles.tableWrapper}>
      {/* Header */}
      <div className={styles.tableHeader}>
        {Array.from({ length: 7 }).map((_, index) => (
          <SkeletonLoader
            key={index}
            height="16px"
            width={index === 2 ? '120px' : index === 4 ? '150px' : '80px'}
          />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: 8 }).map((_, rowIndex) => (
        <div key={rowIndex} className={styles.tableRow}>
          {/* Data/Hora */}
          <SkeletonLoader height="14px" width="90px" />
          
          {/* Status Chip */}
          <SkeletonLoader variant="chip" />
          
          {/* Problema */}
          <SkeletonLoader height="16px" width="180px" />
          
          {/* Marcadores */}
          <div className={styles.chipGroup}>
            <SkeletonLoader variant="chip" />
            <SkeletonLoader variant="chip" />
          </div>
          
          {/* Resumo */}
          <SkeletonLoader height="14px" width="200px" />
          
          {/* Data Correção */}
          <SkeletonLoader height="14px" width="90px" />
          
          {/* Botão Ver */}
          <SkeletonLoader height="32px" width="60px" />
        </div>
      ))}
    </div>
  </div>
);

const ChipSkeletonLoader = () => (
  <div className={`${styles.skeleton} ${styles.pulse} ${styles.chip}`} />
);

export default SkeletonLoader;