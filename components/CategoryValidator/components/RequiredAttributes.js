// components/CategoryValidator/components/RequiredAttributes.js
import { useState } from 'react';
import styles from '../styles.module.css';

export default function RequiredAttributes({ attributes = [] }) {
  const [expandedAttribute, setExpandedAttribute] = useState(null);

  if (!attributes?.length) {
    return (
      <div className={styles.noAttributes}>
        <p>Esta categoria não possui atributos obrigatórios.</p>
      </div>
    );
  }

  const toggleAttribute = (attributeId) => {
    setExpandedAttribute(expandedAttribute === attributeId ? null : attributeId);
  };

  return (
    <div className={styles.attributesContainer}>
      <h3>Características Obrigatórias</h3>
      <div className={styles.attributesList}>
        {attributes.map((attribute) => (
          <div key={attribute.id} className={styles.attributeCard}>
            <div className={styles.attributeHeader}>
              <h4>{attribute.name} (ID: {attribute.id})</h4>
              <button 
                className={styles.detailsButton}
                onClick={() => toggleAttribute(attribute.id)}
              >
                {expandedAttribute === attribute.id ? 'Ocultar Detalhes' : 'Detalhes'}
              </button>
            </div>
            <p className={styles.requiredTag}>Obrigatório: Sim</p>
            {expandedAttribute === attribute.id && (
              <div className={styles.attributeDetails}>
                <pre>{JSON.stringify(attribute, null, 2)}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}