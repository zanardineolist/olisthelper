// components/validador-ml/RequiredAttributes.js
import React from 'react';
import { ExpandableDetails } from './ExpandableDetails';
import styles from '../../styles/ValidadorML.module.css';

export const RequiredAttributes = ({ attributes = [] }) => {
  if (!attributes || attributes.length === 0) {
    return (
      <div className={styles.noAttributes}>
        <p>Esta categoria não possui atributos obrigatórios.</p>
      </div>
    );
  }

  return (
    <div className={styles.attributesContainer}>
      <h3 className={styles.sectionTitle}>Atributos Obrigatórios</h3>
      {attributes.map((attribute, index) => (
        <ExpandableDetails
          key={`${attribute.id}-${index}`}
          title={`${attribute.name} (ID: ${attribute.id})`}
          content={attribute}
        />
      ))}
    </div>
  );
};