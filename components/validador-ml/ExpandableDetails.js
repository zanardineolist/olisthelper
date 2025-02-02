// components/validador-ml/ExpandableDetails.js
import React, { useState } from 'react';
import styles from '../../styles/ValidadorML.module.css';

export const ExpandableDetails = ({ title, content }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={styles.expandableCard}>
      <div className={styles.cardHeader}>
        <h3>{title}</h3>
        <button
          className={`${styles.toggleButton} ${isExpanded ? styles.expanded : ''}`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Ocultar Detalhes' : 'Mostrar Detalhes'}
        </button>
      </div>
      
      {isExpanded && (
        <div className={styles.cardContent}>
          <pre>
            {typeof content === 'object' ? JSON.stringify(content, null, 2) : content}
          </pre>
        </div>
      )}
    </div>
  );
};