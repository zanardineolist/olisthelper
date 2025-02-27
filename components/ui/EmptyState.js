import React from 'react';
import styles from '../../styles/SharedMessages.module.css';

const EmptyState = ({ icon, message }) => (
  <div className={styles.emptyState} role="status">
    {icon}
    <p>{message}</p>
  </div>
);

export default EmptyState;