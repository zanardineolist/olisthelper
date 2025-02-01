// components/CategoryValidator/VariationModal.js
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemText,
    Typography,
    IconButton
  } from '@mui/material';
  import { Close as CloseIcon } from '@mui/icons-material';
  import styles from './styles.module.css';
  
  export default function VariationModal({ variation, open, onClose }) {
    if (!variation) return null;
  
    return (
      <Dialog 
        open={open} 
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        classes={{ paper: styles.modalPaper }}
      >
        <DialogTitle className={styles.modalHeader}>
          <Typography variant="h6">
            Valores aceitos para: {variation.name}
          </Typography>
          <IconButton
            aria-label="close"
            onClick={onClose}
            className={styles.closeButton}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
  
        <DialogContent dividers>
          {variation.values && variation.values.length > 0 ? (
            <List dense className={styles.valuesList}>
              {variation.values.map((value, index) => (
                <ListItem key={`${value.id || index}`} className={styles.valueItem}>
                  <ListItemText
                    primary={value.name}
                    secondary={value.metadata ? JSON.stringify(value.metadata) : null}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="textSecondary" align="center" className={styles.noValues}>
              Nenhum valor disponível para esta variação
            </Typography>
          )}
        </DialogContent>
  
        <DialogActions>
          <Button onClick={onClose} color="primary">
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    );
  }