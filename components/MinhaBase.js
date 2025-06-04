import React, { useState, useEffect, useCallback } from 'react';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaExternalLinkAlt, FaTag, FaFilter, FaTimes, FaEye, FaPalette, FaLink, FaFileAlt, FaAlignLeft, FaFolder, FaCalendarAlt, FaUser, FaImage, FaCloudUploadAlt, FaExpand, FaCog, FaDollarSign, FaBug, FaQuestionCircle, FaTicketAlt, FaBookmark } from 'react-icons/fa';
import Swal from 'sweetalert2';
import styles from '../styles/MinhaBase.module.css';

const COLOR_OPTIONS = [
  { color: '#3B82F6', name: 'Azul Primário', cssVar: 'primary' },
  { color: '#EF4444', name: 'Vermelho', cssVar: 'accent1' },
  { color: '#10B981', name: 'Verde', cssVar: 'accent3' },
  { color: '#F59E0B', name: 'Amarelo', cssVar: 'accent2' },
  { color: '#6B7280', name: 'Cinza Escuro', cssVar: 'accent4' },
  { color: '#6B46C1', name: 'Roxo', cssVar: 'custom-purple' },
  { color: '#EC4899', name: 'Rosa', cssVar: 'custom-pink' },
  { color: '#06B6D4', name: 'Azul Claro', cssVar: 'custom-cyan' }
];

const MARKER_OPTIONS = [
  { value: 'tech', name: 'Tech', icon: FaCog, color: '#3B82F6' },
  { value: 'fiscal', name: 'Fiscal', icon: FaFileAlt, color: '#10B981' },
  { value: 'financeiro', name: 'Financeiro', icon: FaDollarSign, color: '#F59E0B' },
  { value: 'bug', name: 'Bug', icon: FaBug, color: '#EF4444' },
  { value: 'rfc', name: 'RFC (ajuda)', icon: FaQuestionCircle, color: '#8B5CF6' },
  { value: 'ticket', name: 'Ticket', icon: FaTicketAlt, color: '#EC4899' }
];

export default function MinhaBase({ user }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterTags, setFilterTags] = useState([]);
  const [filterMarker, setFilterMarker] = useState('');
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
    color: '#3B82F6',
    category: 'geral',
    marker: 'tech',
    images: []
  });

  // Estados da UI
  const [availableTags, setAvailableTags] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

  // Estados para imagens
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

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
        filter_marker: filterMarker,
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
      if (!searchTerm && !filterCategory && !filterMarker && filterTags.length === 0) {
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
        confirmButtonColor: '#3B82F6'
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, searchTerm, filterCategory, filterTags, filterMarker, sortBy, sortDirection]);

  // Verifica se há dados não salvos
  const hasUnsavedData = () => {
    const initialData = {
      title: '',
      description: '',
      link: '',
      tags: [],
      color: '#3B82F6',
      category: 'geral',
      marker: 'tech',
      images: []
    };

    if (editingEntry) {
      return (
        formData.title !== editingEntry.title ||
        formData.description !== editingEntry.description ||
        formData.link !== (editingEntry.link || '') ||
        JSON.stringify(formData.tags) !== JSON.stringify(editingEntry.tags || []) ||
        formData.color !== editingEntry.color ||
        formData.category !== editingEntry.category ||
        formData.marker !== editingEntry.marker ||
        JSON.stringify(formData.images) !== JSON.stringify(editingEntry.images || [])
      );
    }

    return (
      formData.title !== initialData.title ||
      formData.description !== initialData.description ||
      formData.link !== initialData.link ||
      formData.tags.length > 0 ||
      formData.color !== initialData.color ||
      formData.category !== initialData.category ||
      formData.marker !== initialData.marker ||
      formData.images.length > 0
    );
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      link: '',
      tags: [],
      color: '#3B82F6',
      category: 'geral',
      marker: 'tech',
      images: []
    });
    setEditingEntry(null);
    setNewTag('');
    setShowTagSuggestions(false);
    setShowCategorySuggestions(false);
  };

  // Funções para upload de imagens (removendo drag & drop)
  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    setUploadingImages(true);
    const uploadedImages = [];

    try {
      for (const file of files) {
        // Validar tipo de arquivo
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          Swal.fire({
            icon: 'warning',
            title: 'Tipo de arquivo não suportado',
            text: `${file.name} - Use apenas JPEG, PNG, GIF ou WebP`,
            confirmButtonColor: '#3B82F6'
          });
          continue;
        }

        // Validar tamanho (10MB)
        if (file.size > 10 * 1024 * 1024) {
          Swal.fire({
            icon: 'warning',
            title: 'Arquivo muito grande',
            text: `${file.name} - Tamanho máximo: 10MB`,
            confirmButtonColor: '#3B82F6'
          });
          continue;
        }

        // Fazer upload para Imgur
        const formDataUpload = new FormData();
        formDataUpload.append('image', file);
        formDataUpload.append('title', `Imagem - ${formData.title || 'Anotação'}`);

        const response = await fetch('/api/imgur-upload', {
          method: 'POST',
          body: formDataUpload
        });

        const result = await response.json();

        if (result.success) {
          uploadedImages.push(result.image);
        } else {
          throw new Error(result.error || 'Erro no upload');
        }
      }

      // Adicionar imagens ao estado
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedImages]
      }));

      if (uploadedImages.length > 0) {
        Swal.fire({
          icon: 'success',
          title: 'Upload concluído!',
          text: `${uploadedImages.length} imagem(ns) carregada(s)`,
          timer: 2000,
          showConfirmButton: false
        });
      }

    } catch (error) {
      console.error('Erro no upload:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro no upload',
        text: error.message || 'Erro ao fazer upload das imagens',
        confirmButtonColor: '#3B82F6'
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleImageUpload(files);
    e.target.value = ''; // Reset input
  };

  const removeImage = (imageIndex) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== imageIndex)
    }));
  };

  const openLightbox = (image) => {
    setLightboxImage(image);
    setShowLightbox(true);
  };

  const closeLightbox = () => {
    setShowLightbox(false);
    setLightboxImage(null);
  };

  const handleSave = async () => {
    try {
      if (!formData.title.trim() || !formData.description.trim()) {
        Swal.fire({
          icon: 'warning',
          title: 'Campos obrigatórios',
          text: 'Título e descrição são obrigatórios',
          confirmButtonColor: '#3B82F6'
        });
        return;
      }

      const dataToSave = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        link: formData.link?.trim() || '',
        tags: formData.tags.filter(tag => tag.trim() !== ''),
        color: formData.color,
        category: formData.category.trim(),
        marker: formData.marker,
        images: formData.images || []
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
      
      // Reset form and close modal
      resetForm();
      setShowModal(false);
      loadEntries();
      
    } catch (error) {
      console.error('Erro ao salvar:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: error.message || 'Erro ao salvar anotação',
        confirmButtonColor: '#3B82F6'
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
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#6B7280'
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
        confirmButtonColor: '#3B82F6'
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
        category: entry.category,
        marker: entry.marker,
        images: entry.images || []
      });
    } else {
      resetForm();
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
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#3B82F6'
      });

      if (!result.isConfirmed) {
        return;
      }
    }

    resetForm();
    setShowModal(false);
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

  const formatDateTime = (dateString) => {
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

  // Funções para gerenciar filtros
  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterCategory('');
    setFilterMarker('');
    setFilterTags([]);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchTerm) count++;
    if (filterCategory) count++;
    if (filterMarker) count++;
    if (filterTags.length > 0) count++;
    return count;
  };

  const hasActiveFilters = () => {
    return searchTerm || filterCategory || filterMarker || filterTags.length > 0;
  };

  // Função para obter a cor CSS baseada na string de cor
  const getColorValue = (colorString) => {
    if (colorString.startsWith('var(')) {
      return colorString;
    }
    return colorString;
  };

  // Função para obter classe CSS baseada na cor
  const getColorClass = (colorString) => {
    const colorOption = COLOR_OPTIONS.find(opt => opt.color === colorString);
    return colorOption?.cssVar || 'primary';
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

      {/* Controles de busca e filtros modernos */}
      <div className={styles.controlsContainer}>
        {/* Barra de busca principal */}
        <div className={styles.searchSection}>
          <div className={styles.searchContainer}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar em títulos, descrições e tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className={styles.clearSearchButton}
                title="Limpar busca"
              >
                <FaTimes />
              </button>
            )}
          </div>
        </div>

        {/* Seção de filtros e ordenação */}
        <div className={styles.filtersSection}>
          <div className={styles.filtersGroup}>
            {/* Filtro de Categoria */}
            <div className={styles.filterItem}>
              <label className={styles.filterLabel}>
                <FaFolder className={styles.filterIcon} />
                Categoria
              </label>
              <div className={styles.filterDropdown}>
                <div className={`${styles.customSelect} ${filterCategory ? styles.customSelectActive : ''}`}>
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
                  <div className={styles.selectIcon}>
                    <FaFolder />
                  </div>
                  {filterCategory && (
                    <div className={styles.selectedIndicator}>
                      <span className={styles.selectedText}>{filterCategory}</span>
                    </div>
                  )}
                </div>
                {filterCategory && (
                  <button
                    onClick={() => setFilterCategory('')}
                    className={styles.clearFilterButton}
                    title="Limpar filtro"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
            </div>

            {/* Filtro de Marcador */}
            <div className={styles.filterItem}>
              <label className={styles.filterLabel}>
                <FaBookmark className={styles.filterIcon} />
                Marcador
              </label>
              <div className={styles.filterDropdown}>
                <div className={`${styles.customSelect} ${filterMarker ? styles.customSelectActive : ''}`}>
                  <select
                    value={filterMarker}
                    onChange={(e) => setFilterMarker(e.target.value)}
                    className={styles.filterSelect}
                  >
                    <option value="">Todos os marcadores</option>
                    {MARKER_OPTIONS.map(marker => (
                      <option key={marker.value} value={marker.value}>
                        {marker.name}
                      </option>
                    ))}
                  </select>
                  <div className={`${styles.selectIcon} ${filterMarker ? styles.selectIconActive : ''}`}>
                    {filterMarker ? (
                      (() => {
                        const selectedMarker = MARKER_OPTIONS.find(m => m.value === filterMarker);
                        if (selectedMarker) {
                          const IconComponent = selectedMarker.icon;
                          return <IconComponent style={{ color: selectedMarker.color }} />;
                        }
                        return <FaBookmark />;
                      })()
                    ) : (
                      <FaBookmark />
                    )}
                  </div>
                  {filterMarker && (
                    <div className={styles.selectedIndicator}>
                      <span 
                        className={styles.selectedText}
                        style={{ 
                          color: MARKER_OPTIONS.find(m => m.value === filterMarker)?.color || 'inherit'
                        }}
                      >
                        {MARKER_OPTIONS.find(m => m.value === filterMarker)?.name || filterMarker}
                      </span>
                    </div>
                  )}
                </div>
                {filterMarker && (
                  <button
                    onClick={() => setFilterMarker('')}
                    className={styles.clearFilterButton}
                    title="Limpar filtro"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
            </div>

            {/* Botões de ordenação */}
            <div className={styles.sortingGroup}>
              <label className={styles.filterLabel}>
                <FaFilter className={styles.filterIcon} />
                Ordenar por
              </label>
              <div className={styles.sortButtons}>
                <button
                  onClick={() => toggleSort('created_at')}
                  className={`${styles.sortButton} ${sortBy === 'created_at' ? styles.sortButtonActive : ''}`}
                  title="Ordenar por data de criação"
                >
                  <FaCalendarAlt />
                  Data
                  {sortBy === 'created_at' && (
                    <span className={styles.sortDirection}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => toggleSort('title')}
                  className={`${styles.sortButton} ${sortBy === 'title' ? styles.sortButtonActive : ''}`}
                  title="Ordenar por título"
                >
                  <FaFileAlt />
                  Título
                  {sortBy === 'title' && (
                    <span className={styles.sortDirection}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Indicador de filtros ativos e botão de limpar */}
          {hasActiveFilters() && (
            <div className={styles.activeFiltersIndicator}>
              <div className={styles.activeFiltersInfo}>
                <FaFilter className={styles.activeFiltersIcon} />
                <span className={styles.activeFiltersText}>
                  {getActiveFiltersCount()} filtro{getActiveFiltersCount() > 1 ? 's' : ''} ativo{getActiveFiltersCount() > 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={clearAllFilters}
                className={styles.clearAllFiltersButton}
                title="Limpar todos os filtros"
              >
                <FaTimes />
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contador de resultados */}
      {!loading && (
        <div className={styles.resultsCounter}>
          <span>
            {entries.length} anotaç{entries.length === 1 ? 'ão' : 'ões'} encontrada{entries.length === 1 ? '' : 's'}
            {hasActiveFilters() && (
              <span className={styles.resultsFiltered}> (filtrados)</span>
            )}
          </span>
        </div>
      )}

      {/* Grid de anotações com cores melhoradas */}
      <div className={styles.entriesGrid}>
        {entries.map(entry => (
          <div
            key={entry.id}
            className={`${styles.entryCard} ${styles[`entryCard--${getColorClass(entry.color)}`]}`}
            style={{ 
              '--entry-color': getColorValue(entry.color),
              borderLeftColor: getColorValue(entry.color)
            }}
            onClick={() => handleCardClick(entry)}
          >
            <div className={styles.entryHeader}>
              <div className={styles.entryTitleSection}>
                {/* Marcador */}
                {entry.marker && (
                  <div className={styles.entryMarker}>
                    {(() => {
                      const marker = MARKER_OPTIONS.find(m => m.value === entry.marker);
                      if (marker) {
                        const IconComponent = marker.icon;
                        return (
                          <div 
                            className={styles.markerBadge}
                            style={{ backgroundColor: marker.color }}
                            title={marker.name}
                          >
                            <IconComponent />
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
                
                <h3 className={styles.entryTitle}>{entry.title}</h3>
              </div>
              
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

              {/* Indicador de imagens */}
              {entry.images && entry.images.length > 0 && (
                <div className={styles.imageIndicator}>
                  <FaImage className={styles.imageIcon} />
                  <span className={styles.imageCount}>
                    {entry.images.length} imagem{entry.images.length > 1 ? 'ns' : ''}
                  </span>
                </div>
              )}

              {entry.tags && entry.tags.length > 0 && (
                <div className={styles.tagsContainer}>
                  {entry.tags.slice(0, 3).map(tag => (
                    <span key={tag} className={styles.tag} style={{ backgroundColor: getColorValue(entry.color) }}>
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
                <span className={styles.category} style={{ 
                  borderLeftColor: getColorValue(entry.color),
                  background: `${getColorValue(entry.color)}15`
                }}>
                  {entry.category}
                </span>
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

      {/* Modal de Visualização - Design Melhorado */}
      {showViewModal && viewingEntry && (
        <div className={styles.modalOverlay} onClick={handleCloseViewModal}>
          <div className={styles.viewModal} onClick={(e) => e.stopPropagation()}>
            {/* Header do Modal */}
            <div className={styles.viewModalHeader}>
              <div className={styles.viewHeaderContent}>
                <h2 className={styles.viewTitle}>{viewingEntry.title}</h2>
                <div className={styles.viewActions}>
                  <button
                    onClick={() => {
                      handleCloseViewModal();
                      handleOpenModal(viewingEntry);
                    }}
                    className={styles.editIconButton}
                    title="Editar"
                    style={{ backgroundColor: getColorValue(viewingEntry.color) }}
                  >
                    <FaEdit />
                  </button>
                  <button onClick={handleCloseViewModal} className={styles.closeButton}>
                    <FaTimes />
                  </button>
                </div>
              </div>
              
              {/* Meta informações no header */}
              <div className={styles.viewMetaHeader}>
                <div className={styles.viewMetaBadges}>
                  {/* Marcador */}
                  {viewingEntry.marker && (
                    <span 
                      className={styles.viewMarkerBadge}
                      style={{
                        backgroundColor: MARKER_OPTIONS.find(m => m.value === viewingEntry.marker)?.color || '#6B7280',
                        color: 'white'
                      }}
                    >
                      {(() => {
                        const marker = MARKER_OPTIONS.find(m => m.value === viewingEntry.marker);
                        if (marker) {
                          const IconComponent = marker.icon;
                          return (
                            <>
                              <IconComponent /> {marker.name}
                            </>
                          );
                        }
                        return <FaBookmark />;
                      })()}
                    </span>
                  )}
                  
                  <span 
                    className={styles.viewCategoryBadge}
                    style={{ 
                      borderLeftColor: getColorValue(viewingEntry.color),
                      background: `${getColorValue(viewingEntry.color)}15`
                    }}
                  >
                    <FaFolder /> {viewingEntry.category}
                  </span>
                  <span className={styles.viewDateBadge} style={{
                    background: `${getColorValue(viewingEntry.color)}15`,
                    color: getColorValue(viewingEntry.color),
                    borderColor: `${getColorValue(viewingEntry.color)}30`
                  }}>
                    <FaCalendarAlt /> {formatDateTime(viewingEntry.created_at)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Conteúdo do Modal */}
            <div className={styles.viewModalBody}>
              {/* Descrição Principal */}
              <div className={styles.viewMainContent}>
                <div className={styles.viewSectionHeader} style={{ borderBottomColor: getColorValue(viewingEntry.color) }}>
                  <FaAlignLeft className={styles.viewSectionIcon} style={{ color: getColorValue(viewingEntry.color) }} />
                  <span className={styles.viewSectionTitle}>Descrição</span>
                </div>
                <div className={styles.viewDescription}>
                  {viewingEntry.description}
                </div>
              </div>

              {/* Gallery de Imagens */}
              {viewingEntry.images && viewingEntry.images.length > 0 && (
                <div className={styles.viewContentSection}>
                  <div className={styles.viewSectionHeader} style={{ borderBottomColor: getColorValue(viewingEntry.color) }}>
                    <FaImage className={styles.viewSectionIcon} style={{ color: getColorValue(viewingEntry.color) }} />
                    <span className={styles.viewSectionTitle}>
                      Imagens ({viewingEntry.images.length})
                    </span>
                  </div>
                  
                  <div className={styles.imageGallery}>
                    {viewingEntry.images.map((image, index) => (
                      <div 
                        key={index} 
                        className={styles.galleryItem}
                        title={image.title || `Imagem ${index + 1}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openLightbox(image);
                        }}
                      >
                        <img
                          src={image.url}
                          alt={image.title || `Imagem ${index + 1}`}
                          className={styles.galleryImage}
                          loading="lazy"
                          draggable={false}
                        />
                        <div className={styles.galleryOverlay}>
                          <FaExpand className={styles.expandIcon} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Link de Referência */}
              {viewingEntry.link && (
                <div className={styles.viewContentSection}>
                  <div className={styles.viewSectionHeader} style={{ borderBottomColor: getColorValue(viewingEntry.color) }}>
                    <FaLink className={styles.viewSectionIcon} style={{ color: getColorValue(viewingEntry.color) }} />
                    <span className={styles.viewSectionTitle}>Link de Referência</span>
                  </div>
                  <div className={styles.viewLinkCard} style={{ borderLeftColor: getColorValue(viewingEntry.color) }}>
                    <FaExternalLinkAlt className={styles.viewLinkIcon} style={{ color: getColorValue(viewingEntry.color) }} />
                    <a 
                      href={viewingEntry.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={styles.viewLinkText}
                      style={{ color: getColorValue(viewingEntry.color) }}
                    >
                      {viewingEntry.link}
                    </a>
                  </div>
                </div>
              )}

              {/* Tags */}
              {viewingEntry.tags && viewingEntry.tags.length > 0 && (
                <div className={styles.viewContentSection}>
                  <div className={styles.viewSectionHeader} style={{ borderBottomColor: getColorValue(viewingEntry.color) }}>
                    <FaTag className={styles.viewSectionIcon} style={{ color: getColorValue(viewingEntry.color) }} />
                    <span className={styles.viewSectionTitle}>Tags</span>
                  </div>
                  <div className={styles.viewTagsContainer}>
                    {viewingEntry.tags.map(tag => (
                      <span key={tag} className={styles.viewTag} style={{ backgroundColor: getColorValue(viewingEntry.color) }}>
                        <FaTag /> {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer com informações adicionais */}
            {viewingEntry.updated_at !== viewingEntry.created_at && (
              <div className={styles.viewModalFooter}>
                <div className={styles.viewUpdateInfo}>
                  <FaUser className={styles.viewUpdateIcon} style={{ color: getColorValue(viewingEntry.color) }} />
                  <span className={styles.viewUpdateText}>
                    Última atualização: {formatDateTime(viewingEntry.updated_at)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Criação/Edição - Design Melhorado */}
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
              {/* Informações Principais */}
              <div className={styles.formSection}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <span className={styles.labelIcon} style={{ color: getColorValue(formData.color) }}>
                      <FaFileAlt />
                    </span>
                    Título <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Como resolver erro de conexão"
                    className={styles.input}
                    style={{ borderColor: formData.title ? getColorValue(formData.color) : undefined }}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <span className={styles.labelIcon} style={{ color: getColorValue(formData.color) }}>
                      <FaAlignLeft />
                    </span>
                    Descrição <span className={styles.required}>*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva detalhadamente o procedimento ou informação..."
                    rows={4}
                    className={styles.textarea}
                    style={{ borderColor: formData.description ? getColorValue(formData.color) : undefined }}
                  />
                </div>
              </div>

              {/* Upload de Imagens - SEM DRAG & DROP */}
              <div className={styles.formSection}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <span className={styles.labelIcon} style={{ color: getColorValue(formData.color) }}>
                      <FaImage />
                    </span>
                    Imagens
                  </label>
                  
                  {/* Área de Upload simplificada */}
                  <div className={styles.uploadAreaSimple}>
                    <div className={styles.uploadContent}>
                      <FaCloudUploadAlt className={styles.uploadIcon} style={{ color: getColorValue(formData.color) }} />
                      <p className={styles.uploadText}>
                        {uploadingImages ? 'Fazendo upload...' : 'Clique para selecionar imagens'}
                      </p>
                      <p className={styles.uploadSubtext}>
                        JPEG, PNG, GIF, WebP • Máximo 10MB por arquivo
                      </p>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileSelect}
                        className={styles.fileInput}
                        disabled={uploadingImages}
                      />
                    </div>
                  </div>

                  {/* Preview das Imagens */}
                  {formData.images.length > 0 && (
                    <div className={styles.imagePreviewContainer}>
                      <span className={styles.previewLabel} style={{ color: getColorValue(formData.color) }}>
                        Imagens adicionadas ({formData.images.length}):
                      </span>
                      <div className={styles.imagePreviewGrid}>
                        {formData.images.map((image, index) => (
                          <div key={index} className={styles.imagePreviewItem}>
                            <img
                              src={image.url}
                              alt={image.title || `Imagem ${index + 1}`}
                              className={styles.previewImage}
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className={styles.removeImageButton}
                              title="Remover imagem"
                            >
                              <FaTimes />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Organização */}
              <div className={styles.formSection}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      <span className={styles.labelIcon} style={{ color: getColorValue(formData.color) }}>
                        <FaBookmark />
                      </span>
                      Marcador
                    </label>
                    <select
                      value={formData.marker}
                      onChange={(e) => setFormData({ ...formData, marker: e.target.value })}
                      className={styles.filterSelect}
                      style={{ borderColor: getColorValue(formData.color) }}
                    >
                      {MARKER_OPTIONS.map(marker => {
                        const IconComponent = marker.icon;
                        return (
                          <option key={marker.value} value={marker.value}>
                            {marker.name}
                          </option>
                        );
                      })}
                    </select>
                    
                    {/* Preview do marcador selecionado */}
                    <div className={styles.markerPreview}>
                      {(() => {
                        const selectedMarker = MARKER_OPTIONS.find(m => m.value === formData.marker);
                        if (selectedMarker) {
                          const IconComponent = selectedMarker.icon;
                          return (
                            <div 
                              className={styles.markerPreviewBadge}
                              style={{ backgroundColor: selectedMarker.color }}
                            >
                              <IconComponent /> {selectedMarker.name}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      <span className={styles.labelIcon} style={{ color: getColorValue(formData.color) }}>
                        <FaFolder />
                      </span>
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
                        style={{ borderColor: formData.category !== 'geral' ? getColorValue(formData.color) : undefined }}
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
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <span className={styles.labelIcon} style={{ color: getColorValue(formData.color) }}>
                      <FaPalette />
                    </span>
                    Cor da Categoria
                  </label>
                  <div className={styles.colorSelector}>
                    <div className={styles.selectedColor}>
                      <div 
                        className={styles.colorPreview}
                        style={{ backgroundColor: getColorValue(formData.color) }}
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
                          style={{ backgroundColor: getColorValue(option.color) }}
                          onClick={() => setFormData({ ...formData, color: option.color })}
                          title={option.name}
                          type="button"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className={styles.formSection}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <span className={styles.labelIcon} style={{ color: getColorValue(formData.color) }}>
                      <FaTag />
                    </span>
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
                        style={{ 
                          backgroundColor: getColorValue(formData.color),
                          borderColor: getColorValue(formData.color)
                        }}
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
                      <span className={styles.tagsDisplayLabel} style={{ color: getColorValue(formData.color) }}>
                        Tags adicionadas:
                      </span>
                      <div className={styles.tagsList}>
                        {formData.tags.map(tag => (
                          <span key={tag} className={styles.formTag} style={{ backgroundColor: getColorValue(formData.color) }}>
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

              {/* Link de Referência */}
              <div className={styles.formSection}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <span className={styles.labelIcon} style={{ color: getColorValue(formData.color) }}>
                      <FaLink />
                    </span>
                    URL (opcional)
                  </label>
                  <input
                    type="url"
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    placeholder="https://exemplo.com"
                    className={styles.input}
                    style={{ borderColor: formData.link ? getColorValue(formData.color) : undefined }}
                  />
                  {formData.link && (
                    <div className={styles.linkPreview} style={{ borderLeftColor: getColorValue(formData.color) }}>
                      <FaExternalLinkAlt style={{ color: getColorValue(formData.color) }} />
                      <a 
                        href={formData.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.linkPreviewText}
                        style={{ color: getColorValue(formData.color) }}
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
              <button 
                onClick={handleSave} 
                className={styles.saveButton}
                disabled={uploadingImages}
                style={{ 
                  backgroundColor: getColorValue(formData.color),
                  borderColor: getColorValue(formData.color)
                }}
              >
                {uploadingImages ? 'Fazendo upload...' : (editingEntry ? 'Salvar Alterações' : 'Criar Anotação')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox para visualização de imagens */}
      {showLightbox && lightboxImage && (
        <div className={styles.lightboxOverlay} onClick={closeLightbox}>
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <button onClick={closeLightbox} className={styles.lightboxClose}>
              <FaTimes />
            </button>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.title || 'Imagem'}
              className={styles.lightboxImage}
            />
            <div className={styles.lightboxInfo}>
              <p>
                {lightboxImage.size && `${Math.round(lightboxImage.size / 1024)}KB`}
                {lightboxImage.width && lightboxImage.height && 
                  ` • ${lightboxImage.width}x${lightboxImage.height}px`
                }
                {(!lightboxImage.size && !lightboxImage.width && !lightboxImage.height) && 
                  'Clique fora da imagem para fechar'
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 