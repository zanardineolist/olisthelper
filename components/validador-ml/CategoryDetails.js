// components/validador-ml/CategoryDetails.js
import React from 'react';
import { VariationsList } from './VariationsList';
import { AttributeCard } from './AttributeCard';
import styles from '../../styles/ValidadorML.module.css';

export const CategoryDetails = ({ details }) => (
  <div className={styles.detailsContainer}>
    <div className={styles.categoryHeader}>
      <h2>{details.hierarquia_completa}</h2>
      <span className={`${styles.badge} ${details.status === 'enabled' ? styles.badgeSuccess : styles.badgeDanger}`}>
        {details.status === 'enabled' ? 'Ativa' : 'Desativada'}
      </span>
    </div>

    <div className={styles.specificationGrid}>
      <div className={styles.specItem}>
        <span className={styles.specLabel}>Último Nível</span>
        <span>{details.is_ultimo_nivel ? 'Sim' : 'Não'}</span>
      </div>
      <div className={styles.specItem}>
        <span className={styles.specLabel}>Máx. Descrição</span>
        <span>{details.max_description_length || 'N/A'}</span>
      </div>
      <div className={styles.specItem}>
        <span className={styles.specLabel}>Máx. Fotos</span>
        <span>{details.max_pictures_per_item || 'N/A'}</span>
      </div>
      <div className={styles.specItem}>
        <span className={styles.specLabel}>Máx. Fotos Var.</span>
        <span>{details.max_pictures_per_item_var || 'N/A'}</span>
      </div>
      <div className={styles.specItem}>
        <span className={styles.specLabel}>Máx. Título</span>
        <span>{details.max_title_length || 'N/A'}</span>
      </div>
      <div className={styles.specItem}>
        <span className={styles.specLabel}>Máx. Variações</span>
        <span>{details.max_variations_allowed || 'N/A'}</span>
      </div>
      <div className={styles.specItem}>
        <span className={styles.specLabel}>Preço Mínimo</span>
        <span>
          {details.minimum_price 
            ? `${details.minimum_price} ${details.minimum_price_currency}` 
            : 'N/A'}
        </span>
      </div>
      <div className={styles.specItem}>
        <span className={styles.specLabel}>Estoque</span>
        <span>{details.stock === 'required' ? 'Obrigatório' : 'Opcional'}</span>
      </div>
    </div>

    {details.variacoes?.length > 0 && (
      <VariationsList variations={details.variacoes} />
    )}

    {details.requiredAttributes?.length > 0 && (
      <div className={styles.attributesSection}>
        <h3>Atributos Obrigatórios</h3>
        {details.requiredAttributes.map((attribute, index) => (
          <AttributeCard key={`${attribute.id}-${index}`} attribute={attribute} />
        ))}
      </div>
    )}
  </div>
);