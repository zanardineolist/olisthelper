import React, { useState, useEffect, useCallback } from 'react';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaExternalLinkAlt, FaTag, FaFilter } from 'react-icons/fa';
import Swal from 'sweetalert2';
import styles from '../styles/MinhaBase.module.css';

const COLOR_OPTIONS = [
  { color: '#0A4EE4', name: 'Azul Primário' },
  { color: '#E64E36', name: 'Vermelho' },
  { color: '#779E3D', name: 'Verde' },
  { color: '#F0A028', name: 'Amarelo' },
  { color: '#2A2A2A', name: 'Cinza Escuro' },
  { color: '#6B46C1', name: 'Roxo' },
  { color: '#EC4899', name: 'Rosa' },
  { color: '#06B6D4', name: 'Azul Claro' }
];

export default function MinhaBase({ user }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
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
    color: '#0A4EE4',
    category: 'geral'
  });

  // Estados da UI
  const [availableTags, setAvailableTags] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [newTag, setNewTag] = useState('');

  // Carrega dados iniciais
  useEffect(() => {
    if (user?.id) {
      loadEntries();
      loadStats();
    }
  }, [user, searchTerm, filterCategory, filterTags, sortBy, sortDirection]);

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      
      const queryParams = new URLSearchParams({
        search_term: searchTerm,
        filter_tags: filterTags.join(','),
        filter_category: filterCategory,
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
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Erro ao carregar dados',
        confirmButtonColor: 'var(--color-primary)'
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, searchTerm, filterCategory, filterTags, sortBy, sortDirection]);

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
        Swal.fire({
          icon: 'warning',
          title: 'Campos obrigatórios',
          text: 'Título e descrição são obrigatórios',
          confirmButtonColor: 'var(--color-primary)'
        });
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

      await Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: editingEntry ? 'Entrada atualizada!' : 'Entrada criada!',
        timer: 1500,
        showConfirmButton: false
      });
      
      handleCloseModal();
      loadEntries();
      loadStats();
      
    } catch (error) {
      console.error('Erro ao salvar:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Erro ao salvar entrada',
        confirmButtonColor: 'var(--color-primary)'
      });
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
        confirmButtonColor: 'var(--color-accent1)',
        cancelButtonColor: 'var(--color-list)'
      });

      if (!result.isConfirmed) return;

      const response = await fetch(`/api/knowledge-base/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir entrada');
      }

      await Swal.fire({
        icon: 'success',
        title: 'Excluída!',
        text: 'Entrada excluída com sucesso',
        timer: 1500,
        showConfirmButton: false
      });

      loadEntries();
      loadStats();
      
    } catch (error) {
      console.error('Erro ao excluir:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Erro ao excluir entrada',
        confirmButtonColor: 'var(--color-primary)'
      });
    }
  };

  const handleViewEntry = (entry) => {
    if (entry.link) {
      window.open(entry.link, '_blank');
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
        category: entry.category
      });
    } else {
      setEditingEntry(null);
      setFormData({
        title: '',
        description: '',
        link: '',
        tags: [],
        color: '#0A4EE4',
        category: 'geral'
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
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
        <div className="standardBoxLoader"></div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Minha Base de Conhecimento</h1>
          <p className={styles.subtitle}>
            Salve e organize suas informações importantes para acesso rápido
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className={styles.addButton}
        >
          <FaPlus /> Nova Entrada
        </button>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className={styles.statsContainer}>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{stats.total_entries || 0}</span>
            <span className={styles.statLabel}>Entradas</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{stats.categories_count || 0}</span>
            <span className={styles.statLabel}>Categorias</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{stats.most_used_tags?.length || 0}</span>
            <span className={styles.statLabel}>Tags</span>
          </div>
        </div>
      )}

      {/* Controles de busca e filtros */}
      <div className={styles.controls}>
        <div className={styles.searchContainer}>
          <FaSearch className={styles.searchIcon} />
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

          <button
            onClick={() => toggleSort('created_at')}
            className={styles.sortButton}
            title="Ordenar por data"
          >
            Data {sortBy === 'created_at' && (sortDirection === 'asc' ? '↑' : '↓')}
          </button>

          <button
            onClick={() => toggleSort('title')}
            className={styles.sortButton}
            title="Ordenar por título"
          >
            Título {sortBy === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>

      {/* Grid de entradas */}
      <div className={styles.entriesGrid}>
        {entries.map(entry => (
          <div
            key={entry.id}
            className={styles.entryCard}
            style={{ borderLeftColor: entry.color }}
          >
            <div className={styles.entryHeader}>
              <h3 className={styles.entryTitle}>{entry.title}</h3>
              <div className={styles.entryActions}>
                {entry.link && (
                  <button
                    onClick={() => handleViewEntry(entry)}
                    className={styles.linkButton}
                    title="Abrir link"
                  >
                    <FaExternalLinkAlt />
                  </button>
                )}
                
                <button
                  onClick={() => handleOpenModal(entry)}
                  className={styles.editButton}
                  title="Editar"
                >
                  <FaEdit />
                </button>
                
                <button
                  onClick={() => handleDelete(entry.id)}
                  className={styles.deleteButton}
                  title="Excluir"
                >
                  <FaTrash />
                </button>
              </div>
            </div>

            <div className={styles.entryContent}>
              <p className={styles.entryDescription}>
                {entry.description && entry.description.length > 150 
                  ? `${entry.description.substring(0, 150)}...` 
                  : entry.description
                }
              </p>

              {entry.tags && entry.tags.length > 0 && (
                <div className={styles.tagsContainer}>
                  {entry.tags.slice(0, 3).map(tag => (
                    <span key={tag} className={styles.tag}>
                      <FaTag /> {tag}
                    </span>
                  ))}
                  {entry.tags.length > 3 && (
                    <span className={styles.moreTagsIndicator}>
                      +{entry.tags.length - 3} tags
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className={styles.entryFooter}>
              <div className={styles.entryMeta}>
                <span className={styles.category}>{entry.category}</span>
                <span className={styles.date}>{formatDate(entry.created_at)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Estado vazio */}
      {entries.length === 0 && !loading && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📚</div>
          <h3>Nenhuma entrada encontrada</h3>
          <p>
            {searchTerm || filterCategory 
              ? 'Tente ajustar os filtros de busca'
              : 'Comece criando sua primeira entrada na base de conhecimento'
            }
          </p>
          <button
            onClick={() => handleOpenModal()}
            className={styles.primaryButton}
          >
            <FaPlus /> Criar primeira entrada
          </button>
        </div>
      )}

      {/* Modal de Criação/Edição */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingEntry ? 'Editar Entrada' : 'Nova Entrada'}</h2>
              <button onClick={handleCloseModal} className={styles.closeButton}>×</button>
            </div>
            
            <div className={styles.modalContent}>
              <div className={styles.formGroup}>
                <label>Título *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Como resolver erro de conexão"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Descrição *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva detalhadamente o procedimento ou informação..."
                  rows={4}
                  className={styles.textarea}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Categoria</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Ex: Suporte, Fiscal, Técnico"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Link (opcional)</label>
                  <input
                    type="url"
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    placeholder="https://exemplo.com"
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Cor da categoria</label>
                <div className={styles.colorOptions}>
                  {COLOR_OPTIONS.map(option => (
                    <button
                      key={option.color}
                      className={`${styles.colorOption} ${formData.color === option.color ? styles.colorOptionSelected : ''}`}
                      style={{ backgroundColor: option.color }}
                      onClick={() => setFormData({ ...formData, color: option.color })}
                      title={option.name}
                    />
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Tags</label>
                <div className={styles.tagsInput}>
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Digite uma tag e pressione Enter"
                    className={styles.input}
                  />
                  <button onClick={handleAddTag} className={styles.addTagButton}>
                    <FaPlus />
                  </button>
                </div>

                <div className={styles.tagsList}>
                  {formData.tags.map(tag => (
                    <span key={tag} className={styles.formTag}>
                      <FaTag /> {tag}
                      <button onClick={() => handleRemoveTag(tag)}>×</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button onClick={handleCloseModal} className={styles.cancelButton}>
                Cancelar
              </button>
              <button onClick={handleSave} className={styles.saveButton}>
                {editingEntry ? 'Salvar Alterações' : 'Criar Entrada'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 