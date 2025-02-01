// components/CategoryValidator/feedback/LoadingOverlay.js
import { CircularProgress, Backdrop, Typography } from '@mui/material';
import styles from '../styles.module.css';

export function LoadingOverlay({ message = 'Carregando...' }) {
  return (
    <Backdrop open={true} className={styles.loadingOverlay}>
      <div className={styles.loadingContent}>
        <CircularProgress color="primary" />
        <Typography variant="body2" className={styles.loadingText}>
          {message}
        </Typography>
      </div>
    </Backdrop>
  );
}