// components/CategoryValidator/feedback/NoResults.js
import { Paper, Typography } from '@mui/material';
import { SearchOff } from '@mui/icons-material';
import styles from '../styles.module.css';

export function NoResults({ message = 'Nenhum resultado encontrado' }) {
  return (
    <Paper className={styles.noResults}>
      <SearchOff className={styles.noResultsIcon} />
      <Typography variant="body1" color="textSecondary">
        {message}
      </Typography>
    </Paper>
  );
}