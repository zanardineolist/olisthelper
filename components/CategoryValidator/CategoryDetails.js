// components/CategoryValidator/CategoryDetails.js
import { useState } from 'react';
import { 
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import styles from './styles.module.css';

export default function CategoryDetails({ category, onClose }) {
  const [expandedAttribute, setExpandedAttribute] = useState(null);

  const handleAttributeExpand = (attributeId) => {
    setExpandedAttribute(expandedAttribute === attributeId ? null : attributeId);
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return 'Não especificado';
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    return value.toString();
  };

  return (
    <Card className={styles.detailsCard}>
      <div className={styles.detailsHeader}>
        <Typography variant="h6">
          {category.id} - {category.hierarquia_completa}
        </Typography>
        <div>
          <Chip
            label={category.status === 'enabled' ? 'Ativa' : 'Desativada'}
            color={category.status === 'enabled' ? 'success' : 'error'}
            size="small"
          />
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </div>
      </div>

      <CardContent>
        <Grid container spacing={3}>
          {/* Informações básicas */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Informações Básicas
            </Typography>
            <Card variant="outlined">
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography color="textSecondary">Último Nível</Typography>
                    <Typography>{formatValue(category.is_ultimo_nivel)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography color="textSecondary">Estoque</Typography>
                    <Typography>{category.stock === 'required' ? 'Obrigatório' : 'Opcional'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography color="textSecondary">Preço Mínimo</Typography>
                    <Typography>
                      {category.minimum_price ? 
                        `${category.minimum_price} ${category.minimum_price_currency}` : 
                        'Não especificado'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Limites */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Limites
            </Typography>
            <Card variant="outlined">
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography color="textSecondary">Máx. Título</Typography>
                    <Typography>{formatValue(category.max_title_length)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography color="textSecondary">Máx. Descrição</Typography>
                    <Typography>{formatValue(category.max_description_length)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography color="textSecondary">Máx. Fotos</Typography>
                    <Typography>{formatValue(category.max_pictures_per_item)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography color="textSecondary">Máx. Fotos (Variação)</Typography>
                    <Typography>{formatValue(category.max_pictures_per_item_var)}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Variações */}
          {category.variations && category.variations.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Variações Permitidas
              </Typography>
              <div className={styles.variationsList}>
                {category.variations.map((variation) => (
                  <Chip
                    key={variation.id}
                    label={variation.name}
                    onClick={() => {/* Implementar modal de valores */}}
                    className={styles.variationChip}
                  />
                ))}
              </div>
            </Grid>
          )}

          {/* Atributos Obrigatórios */}
          {category.attributes && category.attributes.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Atributos Obrigatórios
              </Typography>
              {category.attributes.map((attribute) => (
                <Accordion
                  key={attribute.id}
                  expanded={expandedAttribute === attribute.id}
                  onChange={() => handleAttributeExpand(attribute.id)}
                  className={styles.attributeAccordion}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>{attribute.name}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <pre className={styles.attributeDetails}>
                      {JSON.stringify(attribute, null, 2)}
                    </pre>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
}