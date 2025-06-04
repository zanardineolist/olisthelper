import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Add, 
  Filter, 
  Star, 
  Edit, 
  Delete, 
  Link,
  Tag,
  DateRange,
  Visibility,
  KeyboardArrowUp,
  KeyboardArrowDown
} from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  IconButton,
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Fab
} from '@mui/material';
import Swal from 'sweetalert2';
import styles from '../styles/MinhaBase.module.css';

const PRIORITY_COLORS = {
  low: '#22C55E',      // Verde
  normal: '#3B82F6',   // Azul
  high: '#F59E0B',     // Laranja
  urgent: '#EF4444'    // Vermelho
};

const PRIORITY_LABELS = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente'
};

const COLOR_OPTIONS = [
  '#3B82F6', '#EF4444', '#22C55E', '#F59E0B', 
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
  '#F97316', '#6366F1', '#10B981', '#F43F5E'
];

export default function MinhaBase({ user }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterTags, setFilterTags] = useState([]);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [stats, setStats] = useState(null);

  // Estados do formulário
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    link: '',
    tags: [],
    color: '#3B82F6',
    priority: 'normal',
    category: 'geral',
    is_favorite: false
  });

  // Estados da UI
  const [notification, setNotification] = useState({ open: false, message: '', type: 'success' });
  const [availableTags, setAvailableTags] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [newTag, setNewTag] = useState('');

  // Carrega dados iniciais
  useEffect(() => {
    if (user?.id) {
      loadEntries();
      loadStats();
    }
  }, [user, searchTerm, filterCategory, filterPriority, filterTags, sortBy, sortDirection]);

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      
      const queryParams = new URLSearchParams({
        search_term: searchTerm,
        filter_tags: filterTags.join(','),
        filter_category: filterCategory,
        filter_priority: filterPriority,
        order_by: sortBy,
        order_direction: sortDirection
      });

      const response = await fetch(`/api/knowledge-base?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar entradas');
      }

      const data = await response.json();
      setEntries(data.entries || []);
      
      // Extrai tags e categorias disponíveis
      const allTags = new Set();
      const allCategories = new Set();
      
      data.entries?.forEach(entry => {
        entry.tags?.forEach(tag => allTags.add(tag));
        if (entry.category) allCategories.add(entry.category);
      });
      
      setAvailableTags([...allTags].sort());
      setAvailableCategories([...allCategories].sort());
      
    } catch (error) {
      console.error('Erro ao carregar entradas:', error);
      showNotification('Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.id, searchTerm, filterCategory, filterPriority, filterTags, sortBy, sortDirection]);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/knowledge-base/stats');
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.title.trim() || !formData.description.trim()) {
        showNotification('Título e descrição são obrigatórios', 'error');
        return;
      }

      const dataToSave = {
        ...formData,
        tags: formData.tags.filter(tag => tag.trim() !== '')
      };

      const method = editingEntry ? 'PUT' : 'POST';
      const endpoint = editingEntry 
        ? `/api/knowledge-base/${editingEntry.id}`
        : '/api/knowledge-base';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar entrada');
      }

      showNotification(
        editingEntry ? 'Entrada atualizada com sucesso!' : 'Entrada criada com sucesso!', 
        'success'
      );
      
      handleCloseModal();
      loadEntries();
      loadStats();
      
    } catch (error) {
      console.error('Erro ao salvar:', error);
      showNotification('Erro ao salvar entrada', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      const result = await Swal.fire({
        title: 'Tem certeza?',
        text: 'Esta ação não pode ser desfeita',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, excluir',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#64748b'
      });

      if (!result.isConfirmed) return;

      const response = await fetch(`/api/knowledge-base/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir entrada');
      }

      showNotification('Entrada excluída com sucesso!', 'success');
      loadEntries();
      loadStats();
      
    } catch (error) {
      console.error('Erro ao excluir:', error);
      showNotification('Erro ao excluir entrada', 'error');
    }
  };

  const handleToggleFavorite = async (entry) => {
    try {
      const response = await fetch('/api/knowledge-base/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: entry.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao alterar favorito');
      }

      const { isFavorite } = await response.json();
      
      // Atualizar estado local
      setEntries(prevEntries => 
        prevEntries.map(e => 
          e.id === entry.id 
            ? { ...e, is_favorite: isFavorite }
            : e
        )
      );
      
    } catch (error) {
      console.error('Erro ao alterar favorito:', error);
      showNotification('Erro ao alterar favorito', 'error');
    }
  };

  const handleViewEntry = async (entry) => {
    try {
      // Incrementa contador de visualizações
      await fetch('/api/knowledge-base/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: entry.id })
      });
      
      // Abre link se existir
      if (entry.link) {
        window.open(entry.link, '_blank');
      }
      
      loadEntries();
      
    } catch (error) {
      console.error('Erro ao registrar visualização:', error);
    }
  };

  const handleOpenModal = (entry = null) => {
    if (entry) {
      setEditingEntry(entry);
      setFormData({
        title: entry.title,
        description: entry.description,
        link: entry.link || '',
        tags: entry.tags || [],
        color: entry.color,
        priority: entry.priority,
        category: entry.category,
        is_favorite: entry.is_favorite
      });
    } else {
      setEditingEntry(null);
      setFormData({
        title: '',
        description: '',
        link: '',
        tags: [],
        color: '#3B82F6',
        priority: 'normal',
        category: 'geral',
        is_favorite: false
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEntry(null);
    setNewTag('');
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ open: true, message, type });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  if (loading && entries.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <CircularProgress />
        <Typography>Carregando sua base de conhecimento...</Typography>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Minha Base de Conhecimento</h1>
          <p className={styles.subtitle}>
            Organize seus tickets e soluções para consulta rápida no futuro
          </p>
        </div>

        {stats && (
          <div className={styles.statsContainer}>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>{stats.total_entries || 0}</span>
              <span className={styles.statLabel}>Entradas</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>{stats.total_favorites || 0}</span>
              <span className={styles.statLabel}>Favoritos</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>{stats.total_views || 0}</span>
              <span className={styles.statLabel}>Visualizações</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>{stats.categories_count || 0}</span>
              <span className={styles.statLabel}>Categorias</span>
            </div>
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <div className={styles.searchContainer}>
          <Search className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar em títulos, descrições e tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filters}>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">Todas as categorias</option>
            {availableCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">Todas as prioridades</option>
            {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <button
            onClick={() => toggleSort('created_at')}
            className={styles.sortButton}
            title="Ordenar por data"
          >
            <DateRange />
            {sortBy === 'created_at' && (
              sortDirection === 'asc' ? <KeyboardArrowUp /> : <KeyboardArrowDown />
            )}
          </button>

          <button
            onClick={() => toggleSort('title')}
            className={styles.sortButton}
            title="Ordenar por título"
          >
            Título
            {sortBy === 'title' && (
              sortDirection === 'asc' ? <KeyboardArrowUp /> : <KeyboardArrowDown />
            )}
          </button>
        </div>
      </div>

      <div className={styles.entriesGrid}>
        {entries.map(entry => (
          <div
            key={entry.id}
            className={styles.entryCard}
            style={{ borderLeftColor: entry.color }}
          >
            <div className={styles.entryHeader}>
              <div className={styles.entryTitleRow}>
                <h3 className={styles.entryTitle}>{entry.title}</h3>
                <div className={styles.entryActions}>
                  <button
                    onClick={() => handleToggleFavorite(entry)}
                    className={styles.favoriteButton}
                    title={entry.is_favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                  >
                    <Star style={{ color: entry.is_favorite ? '#f59e0b' : '#64748b' }} />
                  </button>
                  
                  {entry.link && (
                    <button
                      onClick={() => handleViewEntry(entry)}
                      className={styles.linkButton}
                      title="Abrir link"
                    >
                      <Link />
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleOpenModal(entry)}
                    className={styles.editButton}
                    title="Editar"
                  >
                    <Edit />
                  </button>
                  
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className={styles.deleteButton}
                    title="Excluir"
                  >
                    <Delete />
                  </button>
                </div>
              </div>

              <div className={styles.entryMeta}>
                <span
                  className={styles.priorityBadge}
                  style={{ backgroundColor: PRIORITY_COLORS[entry.priority] }}
                >
                  {PRIORITY_LABELS[entry.priority]}
                </span>
                <span className={styles.category}>{entry.category}</span>
              </div>
            </div>

            <div className={styles.entryContent}>
              <p className={styles.entryDescription}>
                {entry.description && entry.description.length > 200 
                  ? `${entry.description.substring(0, 200)}...` 
                  : entry.description
                }
              </p>

              {entry.tags && entry.tags.length > 0 && (
                <div className={styles.tagsContainer}>
                  {entry.tags.map(tag => (
                    <span key={tag} className={styles.tag}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.entryFooter}>
              <div className={styles.entryStats}>
                <span title="Visualizações">
                  <Visibility /> {entry.view_count || 0}
                </span>
                <span title="Criado em">
                  {formatDate(entry.created_at)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {entries.length === 0 && !loading && (
        <div className={styles.emptyState}>
          <h3>Nenhuma entrada encontrada</h3>
          <p>
            {searchTerm || filterCategory || filterPriority 
              ? 'Tente ajustar os filtros de busca'
              : 'Comece criando sua primeira entrada na base de conhecimento'
            }
          </p>
          <button
            onClick={() => handleOpenModal()}
            className={styles.primaryButton}
          >
            <Add /> Criar primeira entrada
          </button>
        </div>
      )}

      <Fab
        color="primary"
        aria-label="add"
        className={styles.fab}
        onClick={() => handleOpenModal()}
      >
        <Add />
      </Fab>

      {/* Modal de Criação/Edição */}
      <Dialog
        open={showModal}
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        className={styles.modal}
      >
        <DialogTitle>
          {editingEntry ? 'Editar Entrada' : 'Nova Entrada'}
        </DialogTitle>
        
        <DialogContent>
          <div className={styles.modalContent}>
            <TextField
              label="Título"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
              required
              margin="normal"
            />

            <TextField
              label="Descrição"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              required
              multiline
              rows={4}
              margin="normal"
            />

            <TextField
              label="Link (opcional)"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              fullWidth
              margin="normal"
              placeholder="https://..."
            />

            <div className={styles.modalRow}>
              <TextField
                label="Categoria"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                style={{ flex: 1, marginRight: '16px' }}
              />

              <FormControl style={{ flex: 1 }}>
                <InputLabel>Prioridade</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                    <MenuItem key={key} value={key}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            <div className={styles.colorSelector}>
              <span className={styles.colorLabel}>Cor:</span>
              <div className={styles.colorOptions}>
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color}
                    className={`${styles.colorOption} ${formData.color === color ? styles.colorOptionSelected : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>

            <div className={styles.tagsSection}>
              <div className={styles.tagsInput}>
                <TextField
                  label="Adicionar tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  style={{ flex: 1, marginRight: '8px' }}
                />
                <Button onClick={handleAddTag} variant="outlined">
                  <Add />
                </Button>
              </div>

              <div className={styles.tagsList}>
                {formData.tags.map(tag => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </div>
            </div>
          </div>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseModal}>
            Cancelar
          </Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            {editingEntry ? 'Salvar Alterações' : 'Criar Entrada'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notificações */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert 
          severity={notification.type} 
          onClose={() => setNotification({ ...notification, open: false })}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </div>
  );
} 