import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import { FaInbox, FaPlus } from 'react-icons/fa';

import { MessageProvider } from '../shared-messages/MessageContext';
import SearchBar from '../shared-messages/SearchBar';
import MessageList from '../shared-messages/MessageList';
import MessageForm from '../shared-messages/MessageForm';
import { LoadingIndicator, EmptyState } from '../ui';
import MessageTabs from '../shared-messages/MessageTabs';
import MessageFilters from '../shared-messages/MessageFilters';

// Importar apenas os estilos que realmente são usados neste componente
import layoutStyles from '../../styles/shared-messages/Layout.module.css';
import utilityStyles from '../../styles/shared-messages/Utilities.module.css';

// Constantes
const POPULAR_THRESHOLD = 5;
const ITEMS_PER_PAGE = 8;

const SharedMessages = ({ user }) => {
  // Estados principais
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMessages, setTotalMessages] = useState(0);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' ou 'list'
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'oldest', 'popular'

  // Estados para o formulário
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: '',
    isPublic: false
  });

  // Função para separar mensagens populares
  const separateMessages = useCallback((messagesArray) => {
    const popular = messagesArray.filter(msg => msg.favorites_count >= POPULAR_THRESHOLD);
    const regular = messagesArray.filter(msg => msg.favorites_count < POPULAR_THRESHOLD);
    return { popular, regular };
  }, []);

  // Carregar mensagens com base na tab ativa e filtros
  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      let endpoint = '/api/shared-messages';
      
      if (currentTab === 1) {
        endpoint = '/api/shared-messages/user';
      } else if (currentTab === 2) {
        endpoint = '/api/shared-messages/favorites';
      }
  
      // Preparar query parameters para a API
      const queryParams = new URLSearchParams({
        searchTerm,
        tags: selectedTags.map(tag => tag.value).join(','),
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        sortOrder
      });
  
      const response = await fetch(`${endpoint}?${queryParams}`);
      if (!response.ok) throw new Error('Erro ao carregar mensagens');
      
      const data = await response.json();
      
      // Garantir que temos um array de mensagens
      const messagesArray = data.messages || [];
      
      // Ordenar mensagens localmente conforme o sortOrder (caso a API não faça isso)
      let sortedMessages = [...messagesArray];
      
      if (sortOrder === 'newest') {
        sortedMessages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      } else if (sortOrder === 'oldest') {
        sortedMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      } else if (sortOrder === 'popular') {
        sortedMessages.sort((a, b) => (b.favorites_count || 0) - (a.favorites_count || 0));
      }
      
      setMessages(sortedMessages);
      // Corrigindo o cálculo de totalPages para usar o número total de mensagens em vez do tamanho do array atual
      setTotalPages(data.totalPages || Math.ceil(data.totalMessages / ITEMS_PER_PAGE) || 1);
      setTotalMessages(data.totalMessages || sortedMessages.length || 0);
      
      // Atualizar tags disponíveis - excluir duplicatas
      const allTags = new Set(sortedMessages.flatMap(msg => msg.tags || []) || []);
      setAvailableTags(Array.from(allTags).map(tag => ({
        value: tag,
        label: tag
      })));
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Erro ao carregar mensagens',
        confirmButtonColor: 'var(--color-primary)'
      });
      setMessages([]);
      setTotalPages(1);
      setTotalMessages(0);
    } finally {
      setLoading(false);
    }
  }, [currentTab, searchTerm, selectedTags, currentPage, sortOrder]);

  // Efeito para resetar a página quando os filtros ou a tab mudam
  useEffect(() => {
    setCurrentPage(1); // Reset page when filters change
  }, [currentTab, searchTerm, selectedTags, sortOrder]);

  // Efeito para carregar mensagens quando a página muda
  useEffect(() => {
    loadMessages();
  }, [loadMessages, currentPage]);

  // Alternar entre tabs
  const handleTabChange = (newValue) => {
    setCurrentTab(newValue);
  };

  // Alternar entre modos de visualização
  const toggleViewMode = () => {
    setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
  };
  
  // Função para mudar a ordenação
  const handleSortOrderChange = (newOrder) => {
    if (sortOrder !== newOrder) {
      setSortOrder(newOrder);
      // loadMessages será chamado automaticamente pelo useEffect 
      // quando sortOrder mudar
    }
  };

  // Salvar mensagem (nova ou editada)
  const handleSaveMessage = async (messageData) => {
    try {
      setLoading(true);
      
      // Verificar duplicatas para novas mensagens públicas
      if (!editingMessage && messageData.isPublic) {
        const similarResponse = await fetch('/api/shared-messages/check-similar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: messageData.title,
            content: messageData.content
          })
        });
  
        if (!similarResponse.ok) {
          throw new Error('Erro ao verificar mensagens similares');
        }
  
        const { similar } = await similarResponse.json();
        
        if (similar.length > 0) {
          const result = await Swal.fire({
            title: 'Mensagens Similares Encontradas',
            html: `
              <div>Encontramos mensagens parecidas:</div>
              <ul style="text-align: left; margin-top: 10px;">
                ${similar.map(msg => `
                  <li>${msg.title} (${msg.similarity.toFixed(0)}% similar)</li>
                `).join('')}
              </ul>
              <div style="margin-top: 10px;">Deseja continuar mesmo assim?</div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sim, publicar mesmo assim',
            cancelButtonText: 'Não, vou revisar',
            confirmButtonColor: 'var(--color-primary)',
            cancelButtonColor: 'var(--color-accent1)'
          });
  
          if (!result.isConfirmed) {
            setLoading(false);
            return false;
          }
        }
      }
  
      const tags = messageData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      const payload = {
        title: messageData.title,
        content: messageData.content,
        tags: tags,
        isPublic: messageData.isPublic
      };
  
      const url = editingMessage 
        ? `/api/shared-messages/${editingMessage.id}`
        : '/api/shared-messages';
      
      const method = editingMessage ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar mensagem');
      }
  
      // Resetar formulário
      setFormData({ title: '', content: '', tags: '', isPublic: false });
      setEditingMessage(null);
      setShowAddModal(false);
      
      // Recarregar mensagens
      await loadMessages();
      
      Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: editingMessage ? 'Mensagem atualizada!' : 'Mensagem publicada!',
        confirmButtonColor: 'var(--color-primary)',
        timer: 1500,
        showConfirmButton: false
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: error.message || 'Erro ao salvar mensagem',
        confirmButtonColor: 'var(--color-primary)'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal para adicionar mensagem
  const handleAddMessage = () => {
    setEditingMessage(null);
    setFormData({ title: '', content: '', tags: '', isPublic: false });
    setShowAddModal(true);
  };

  // Abrir modal para editar mensagem
  const handleEditMessage = (message) => {
    setEditingMessage(message);
    setFormData({
      title: message.title || '',
      content: message.content || '',
      tags: Array.isArray(message.tags) ? message.tags.join(', ') : (message.tags || ''),
      isPublic: Boolean(message.is_public)
    });
    setShowAddModal(true);
  };

  // Fechar modal
  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingMessage(null);
    setFormData({ title: '', content: '', tags: '', isPublic: false });
  };

  // Favoritar/desfavoritar mensagem
  const handleToggleFavorite = async (messageId) => {
    try {
      const response = await fetch(`/api/shared-messages/${messageId}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Erro ao favoritar mensagem');
      }

      // Recarregar mensagens para atualizar contadores
      await loadMessages();
    } catch (error) {
      console.error('Erro ao favoritar mensagem:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Erro ao favoritar mensagem',
        confirmButtonColor: 'var(--color-primary)'
      });
    }
  };

  // Copiar mensagem
  const handleCopyMessage = async (content, messageId) => {
    try {
      await navigator.clipboard.writeText(content);
      
      // Registrar cópia na API
      await fetch(`/api/shared-messages/${messageId}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      Swal.fire({
        icon: 'success',
        title: 'Copiado!',
        text: 'Mensagem copiada para a área de transferência',
        confirmButtonColor: 'var(--color-primary)',
        timer: 1500,
        showConfirmButton: false
      });

      // Recarregar mensagens para atualizar contadores
      await loadMessages();
    } catch (error) {
      console.error('Erro ao copiar mensagem:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Erro ao copiar mensagem',
        confirmButtonColor: 'var(--color-primary)'
      });
    }
  };

  // Excluir mensagem
  const handleDeleteMessage = async (messageId) => {
    const result = await Swal.fire({
      title: 'Confirmar exclusão',
      text: 'Tem certeza que deseja excluir esta mensagem?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--color-danger)',
      cancelButtonColor: 'var(--color-secondary)'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/shared-messages/${messageId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          throw new Error('Erro ao excluir mensagem');
        }

        await loadMessages();
        
        Swal.fire({
          icon: 'success',
          title: 'Excluído!',
          text: 'Mensagem excluída com sucesso',
          confirmButtonColor: 'var(--color-primary)',
          timer: 1500,
          showConfirmButton: false
        });
      } catch (error) {
        console.error('Erro ao excluir mensagem:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erro',
          text: 'Erro ao excluir mensagem',
          confirmButtonColor: 'var(--color-primary)'
        });
      }
    }
  };

  // Melhorar mensagem com IA
  const handleGeminiSuggestion = async (messageId, content) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/gemini-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar sugestão');
      }

      const { suggestion } = await response.json();
      
      // Mostrar sugestão em modal
      const result = await Swal.fire({
        title: 'Sugestão de Melhoria (IA)',
        html: `
          <div style="text-align: left;">
            <h4>Texto Original:</h4>
            <p style="background: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 15px;">${content}</p>
            <h4>Sugestão Melhorada:</h4>
            <p style="background: #e8f5e8; padding: 10px; border-radius: 5px;">${suggestion}</p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Aplicar Sugestão',
        cancelButtonText: 'Manter Original',
        confirmButtonColor: 'var(--color-primary)',
        cancelButtonColor: 'var(--color-secondary)',
        width: '600px'
      });

      if (result.isConfirmed) {
        // Atualizar mensagem com a sugestão
        const updateResponse = await fetch(`/api/shared-messages/${messageId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: suggestion })
        });

        if (!updateResponse.ok) {
          throw new Error('Erro ao atualizar mensagem');
        }

        await loadMessages();
        
        Swal.fire({
          icon: 'success',
          title: 'Atualizado!',
          text: 'Mensagem atualizada com a sugestão da IA',
          confirmButtonColor: 'var(--color-primary)',
          timer: 1500,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error('Erro ao gerar sugestão:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Erro ao gerar sugestão. Tente novamente.',
        confirmButtonColor: 'var(--color-primary)'
      });
    } finally {
      setLoading(false);
    }
  };

  // Aplicar filtros
  const handleSearchChange = (term) => {
    setSearchTerm(term);
  };

  const handleTagsChange = (tags) => {
    setSelectedTags(tags);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Renderizar conteúdo baseado no estado de loading
  if (loading && messages.length === 0) {
    return (
      <div className={layoutStyles.container}>
        <LoadingIndicator message="Carregando mensagens..." />
      </div>
    );
  }

  return (
    <MessageProvider>
      <div className={layoutStyles.container}>
        {/* Header */}
        <motion.div 
          className={layoutStyles.header}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={layoutStyles.headerContent}>
            <div className={layoutStyles.titleSection}>
              <FaInbox className={layoutStyles.headerIcon} />
              <div>
                <h1 className={layoutStyles.title}>Mensagens Compartilhadas</h1>
                <p className={layoutStyles.subtitle}>
                  {totalMessages} mensagens disponíveis
                </p>
              </div>
            </div>
            <motion.button
              className={layoutStyles.addButton}
              onClick={handleAddMessage}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaPlus />
              Nova Mensagem
            </motion.button>
          </div>
        </motion.div>

        {/* Tabs */}
        <MessageTabs 
          currentTab={currentTab}
          onTabChange={handleTabChange}
          user={user}
        />

        {/* Filtros */}
        <MessageFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          selectedTags={selectedTags}
          onTagsChange={handleTagsChange}
          availableTags={availableTags}
          viewMode={viewMode}
          onViewModeChange={toggleViewMode}
          sortOrder={sortOrder}
          onSortOrderChange={handleSortOrderChange}
        />

        {/* Lista de Mensagens */}
        <div className={layoutStyles.content}>
          {messages.length === 0 ? (
            <EmptyState
              icon={FaInbox}
              title="Nenhuma mensagem encontrada"
              description="Seja o primeiro a compartilhar uma mensagem útil!"
              actionLabel="Criar primeira mensagem"
              onAction={handleAddMessage}
            />
          ) : (
            <MessageList
              messages={messages}
              user={user}
              viewMode={viewMode}
              loading={loading}
              onToggleFavorite={handleToggleFavorite}
              onCopy={handleCopyMessage}
              onEdit={handleEditMessage}
              onDelete={handleDeleteMessage}
              onGeminiSuggestion={handleGeminiSuggestion}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </div>

        {/* Modal do Formulário */}
        <AnimatePresence>
          {showAddModal && (
            <MessageForm
              isOpen={showAddModal}
              onClose={handleCloseModal}
              onSave={handleSaveMessage}
              initialData={formData}
              isEditing={!!editingMessage}
              availableTags={availableTags}
            />
          )}
        </AnimatePresence>
      </div>
    </MessageProvider>
  );
};

export default SharedMessages; 