import React, { useState, useEffect, useCallback } from 'react';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaPlay, FaEye, FaTag, FaFilter, FaTimes, FaFolder, FaCalendarAlt, FaUser, FaVideo, FaFileAlt, FaAlignLeft, FaLink, FaExpand, FaCompress, FaCog, FaCheck, FaChevronUp, FaChevronDown } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { ThreeDotsLoader } from './LoadingIndicator';
import styles from '../styles/BibliotecaVideos.module.css';



export default function BibliotecaVideos({ user }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterTags, setFilterTags] = useState([]);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [viewingVideo, setViewingVideo] = useState(null);

  // Estados do formulário
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    videoUrl: '',
    tags: [],
    category: 'geral',
    fileSize: '',
    shareType: 'internal'
  });

  // Estados para gerenciamento de categorias
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);

  // Estados da UI
  const [availableTags, setAvailableTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [videoPlayer, setVideoPlayer] = useState({
    isFullscreen: false,
    currentVideoId: null
  });

  // Verificar se o usuário pode adicionar vídeos
  const canAddVideos = ['analyst', 'tax'].includes(user?.profile);

  // Carrega categorias apenas uma vez
  useEffect(() => {
    if (user?.id && categories.length === 0) {
      loadCategories();
    }
  }, [user?.id]);

  // Carrega dados iniciais
  useEffect(() => {
    if (user?.id) {
      loadVideos();
    }
  }, [user, searchTerm, filterCategory, filterTags, sortBy, sortDirection]);

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.autocomplete-container')) {
        setShowTagSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sistema de Toast
  const showToast = (message, type = 'success') => {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: 'var(--bg-secondary)',
      color: 'var(--text-color)',
      padding: '16px 20px',
      showClass: {
        popup: 'animate__animated animate__slideInRight animate__faster'
      },
      hideClass: {
        popup: 'animate__animated animate__slideOutRight animate__faster'
      }
    });

    Toast.fire({
      icon: type,
      title: message
    });
  };

  // Função para confirmação
  const showConfirmation = async (title, text, confirmText = 'Sim', cancelText = 'Cancelar') => {
    const result = await Swal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      background: 'var(--bg-secondary)',
      color: 'var(--text-color)'
    });
    return result.isConfirmed;
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/video-categories');
      
      if (!response.ok) {
        throw new Error('Erro ao carregar categorias');
      }

      const data = await response.json();
      setCategories(data.categories || []);
      
      // Se não há categoria selecionada no form e há categorias disponíveis, selecionar a primeira
      if (!formData.category && data.categories && data.categories.length > 0) {
        setFormData(prev => ({
          ...prev,
          category: data.categories[0].value
        }));
      }
      
    } catch (error) {
      showToast('Erro ao carregar categorias', 'error');
    }
  };

  const loadVideos = useCallback(async () => {
    try {
      setLoading(true);
      
      const queryParams = new URLSearchParams({
        search_term: searchTerm,
        filter_category: filterCategory,
        filter_tags: filterTags.join(','),
        order_by: sortBy,
        order_direction: sortDirection
      });

      const response = await fetch(`/api/video-library?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar vídeos');
      }

      const data = await response.json();
      setVideos(data.videos || []);
      
      // Extrai tags de todos os vídeos
      if (!searchTerm && !filterCategory && filterTags.length === 0) {
        const allTags = new Set();
        
        data.videos?.forEach(video => {
          video.tags?.forEach(tag => allTags.add(tag));
        });
        
        setAvailableTags([...allTags].sort());
      }
      
    } catch (error) {
      showToast('Erro ao carregar biblioteca de vídeos', 'error');
    } finally {
      setTimeout(() => {
        setLoading(false);
        setInitialLoad(false);
      }, 300);
    }
  }, [user?.id, searchTerm, filterCategory, filterTags, sortBy, sortDirection]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      videoUrl: '',
      tags: [],
      category: categories.length > 0 ? categories[0].value : '',
      fileSize: '',
      shareType: 'internal'
    });
    setEditingVideo(null);
    setNewTag('');
    setShowTagSuggestions(false);
  };

  const handleSave = async () => {
    try {
      if (!formData.title.trim()) {
        showToast('Título é obrigatório', 'warning');
        return;
      }

      if (!formData.description.trim()) {
        showToast('Descrição é obrigatória', 'warning');
        return;
      }

      if (!formData.videoUrl.trim()) {
        showToast('URL do vídeo é obrigatória', 'warning');
        return;
      }

      const dataToSave = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        videoUrl: formData.videoUrl.trim(),
        tags: formData.tags.filter(tag => tag.trim() !== ''),
        category: formData.category.trim(),
        fileSize: formData.fileSize?.trim() || null,
        shareType: formData.shareType
      };

      const method = editingVideo ? 'PUT' : 'POST';
      const endpoint = editingVideo 
        ? `/api/video-library/${editingVideo.id}`
        : '/api/video-library';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao salvar vídeo');
      }

      showToast(editingVideo ? 'Vídeo atualizado com sucesso!' : 'Vídeo adicionado com sucesso!', 'success');
      
      resetForm();
      setShowModal(false);
      loadVideos();
      
    } catch (error) {
      showToast(error.message || 'Erro ao salvar vídeo', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      const confirmed = await showConfirmation(
        'Tem certeza?',
        'Esta ação não pode ser desfeita',
        'Sim, excluir',
        'Cancelar'
      );

      if (!confirmed) return;

      const response = await fetch(`/api/video-library/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir vídeo');
      }

      showToast('Vídeo excluído com sucesso', 'success');
      loadVideos();
      
    } catch (error) {
      showToast('Erro ao excluir vídeo', 'error');
    }
  };

  const handleViewVideo = async (video) => {
    setViewingVideo(video);
    setShowViewModal(true);

    // Registrar visualização
    try {
      await fetch(`/api/video-library/${video.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'view' })
      });
    } catch (error) {
      // Falha silenciosa na visualização
    }
  };

  const handleOpenModal = (video = null) => {
    if (video) {
      setEditingVideo(video);
      setFormData({
        title: video.title,
        description: video.description,
        videoUrl: video.video_url || '',
        tags: video.tags || [],
        category: video.category,
        fileSize: video.file_size || '',
        shareType: video.share_type || 'internal'
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    resetForm();
    setShowModal(false);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setViewingVideo(null);
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

  // Funções para gerenciar categorias
  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      const categoryValue = newCategoryName.trim().toLowerCase().replace(/\s+/g, '-');
      
      const response = await fetch('/api/video-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          value: categoryValue,
          userId: user.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar categoria');
      }

      showToast('Categoria criada com sucesso!', 'success');
      setNewCategoryName('');
      loadCategories(); // Recarregar categorias
      
    } catch (error) {
      showToast(error.message || 'Erro ao criar categoria', 'error');
    }
  };

  const editCategory = (category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
  };

  const saveEditCategory = async () => {
    if (!newCategoryName.trim() || !editingCategory) return;
    
    try {
      const response = await fetch(`/api/video-categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName.trim()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao atualizar categoria');
      }

      showToast('Categoria atualizada com sucesso!', 'success');
      setEditingCategory(null);
      setNewCategoryName('');
      loadCategories(); // Recarregar categorias
      
    } catch (error) {
      showToast(error.message || 'Erro ao atualizar categoria', 'error');
    }
  };

  const deleteCategory = async (categoryId) => {
    try {
      const confirmed = await showConfirmation(
        'Excluir categoria?',
        'Esta ação não pode ser desfeita. Vídeos associados a esta categoria não poderão ser excluídos.',
        'Sim, excluir',
        'Cancelar'
      );

      if (!confirmed) return;

      const response = await fetch(`/api/video-categories/${categoryId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao excluir categoria');
      }

      showToast('Categoria excluída com sucesso!', 'success');
      loadCategories(); // Recarregar categorias
      loadVideos(); // Recarregar vídeos para atualizar as categorias
      
    } catch (error) {
      showToast(error.message || 'Erro ao excluir categoria', 'error');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
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

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterCategory('');
    setFilterTags([]);
  };

  const hasActiveFilters = () => {
    return searchTerm || filterCategory || filterTags.length > 0;
  };

  const getCategoryName = (categoryValue) => {
    const category = categories.find(cat => cat.value === categoryValue);
    return category?.name || categoryValue;
  };

  const getCategoryColor = (categoryValue) => {
    const colors = {
      'geral': 'var(--color-primary)',
      'suporte-tecnico': 'var(--color-accent2)',
      'fiscal': 'var(--color-accent1)',
      'financeiro': 'var(--color-accent3)',
      'onboarding': 'var(--color-accent4)',
      'treinamento': '#6B46C1',
      'produto': '#EC4899',
      'procedimentos': '#06B6D4'
    };
    return colors[categoryValue] || 'var(--color-primary)';
  };

  const toggleFullscreen = (videoId) => {
    setVideoPlayer(prev => ({
      isFullscreen: !prev.isFullscreen,
      currentVideoId: prev.isFullscreen ? null : videoId
    }));
  };

  const getShareTypeInfo = (shareType) => {
    const shareTypes = {
      'internal': {
        label: 'Uso Interno',
        icon: 'fa-lock',
        color: '#EF4444',
        background: 'rgba(239, 68, 68, 0.1)',
        description: 'Apenas para uso interno da equipe'
      },
      'shareable': {
        label: 'Compartilhável',
        icon: 'fa-share-alt',
        color: '#10B981',
        background: 'rgba(16, 185, 129, 0.1)',
        description: 'Pode ser compartilhado externamente'
      }
    };
    return shareTypes[shareType] || shareTypes['internal'];
  };

  if (initialLoad) {
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
          <h1 className={styles.title}>
            <FaVideo /> Biblioteca de Vídeos
          </h1>
          <p className={styles.subtitle}>
            Vídeos explicativos e tutoriais para consulta rápida
          </p>
        </div>

        {canAddVideos && (
          <div className={styles.headerActions}>
            <button
              onClick={() => setShowCategoryModal(true)}
              className={styles.secondaryButton}
            >
              <FaCog /> Categorias
            </button>
            <button
              onClick={() => handleOpenModal()}
              className={styles.addButton}
            >
              <FaPlus /> Novo Vídeo
            </button>
          </div>
        )}
      </div>

      {/* Controles de busca e filtros */}
      <div className={styles.controlsContainer}>
        <div className={styles.searchSection}>
          <div className={styles.searchContainer}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar em títulos e descrições..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className={styles.clearSearchButton}
              >
                <FaTimes />
              </button>
            )}
          </div>
        </div>

        <div className={styles.filtersSection}>
          <div className={styles.filtersGroup}>
            {/* Filtro de Categoria */}
            <div className={styles.filterItem}>
              <label className={styles.filterLabel}>
                <FaFolder className={styles.filterIcon} />
                Categoria
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="">Todas as categorias</option>
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Ordenação */}
            <div className={styles.sortingGroup}>
              <label className={styles.filterLabel}>
                <FaFilter className={styles.filterIcon} />
                Ordenar por
              </label>
              <div className={styles.sortButtons}>
                <button
                  onClick={() => toggleSort('created_at')}
                  className={`${styles.sortButton} ${sortBy === 'created_at' ? styles.sortButtonActive : ''}`}
                >
                  <FaCalendarAlt />
                  Data
                  {sortBy === 'created_at' && (
                    <span className={styles.sortDirection}>
                      {sortDirection === 'asc' ? <FaChevronUp /> : <FaChevronDown />}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => toggleSort('title')}
                  className={`${styles.sortButton} ${sortBy === 'title' ? styles.sortButtonActive : ''}`}
                >
                  <FaFileAlt />
                  Título
                  {sortBy === 'title' && (
                    <span className={styles.sortDirection}>
                      {sortDirection === 'asc' ? <FaChevronUp /> : <FaChevronDown />}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => toggleSort('view_count')}
                  className={`${styles.sortButton} ${sortBy === 'view_count' ? styles.sortButtonActive : ''}`}
                >
                  <FaEye />
                  Visualizações
                  {sortBy === 'view_count' && (
                    <span className={styles.sortDirection}>
                      {sortDirection === 'asc' ? <FaChevronUp /> : <FaChevronDown />}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {hasActiveFilters() && (
            <div className={styles.activeFiltersIndicator}>
              <div className={styles.activeFiltersInfo}>
                <FaFilter className={styles.activeFiltersIcon} />
                <span className={styles.activeFiltersText}>
                  Filtros ativos aplicados
                </span>
              </div>
              <button
                onClick={clearAllFilters}
                className={styles.clearAllFiltersButton}
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
          <span className={hasActiveFilters() ? styles.resultsFiltered : ''}>
            {videos.length} vídeo{videos.length === 1 ? '' : 's'} encontrado{videos.length === 1 ? '' : 's'}
            {hasActiveFilters() && ' (filtrado)'}
          </span>
        </div>
      )}

      {/* Grid de vídeos */}
      <div className={styles.videosGrid}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <ThreeDotsLoader size="medium" />
          </div>
        ) : (
          videos.map(video => (
            <div
              key={video.id}
              className={styles.videoCard}
            >
              {/* Thumbnail/Preview */}
              <div className={styles.videoThumbnail} onClick={() => handleViewVideo(video)}>
                {video.thumbnail_url ? (
                  <img 
                    src={video.thumbnail_url} 
                    alt={video.title}
                    className={styles.thumbnailImage}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={styles.thumbnailPlaceholder} style={{ display: video.thumbnail_url ? 'none' : 'flex' }}>
                  <FaVideo className={styles.videoIcon} />
                </div>
                <div className={styles.playOverlay}>
                  <FaPlay className={styles.playIcon} />
                </div>

              </div>

              {/* Conteúdo do Card */}
              <div className={styles.videoContent}>
                <div className={styles.videoHeader}>
                  <h3 className={styles.videoTitle}>{video.title}</h3>
                  <div className={styles.videoActions}>
                    {['analyst', 'tax', 'super'].includes(user?.profile) && (video.created_by === user.id || user.profile === 'super') && (
                      <>
                        <button
                          onClick={() => handleOpenModal(video)}
                          className={styles.editButton}
                          title="Editar"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(video.id)}
                          className={styles.deleteButton}
                          title="Excluir"
                        >
                          <FaTrash />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <p className={styles.videoDescription}>
                  {video.description && video.description.length > 120 
                    ? `${video.description.substring(0, 120)}...` 
                    : video.description
                  }
                </p>

                {video.tags && video.tags.length > 0 && (
                  <div className={styles.tagsContainer}>
                    {video.tags.slice(0, 3).map(tag => (
                      <span key={tag} className={styles.tag}>
                        <FaTag /> {tag}
                      </span>
                    ))}
                    {video.tags.length > 3 && (
                      <span className={styles.moreTagsIndicator}>
                        +{video.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                <div className={styles.videoFooter}>
                  <div className={styles.videoMeta}>
                    <span 
                      className={styles.category}
                      style={{ 
                        borderLeftColor: getCategoryColor(video.category),
                        background: `${getCategoryColor(video.category)}15`
                      }}
                    >
                      {getCategoryName(video.category)}
                    </span>
                    <span 
                      className={styles.shareTypeBadge}
                      style={{
                        color: getShareTypeInfo(video.share_type).color,
                        background: getShareTypeInfo(video.share_type).background,
                        borderColor: getShareTypeInfo(video.share_type).color
                      }}
                      title={getShareTypeInfo(video.share_type).description}
                    >
                      <i className={`fa-solid ${getShareTypeInfo(video.share_type).icon}`}></i>
                      {getShareTypeInfo(video.share_type).label}
                    </span>
                    <span className={styles.author}>por {video.author_name}</span>
                  </div>
                  <div className={styles.videoStats}>
                    <span className={styles.views}>
                      <FaEye /> {video.view_count || 0}
                    </span>
                    <span className={styles.date}>{formatDate(video.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Estado vazio */}
      {!loading && videos.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🎥</div>
          <h3>Nenhum vídeo encontrado</h3>
          <p>
            {hasActiveFilters()
              ? 'Tente ajustar os filtros de busca'
              : 'A biblioteca de vídeos ainda não possui conteúdo'
            }
          </p>
          {canAddVideos && !hasActiveFilters() && (
            <button
              onClick={() => handleOpenModal()}
              className={styles.primaryButton}
            >
              <FaPlus /> Adicionar primeiro vídeo
            </button>
          )}
        </div>
      )}

      {/* Modal de Visualização */}
      {showViewModal && viewingVideo && (
        <div className={styles.modalOverlay} onClick={handleCloseViewModal}>
          <div 
            className={`${styles.viewModal} ${videoPlayer.isFullscreen ? styles.fullscreenModal : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.viewModalHeader}>
              <h2 className={styles.viewTitle}>{viewingVideo.title}</h2>
              <div className={styles.viewActions}>
                <button
                  onClick={() => toggleFullscreen(viewingVideo.id)}
                  className={styles.fullscreenButton}
                  title={videoPlayer.isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                >
                  {videoPlayer.isFullscreen ? <FaCompress /> : <FaExpand />}
                </button>
                <button onClick={handleCloseViewModal} className={styles.closeButton}>
                  <FaTimes />
                </button>
              </div>
            </div>
            
            <div className={styles.viewModalBody}>
              {/* Player de Vídeo */}
              <div className={styles.videoPlayerContainer}>
                <iframe
                  src={viewingVideo.video_url}
                  className={styles.videoPlayer}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={viewingVideo.title}
                />
              </div>

              {/* Informações do Vídeo */}
              <div className={styles.videoInfo}>
                <div className={styles.videoMetaInfo}>
                  <div className={styles.metaItem}>
                    <FaUser /> <span>{viewingVideo.author_name}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <FaCalendarAlt /> <span>{formatDateTime(viewingVideo.created_at)}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <FaEye /> <span>{viewingVideo.view_count || 0} visualizações</span>
                  </div>

                </div>

                <div className={styles.videoDescription}>
                  <h4>Descrição:</h4>
                  <p>{viewingVideo.description}</p>
                </div>

                {viewingVideo.tags && viewingVideo.tags.length > 0 && (
                  <div className={styles.videoTags}>
                    <h4>Tags:</h4>
                    <div className={styles.tagsContainer}>
                      {viewingVideo.tags.map(tag => (
                        <span key={tag} className={styles.tag}>
                          <FaTag /> {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className={styles.shareTypeInfo}>
                  <h4>Tipo de Uso:</h4>
                  <div 
                    className={styles.shareTypeDisplay}
                    style={{
                      color: getShareTypeInfo(viewingVideo.share_type).color,
                      background: getShareTypeInfo(viewingVideo.share_type).background,
                      borderColor: getShareTypeInfo(viewingVideo.share_type).color
                    }}
                  >
                    <i className={`fa-solid ${getShareTypeInfo(viewingVideo.share_type).icon}`}></i>
                    <div>
                      <strong>{getShareTypeInfo(viewingVideo.share_type).label}</strong>
                      <small>{getShareTypeInfo(viewingVideo.share_type).description}</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação/Edição Moderno */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={(e) => {
          if (e.target === e.currentTarget) handleCloseModal();
        }}>
          <div className={styles.modernModal} onClick={(e) => e.stopPropagation()}>
            {/* Header Moderno */}
            <div className={styles.modernModalHeader}>
              <div className={styles.modalHeaderContent}>
                <div className={styles.modalIcon}>
                  {editingVideo ? <FaEdit /> : <FaPlus />}
                </div>
                <div className={styles.modalTitleSection}>
                  <h2 className={styles.modalTitle}>
                    {editingVideo ? 'Editar Vídeo' : 'Novo Vídeo'}
                  </h2>
                  <p className={styles.modalSubtitle}>
                    {editingVideo 
                      ? 'Atualize as informações do vídeo' 
                      : 'Adicione um novo vídeo à biblioteca'
                    }
                  </p>
                </div>
              </div>
              <button onClick={handleCloseModal} className={styles.modernCloseButton}>
                <FaTimes />
              </button>
            </div>
            
            {/* Content com Seções Organizadas */}
            <div className={styles.modernModalContent}>
              {/* Seção 1: Informações Básicas */}
              <div className={styles.formSection}>
                <div className={styles.sectionHeader}>
                  <FaFileAlt className={styles.sectionIcon} />
                  <h3 className={styles.sectionTitle}>Informações Básicas</h3>
                </div>
                
                <div className={styles.sectionContent}>
                  <div className={styles.modernFormGroup}>
                    <label className={styles.modernFormLabel}>
                      Título do Vídeo <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ex: Como resolver problemas de conexão"
                      className={styles.modernInput}
                    />
                  </div>

                  <div className={styles.modernFormGroup}>
                    <label className={styles.modernFormLabel}>
                      Descrição <span className={styles.required}>*</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descreva o conteúdo do vídeo de forma clara e objetiva..."
                      rows={4}
                      className={styles.modernTextarea}
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Configurações do Vídeo */}
              <div className={styles.formSection}>
                <div className={styles.sectionHeader}>
                  <FaVideo className={styles.sectionIcon} />
                  <h3 className={styles.sectionTitle}>Configurações do Vídeo</h3>
                </div>
                
                <div className={styles.sectionContent}>
                  <div className={styles.modernFormGroup}>
                    <label className={styles.modernFormLabel}>
                      URL do Google Drive <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.inputWithIcon}>
                      <FaLink className={styles.inputIcon} />
                      <input
                        type="url"
                        value={formData.videoUrl}
                        onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                        placeholder="https://drive.google.com/file/d/..."
                        className={styles.modernInputWithIcon}
                      />
                    </div>
                    <small className={styles.modernHelpText}>
                      <i className="fa-solid fa-info-circle"></i>
                      Cole o link de compartilhamento do vídeo no Google Drive
                    </small>
                  </div>

                  <div className={styles.modernFormRow}>
                    <div className={styles.modernFormGroup}>
                      <label className={styles.modernFormLabel}>
                        Categoria
                      </label>
                      <div className={styles.selectWrapper}>
                        <FaFolder className={styles.selectIcon} />
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className={styles.modernSelect}
                        >
                          {categories.map(category => (
                            <option key={category.value} value={category.value}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className={styles.modernFormGroup}>
                      <label className={styles.modernFormLabel}>
                        Tamanho do Arquivo
                      </label>
                      <div className={styles.inputWithIcon}>
                        <i className="fa-solid fa-hard-drive" style={{ fontSize: '14px' }}></i>
                        <input
                          type="text"
                          value={formData.fileSize}
                          onChange={(e) => setFormData({ ...formData, fileSize: e.target.value })}
                          placeholder="Ex: 150MB"
                          className={styles.modernInputWithIcon}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 3: Tipo de Compartilhamento */}
              <div className={styles.formSection}>
                <div className={styles.sectionHeader}>
                  <i className="fa-solid fa-shield-alt" style={{ fontSize: '16px' }}></i>
                  <h3 className={styles.sectionTitle}>Tipo de Compartilhamento</h3>
                </div>
                
                <div className={styles.sectionContent}>
                  <div className={styles.modernShareTypeContainer}>
                    <label className={`${styles.modernShareTypeOption} ${formData.shareType === 'internal' ? styles.modernShareTypeSelected : ''}`}>
                      <input
                        type="radio"
                        name="shareType"
                        value="internal"
                        checked={formData.shareType === 'internal'}
                        onChange={(e) => setFormData({ ...formData, shareType: e.target.value })}
                        className={styles.shareTypeRadio}
                      />
                      <div className={styles.modernShareTypeContent}>
                        <div className={styles.shareTypeIconWrapper} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                          <i className="fa-solid fa-lock" style={{ color: '#EF4444' }}></i>
                        </div>
                        <div className={styles.shareTypeInfo}>
                          <strong>Uso Interno</strong>
                          <small>Restrito à equipe interna</small>
                        </div>
                        <div className={styles.radioIndicator}></div>
                      </div>
                    </label>
                    
                    <label className={`${styles.modernShareTypeOption} ${formData.shareType === 'shareable' ? styles.modernShareTypeSelected : ''}`}>
                      <input
                        type="radio"
                        name="shareType"
                        value="shareable"
                        checked={formData.shareType === 'shareable'}
                        onChange={(e) => setFormData({ ...formData, shareType: e.target.value })}
                        className={styles.shareTypeRadio}
                      />
                      <div className={styles.modernShareTypeContent}>
                        <div className={styles.shareTypeIconWrapper} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                          <i className="fa-solid fa-share-alt" style={{ color: '#10B981' }}></i>
                        </div>
                        <div className={styles.shareTypeInfo}>
                          <strong>Compartilhável</strong>
                          <small>Pode ser compartilhado externamente</small>
                        </div>
                        <div className={styles.radioIndicator}></div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Seção 4: Tags e Categorização */}
              <div className={styles.formSection}>
                <div className={styles.sectionHeader}>
                  <FaTag className={styles.sectionIcon} />
                  <h3 className={styles.sectionTitle}>Tags e Categorização</h3>
                </div>
                
                <div className={styles.sectionContent}>
                  <div className={styles.modernFormGroup}>
                    <label className={styles.modernFormLabel}>
                      Tags
                    </label>
                    <div className={`${styles.modernAutocompleteContainer} autocomplete-container`}>
                      <div className={styles.modernTagsInput}>
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => {
                            setNewTag(e.target.value);
                            setShowTagSuggestions(true);
                          }}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                          onFocus={() => setShowTagSuggestions(true)}
                          placeholder="Digite uma tag e pressione Enter..."
                          className={styles.modernTagInput}
                        />
                        <button 
                          onClick={() => handleAddTag()} 
                          className={styles.modernAddTagButton}
                          type="button"
                        >
                          <FaPlus />
                        </button>
                      </div>
                      {showTagSuggestions && getFilteredTags().length > 0 && (
                        <div className={styles.modernSuggestions}>
                          {getFilteredTags().slice(0, 5).map(tag => (
                            <div
                              key={tag}
                              className={styles.modernSuggestionItem}
                              onClick={() => handleAddTag(tag)}
                            >
                              <FaTag /> {tag}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {formData.tags.length > 0 && (
                      <div className={styles.modernTagsDisplay}>
                        {formData.tags.map(tag => (
                          <span key={tag} className={styles.modernFormTag}>
                            <FaTag /> {tag}
                            <button 
                              onClick={() => handleRemoveTag(tag)}
                              type="button"
                              className={styles.modernRemoveTagButton}
                            >
                              <FaTimes />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Moderno */}
            <div className={styles.modernModalFooter}>
              <button onClick={handleCloseModal} className={styles.modernCancelButton}>
                <FaTimes />
                Cancelar
              </button>
              <button onClick={handleSave} className={styles.modernSaveButton}>
                {editingVideo ? <FaEdit /> : <FaPlus />}
                {editingVideo ? 'Salvar Alterações' : 'Adicionar Vídeo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gerenciamento de Categorias */}
      {showCategoryModal && (
        <div className={styles.modalOverlay} onClick={(e) => {
          if (e.target === e.currentTarget) setShowCategoryModal(false);
        }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Gerenciar Categorias</h2>
              <button onClick={() => setShowCategoryModal(false)} className={styles.closeButton}>
                <FaTimes />
              </button>
            </div>
            
            <div className={styles.modalContent}>
              {/* Adicionar nova categoria */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <FaPlus /> Nova Categoria
                </label>
                <div className={styles.categoryInputGroup}>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nome da categoria"
                    className={styles.input}
                    onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                  />
                  <button 
                    onClick={addCategory} 
                    className={styles.addButton}
                    disabled={!newCategoryName.trim()}
                  >
                    <FaPlus /> Adicionar
                  </button>
                </div>
              </div>

              {/* Lista de categorias existentes */}
              <div className={styles.categoriesList}>
                <h4>Categorias Existentes:</h4>
                {categories.map(category => (
                  <div key={category.id} className={styles.categoryItem}>
                    {editingCategory?.id === category.id ? (
                      <div className={styles.categoryEditGroup}>
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className={styles.input}
                          onKeyPress={(e) => e.key === 'Enter' && saveEditCategory()}
                        />
                        <button onClick={saveEditCategory} className={styles.saveButton}>
                          <FaCheck />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingCategory(null);
                            setNewCategoryName('');
                          }} 
                          className={styles.cancelButton}
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ) : (
                      <div className={styles.categoryDisplay}>
                        <span className={styles.categoryName}>
                          {category.name}
                          {category.is_default && (
                            <span className={styles.defaultBadge}>Padrão</span>
                          )}
                        </span>
                        <div className={styles.categoryActions}>
                          {!category.is_default && (
                            <button 
                              onClick={() => editCategory(category)}
                              className={styles.editButton}
                              title="Editar categoria"
                            >
                              <FaEdit />
                            </button>
                          )}
                          {!category.is_default && (
                            <button 
                              onClick={() => deleteCategory(category.id)}
                              className={styles.deleteButton}
                              title="Excluir categoria"
                            >
                              <FaTrash />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button onClick={() => setShowCategoryModal(false)} className={styles.primaryButton}>
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 