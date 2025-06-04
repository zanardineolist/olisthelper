import React, { useState, useEffect, useCallback } from 'react';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaExternalLinkAlt, FaTag, FaFilter, FaTimes, FaEye, FaPalette, FaLink } from 'react-icons/fa';
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
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [viewingEntry, setViewingEntry] = useState(null);

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
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

  // Carrega dados iniciais
  useEffect(() => {
    if (user?.id) {
      loadEntries();
    }
  }, [user, searchTerm, filterCategory, filterTags, sortBy, sortDirection]);

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.autocomplete-container')) {
        setShowTagSuggestions(false);
        setShowCategorySuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        throw new Error('Erro ao carregar anotações');
      }

      const data = await response.json();
      setEntries(data.entries || []);
      
      // Extrai tags e categorias disponíveis de TODAS as entradas (não apenas as filtradas)
      if (!searchTerm && !filterCategory && filterTags.length === 0) {
        const allTags = new Set();
        const allCategories = new Set();
        
        data.entries?.forEach(entry => {
          entry.tags?.forEach(tag => allTags.add(tag));
          if (entry.category) allCategories.add(entry.category);
        });
        
        setAvailableTags([...allTags].sort());
        setAvailableCategories([...allCategories].sort());
      }
      
    } catch (error) {
      console.error('Erro ao carregar anotações:', error);
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

  // Verifica se há dados não salvos
  const hasUnsavedData = () => {
    const initialData = {
      title: '',
      description: '',
      link: '',
      tags: [],
      color: '#0A4EE4',
      category: 'geral'
    };

    if (editingEntry) {
      return (
        formData.title !== editingEntry.title ||
        formData.description !== editingEntry.description ||
        formData.link !== (editingEntry.link || '') ||
        JSON.stringify(formData.tags) !== JSON.stringify(editingEntry.tags || []) ||
        formData.color !== editingEntry.color ||
        formData.category !== editingEntry.category
      );
    }

    return (
      formData.title !== initialData.title ||
      formData.description !== initialData.description ||
      formData.link !== initialData.link ||
      formData.tags.length > 0 ||
      formData.color !== initialData.color ||
      formData.category !== initialData.category
    );
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
        throw new Error(errorData.error || 'Erro ao salvar anotação');
      }

      await Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: editingEntry ? 'Anotação atualizada!' : 'Anotação criada!',
        timer: 1500,
        showConfirmButton: false
      });
      
      handleCloseModal();
      loadEntries();
      
    } catch (error) {
      console.error('Erro ao salvar:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Erro ao salvar anotação',
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
        throw new Error(errorData.error || 'Erro ao excluir anotação');
      }

      await Swal.fire({
        icon: 'success',
        title: 'Excluída!',
        text: 'Anotação excluída com sucesso',
        timer: 1500,
        showConfirmButton: false
      });

      loadEntries();
      
    } catch (error) {
      console.error('Erro ao excluir:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Erro ao excluir anotação',
        confirmButtonColor: 'var(--color-primary)'
      });
    }
  };

  const handleViewEntry = (entry) => {
    if (entry.link) {
      window.open(entry.link, '_blank');
    }
  };

  const handleCardClick = (entry) => {
    setViewingEntry(entry);
    setShowViewModal(true);
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

  const handleCloseModal = async () => {
    if (hasUnsavedData()) {
      const result = await Swal.fire({
        title: 'Descartar alterações?',
        text: 'Você tem alterações não salvas. Deseja descartar?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, descartar',
        cancelButtonText: 'Continuar editando',
        confirmButtonColor: 'var(--color-accent1)',
        cancelButtonColor: 'var(--color-primary)'
      });

      if (!result.isConfirmed) {
        return;
      }
    }

    setShowModal(false);
    setEditingEntry(null);
    setNewTag('');
    setShowTagSuggestions(false);
    setShowCategorySuggestions(false);
  };

  const handleModalOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCloseModal();
    }
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setViewingEntry(null);
  };

  const handleAddTag = (tag = null) => {
    const tagToAdd = tag || newTag.trim();
    if (tagToAdd && !formData.tags.includes(tagToAdd)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagToAdd]
      });
      setNewTag('');
      setShowTagSuggestions(false);
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleCategorySelect = (category) => {
    setFormData({ ...formData, category });
    setShowCategorySuggestions(false);
  };

  const getFilteredCategories = () => {
    return availableCategories.filter(cat => 
      cat.toLowerCase().includes(formData.category.toLowerCase()) &&
      cat !== formData.category
    );
  };

  const getFilteredTags = () => {
    return availableTags.filter(tag => 
      tag.toLowerCase().includes(newTag.toLowerCase()) &&
      !formData.tags.includes(tag)
    );
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
          <FaPlus /> Nova Anotação
        </button>
      </div>

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

      {/* Contador de resultados */}
      {!loading && (
        <div className={styles.resultsCounter}>
          <span>{entries.length} anotaç{entries.length === 1 ? 'ão' : 'ões'} encontrada{entries.length === 1 ? '' : 's'}</span>
        </div>
      )}

      {/* Grid de anotações */}
      <div className={styles.entriesGrid}>
        {entries.map(entry => (
          <div
            key={entry.id}
            className={styles.entryCard}
            style={{ borderLeftColor: entry.color }}
            onClick={() => handleCardClick(entry)}
          >
            <div className={styles.entryHeader}>
              <h3 className={styles.entryTitle}>{entry.title}</h3>
              <div className={styles.entryActions} onClick={(e) => e.stopPropagation()}>
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
          <h3>Nenhuma anotação encontrada</h3>
          <p>
            {searchTerm || filterCategory 
              ? 'Tente ajustar os filtros de busca'
              : 'Comece criando sua primeira anotação na base de conhecimento'
            }
          </p>
          <button
            onClick={() => handleOpenModal()}
            className={styles.primaryButton}
          >
            <FaPlus /> Criar primeira anotação
          </button>
        </div>
      )}

      {/* Modal de Visualização */}
      {showViewModal && viewingEntry && (
        <div className={styles.modalOverlay} onClick={handleCloseViewModal}>
          <div className={styles.viewModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{viewingEntry.title}</h2>
              <div className={styles.viewModalActions}>
                <button
                  onClick={() => {
                    handleCloseViewModal();
                    handleOpenModal(viewingEntry);
                  }}
                  className={styles.editIconButton}
                  title="Editar"
                >
                  <FaEdit />
                </button>
                <button onClick={handleCloseViewModal} className={styles.closeButton}>
                  <FaTimes />
                </button>
              </div>
            </div>
            
            <div className={styles.viewModalContent}>
              <div className={styles.viewSection}>
                <h4>Descrição</h4>
                <p className={styles.viewDescription}>{viewingEntry.description}</p>
              </div>

              {viewingEntry.link && (
                <div className={styles.viewSection}>
                  <h4>Link</h4>
                  <a 
                    href={viewingEntry.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles.viewLink}
                  >
                    <FaExternalLinkAlt /> {viewingEntry.link}
                  </a>
                </div>
              )}

              {viewingEntry.tags && viewingEntry.tags.length > 0 && (
                <div className={styles.viewSection}>
                  <h4>Tags</h4>
                  <div className={styles.viewTags}>
                    {viewingEntry.tags.map(tag => (
                      <span key={tag} className={styles.viewTag}>
                        <FaTag /> {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.viewMeta}>
                <div className={styles.viewMetaItem}>
                  <strong>Categoria:</strong> 
                  <span 
                    className={styles.viewCategory}
                    style={{ borderLeftColor: viewingEntry.color }}
                  >
                    {viewingEntry.category}
                  </span>
                </div>
                <div className={styles.viewMetaItem}>
                  <strong>Criado em:</strong> {formatDate(viewingEntry.created_at)}
                </div>
                {viewingEntry.updated_at !== viewingEntry.created_at && (
                  <div className={styles.viewMetaItem}>
                    <strong>Atualizado em:</strong> {formatDate(viewingEntry.updated_at)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação/Edição */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={handleModalOverlayClick}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingEntry ? 'Editar Anotação' : 'Nova Anotação'}</h2>
              <button onClick={handleCloseModal} className={styles.closeButton}>
                <FaTimes />
              </button>
            </div>
            
            <div className={styles.modalContent}>
              {/* Seção Principal */}
              <div className={styles.formSection}>
                <h3 className={styles.sectionTitle}>Informações Principais</h3>
                
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <span className={styles.labelIcon}>📝</span>
                    Título <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Como resolver erro de conexão"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <span className={styles.labelIcon}>📄</span>
                    Descrição <span className={styles.required}>*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva detalhadamente o procedimento ou informação..."
                    rows={4}
                    className={styles.textarea}
                  />
                </div>
              </div>

              {/* Seção Organização */}
              <div className={styles.formSection}>
                <h3 className={styles.sectionTitle}>Organização</h3>
                
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      <span className={styles.labelIcon}>📂</span>
                      Categoria
                    </label>
                    <div className={`${styles.autocompleteContainer} autocomplete-container`}>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => {
                          setFormData({ ...formData, category: e.target.value });
                          setShowCategorySuggestions(true);
                        }}
                        onFocus={() => setShowCategorySuggestions(true)}
                        placeholder="Ex: Suporte, Fiscal, Técnico"
                        className={styles.input}
                      />
                      {showCategorySuggestions && getFilteredCategories().length > 0 && (
                        <div className={styles.suggestions}>
                          {getFilteredCategories().slice(0, 5).map(category => (
                            <div
                              key={category}
                              className={styles.suggestionItem}
                              onClick={() => handleCategorySelect(category)}
                            >
                              {category}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      <span className={styles.labelIcon}><FaPalette /></span>
                      Cor da Categoria
                    </label>
                    <div className={styles.colorSelector}>
                      <div className={styles.selectedColor}>
                        <div 
                          className={styles.colorPreview}
                          style={{ backgroundColor: formData.color }}
                        />
                        <span className={styles.colorName}>
                          {COLOR_OPTIONS.find(c => c.color === formData.color)?.name || 'Personalizada'}
                        </span>
                      </div>
                      <div className={styles.colorOptions}>
                        {COLOR_OPTIONS.map(option => (
                          <button
                            key={option.color}
                            className={`${styles.colorOption} ${formData.color === option.color ? styles.colorOptionSelected : ''}`}
                            style={{ backgroundColor: option.color }}
                            onClick={() => setFormData({ ...formData, color: option.color })}
                            title={option.name}
                            type="button"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção Tags */}
              <div className={styles.formSection}>
                <h3 className={styles.sectionTitle}>Tags</h3>
                
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <span className={styles.labelIcon}><FaTag /></span>
                    Adicionar Tags
                  </label>
                  <div className={`${styles.autocompleteContainer} autocomplete-container`}>
                    <div className={styles.tagsInput}>
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => {
                          setNewTag(e.target.value);
                          setShowTagSuggestions(true);
                        }}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                        onFocus={() => setShowTagSuggestions(true)}
                        placeholder="Digite uma tag e pressione Enter"
                        className={styles.input}
                      />
                      <button 
                        onClick={() => handleAddTag()} 
                        className={styles.addTagButton}
                        type="button"
                      >
                        <FaPlus />
                      </button>
                    </div>
                    {showTagSuggestions && getFilteredTags().length > 0 && (
                      <div className={styles.suggestions}>
                        {getFilteredTags().slice(0, 5).map(tag => (
                          <div
                            key={tag}
                            className={styles.suggestionItem}
                            onClick={() => handleAddTag(tag)}
                          >
                            <FaTag /> {tag}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {formData.tags.length > 0 && (
                    <div className={styles.tagsDisplayContainer}>
                      <span className={styles.tagsDisplayLabel}>Tags adicionadas:</span>
                      <div className={styles.tagsList}>
                        {formData.tags.map(tag => (
                          <span key={tag} className={styles.formTag}>
                            <FaTag /> {tag}
                            <button 
                              onClick={() => handleRemoveTag(tag)}
                              type="button"
                              className={styles.removeTagButton}
                            >
                              <FaTimes />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Seção Link */}
              <div className={styles.formSection}>
                <h3 className={styles.sectionTitle}>Link de Referência</h3>
                
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <span className={styles.labelIcon}><FaLink /></span>
                    URL (opcional)
                  </label>
                  <input
                    type="url"
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    placeholder="https://exemplo.com"
                    className={styles.input}
                  />
                  {formData.link && (
                    <div className={styles.linkPreview}>
                      <FaExternalLinkAlt />
                      <a 
                        href={formData.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.linkPreviewText}
                      >
                        {formData.link}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button onClick={handleCloseModal} className={styles.cancelButton}>
                Cancelar
              </button>
              <button onClick={handleSave} className={styles.saveButton}>
                {editingEntry ? 'Salvar Alterações' : 'Criar Anotação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 