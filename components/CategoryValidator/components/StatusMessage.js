// components/CategoryValidator/components/StatusMessage.js
import { Alert, Slide } from '@mui/material';
import styles from '../styles.module.css';

export function StatusMessage({ message, type = 'info', onClose }) {
  return (
    <Slide direction="down" in={!!message} mountOnEnter unmountOnExit>
      <Alert 
        severity={type}
        onClose={onClose}
        className={styles.statusMessage}
      >
        {message}
      </Alert>
    </Slide>
  );
}