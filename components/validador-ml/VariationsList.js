// components/validador-ml/VariationsList.js
import React, { useState } from 'react';
import styles from '../../styles/ValidadorML.module.css';

export const VariationsList = ({ variations }) => {
  const [selectedVariation, setSelectedVariation] = useState(null);

  const openPopup = (variation) => setSelectedVariation(variation);
  const closePopup = () => setSelectedVariation(null);

  return (
    <div className={styles.variationsContainer}>
      <h3>Variações Permitidas</h3>
      <div className={styles.variationTags}>
        {variations.map((variation) => (
          <button
            key={variation.id}
            className={styles.variationTag}
            onClick={() => openPopup(variation)}
          >
            {variation.name}
          </button>
        ))}
      </div>

      {selectedVariation && (
        <div className={styles.popupOverlay} onClick={closePopup}>
          <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
            <button className={styles.popupClose} onClick={closePopup}>×</button>
            <div className={styles.popupHeader}>
              Valores aceitos para: {selectedVariation.name}
            </div>
            <div className={styles.popupContent}>
              {selectedVariation.values?.length > 0 ? (
                selectedVariation.values.map((value, index) => (
                  <p key={index}>{value.name}</p>
                ))
              ) : (
                <p>Nenhum valor disponível para esta variação.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};