// components/CategoryValidator/components/NoResults.js
import { Paper, Typography } from '@mui/material';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import styles from '../styles.module.css';

export function NoResults({ message = 'Nenhum resultado encontrado' }) {
  return (
    <Paper className={styles.noResults}>
      <SearchOffIcon className={styles.noResultsIcon} />
      <Typography variant="body1" color="textSecondary">
        {message}
      </Typography>
    </Paper>
  );
}