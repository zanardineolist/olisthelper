// components/validador-ml/AttributeCard.js
import React, { useState } from 'react';
import styles from '../../styles/ValidadorML.module.css';

export const AttributeCard = ({ attribute }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={styles.attributeCard}>
      <div className={styles.attributeHeader}>
        <h4>{attribute.name} (ID: {attribute.id})</h4>
        <button
          className={styles.toggleButton}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Ocultar Detalhes' : 'Mostrar Detalhes'}
        </button>
      </div>
      {isExpanded && (
        <div className={styles.attributeDetails}>
          <pre>{JSON.stringify(attribute, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};