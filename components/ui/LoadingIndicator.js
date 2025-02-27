import React from 'react';
import styles from '../../styles/SharedMessages.module.css';

const LoadingIndicator = () => (
  <div className={styles.loadingContainer} aria-live="polite" aria-busy="true">
    <div className={styles.spinner}>
      <div className={styles.bounce1}></div>
      <div className={styles.bounce2}></div>
      <div className={styles.bounce3}></div>
    </div>
    <span className={styles.srOnly}>Carregando...</span>
  </div>
);

export default LoadingIndicator;