import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import { FaInbox, FaPlus } from 'react-icons/fa';

import { MessageProvider } from './shared-messages/MessageContext';
import SearchBar from './shared-messages/SearchBar';
import MessageList from './shared-messages/MessageList';
import MessageForm from './shared-messages/MessageForm';
import LoadingIndicator from './ui/LoadingIndicator';
import EmptyState from './ui/EmptyState';
import MessageTabs from './shared-messages/MessageTabs';
import MessageFilters from './shared-messages/MessageFilters';

// Importar apenas os estilos que realmente são usados neste componente
import layoutStyles from '../styles/shared-messages/Layout.module.css';
import utilityStyles from '../styles/shared-messages/Utilities.module.css';

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
      
      const preparedData = {
        title: messageData.title,
        content: messageData.content,
        tags,
        isPublic: messageData.isPublic
      };
  
      const method = editingMessage ? 'PUT' : 'POST';
      const endpoint = editingMessage 
        ? `/api/shared-messages/${editingMessage.id}`
        : '/api/shared-messages';
  
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preparedData)
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar mensagem');
      }
  
      await loadMessages();
  
      setShowAddModal(false);
      setEditingMessage(null);
      setFormData({
        title: '',
        content: '',
        tags: '',
        isPublic: false
      });
  
      await Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: editingMessage ? 'Mensagem atualizada com sucesso' : 'Mensagem adicionada com sucesso',
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

  // Remover mensagem
  const handleDeleteMessage = async (messageId) => {
    try {
      const result = await Swal.fire({
        title: 'Tem certeza?',
        text: 'Esta ação não pode ser desfeita',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, excluir',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: 'var(--color-accent1)',
        cancelButtonColor: 'var(--box-color3)'
      });

      if (result.isConfirmed) {
        setLoading(true);
        const response = await fetch(`/api/shared-messages/${messageId}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao excluir mensagem');
        }

        // Atualizar estado local para melhor UX
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        setTotalMessages(prev => prev - 1);

        await Swal.fire({
          icon: 'success',
          title: 'Excluída!',
          text: 'Mensagem excluída com sucesso',
          timer: 1500,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error('Erro ao excluir mensagem:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: error.message || 'Erro ao excluir mensagem',
        confirmButtonColor: 'var(--color-primary)'
      });
    } finally {
      setLoading(false);
    }
  };

  // Editar mensagem
  const handleEditMessage = (message) => {
    setEditingMessage(message);
    setFormData({
      title: message.title,
      content: message.content,
      tags: message.tags.join(', '),
      isPublic: message.is_public
    });
    setShowAddModal(true);
  };

  // Alternar favorito
  const handleToggleFavorite = async (messageId) => {
    try {
      const response = await fetch('/api/shared-messages/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId })
      });
  
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao atualizar favorito');
      }
  
      const { isFavorite } = await response.json();
  
      // Atualizar estado local
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === messageId 
            ? { 
                ...msg, 
                isFavorite,
                favorites_count: isFavorite 
                  ? (msg.favorites_count || 0) + 1
                  : Math.max((msg.favorites_count || 1) - 1, 0)
              }
            : msg
        )
      );
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: error.message || 'Erro ao atualizar favorito',
        confirmButtonColor: 'var(--color-primary)'
      });
    }
  };

  // Copiar mensagem
  const handleCopyMessage = async (content, messageId) => {
    try {
      await navigator.clipboard.writeText(content);
      
      const response = await fetch(`/api/shared-messages/${messageId}/copy`, {
        method: 'POST'
      });
  
      if (!response.ok) {
        throw new Error('Erro ao atualizar contador de cópias');
      }
  
      const { copy_count } = await response.json();
      
      // Atualizar estado local
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === messageId 
            ? { ...msg, copy_count }
            : msg
        )
      );
  
      await Swal.fire({
        icon: 'success',
        title: 'Copiado!',
        text: 'Mensagem copiada para a área de transferência',
        timer: 1500,
        showConfirmButton: false
      });
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

  // Melhorar com IA
  const handleGeminiSuggestion = async (messageId, currentContent) => {
    try {
      const { value: promptType } = await Swal.fire({
        title: 'Como você quer melhorar o texto?',
        input: 'select',
        inputOptions: {
          formal: 'Tornar mais formal',
          informal: 'Tornar mais informal',
          shorter: 'Resumir',
          detailed: 'Adicionar mais detalhes',
          clarity: 'Melhorar clareza',
          fix: 'Corrigir gramática e pontuação'
        },
        showCancelButton: true,
        inputPlaceholder: 'Selecione uma opção',
        confirmButtonColor: 'var(--color-primary)',
        cancelButtonColor: 'var(--box-color3)'
      });
  
      if (!promptType) return;
  
      Swal.fire({
        title: 'Gerando sugestão...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
  
      const response = await fetch('/api/shared-messages/gemini-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: currentContent,
          promptType
        })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao gerar sugestão');
      }
  
      const { suggestion } = await response.json();
  
      const result = await Swal.fire({
        title: 'Sugestão do Gemini',
        html: `
          <div class="gemini-preview">
            <h4>Texto Original:</h4>
            <div class="original-text" style="background: var(--box-color2); padding: 10px; border-radius: 8px; margin-bottom: 15px; text-align: left; max-height: 200px; overflow-y: auto;">
              ${currentContent}
            </div>
            <h4>Sugestão:</h4>
            <div class="suggested-text" style="background: var(--box-color3); padding: 10px; border-radius: 8px; text-align: left; max-height: 200px; overflow-y: auto;">
              ${suggestion}
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Usar esta sugestão',
        cancelButtonText: 'Manter original',
        confirmButtonColor: 'var(--color-primary)',
        cancelButtonColor: 'var(--box-color3)',
        width: '800px'
      });
  
      if (result.isConfirmed) {
        await handleUpdateContent(messageId, suggestion);
      }
    } catch (error) {
      console.error('Erro ao gerar sugestão:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: error.message || 'Não foi possível gerar a sugestão',
        confirmButtonColor: 'var(--color-primary)'
      });
    }
  };

  // Compartilhar mensagem
  const handleShareMessage = (message) => {
    if (!message.is_public) {
      Swal.fire({
        icon: 'warning',
        title: 'Atenção',
        text: 'Apenas mensagens públicas podem ser compartilhadas.',
        confirmButtonColor: 'var(--color-primary)'
      });
      return;
    }

    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/shared-messages/${message.id}`;
    
    navigator.clipboard.writeText(shareUrl).then(
      () => {
        Swal.fire({
          icon: 'success',
          title: 'Link copiado!',
          text: 'O link da mensagem foi copiado para a área de transferência.',
          timer: 2000,
          showConfirmButton: false
        });
      },
      (err) => {
        console.error('Não foi possível copiar link: ', err);
        Swal.fire({
          icon: 'error',
          title: 'Erro',
          text: 'Falha ao copiar o link. Tente novamente.',
          confirmButtonColor: 'var(--color-primary)'
        });
      }
    );
  };

  // Atualizar conteúdo
  const handleUpdateContent = async (messageId, newContent) => {
    try {
      const messageToUpdate = messages.find(msg => msg.id === messageId);
      if (!messageToUpdate) throw new Error('Mensagem não encontrada');
  
      const response = await fetch(`/api/shared-messages/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: messageToUpdate.title,
          content: newContent,
          isPublic: messageToUpdate.is_public,
          tags: messageToUpdate.tags,
        }),
      });
  
      if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.error || 'Erro ao atualizar mensagem');
      }
  
      // Atualizar estado local
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === messageId 
            ? { ...msg, content: newContent, updated_at: new Date().toISOString() }
            : msg
        )
      );
  
      Swal.fire({
        icon: 'success',
        title: 'Sucesso',
        text: 'Mensagem atualizada com sucesso!',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Erro ao atualizar conteúdo:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: error.message || 'Erro ao atualizar mensagem',
        confirmButtonColor: 'var(--color-primary)'
      });
    }
  };

  // Valores e funções a serem compartilhadas via Context
  const contextValue = {
    user,
    messages,
    loading,
    currentTab,
    viewMode,
    currentPage,
    totalPages,
    totalMessages,
    sortOrder,
    selectedTags,
    availableTags,
    POPULAR_THRESHOLD,
    separateMessages,
    handleTabChange,
    handleToggleFavorite,
    handleCopyMessage,
    handleEditMessage,
    handleDeleteMessage,
    handleGeminiSuggestion,
    handleShareMessage,
    setCurrentPage,
    toggleViewMode,
    setSortOrder: handleSortOrderChange // Usar a função aprimorada
  };

  return (
    <MessageProvider value={contextValue}>
      <motion.div 
        className={layoutStyles.container}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className={layoutStyles.header}>
          <SearchBar 
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedTags={selectedTags}
            setSelectedTags={setSelectedTags}
            availableTags={availableTags}
          />
          <motion.button
            onClick={() => {
              setEditingMessage(null);
              setFormData({
                title: '',
                content: '',
                tags: '',
                isPublic: false
              });
              setShowAddModal(true);
            }}
            className={layoutStyles.addButton}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Adicionar nova mensagem"
          >
            <FaPlus className={layoutStyles.addButtonIcon} />
            <span>Nova Mensagem</span>
          </motion.button>
        </div>

        <MessageTabs />
        
        <MessageFilters />

        {loading ? (
          <LoadingIndicator />
        ) : messages.length > 0 ? (
          <MessageList />
        ) : (
          <EmptyState 
            icon={<FaInbox />}
            message={
              searchTerm || selectedTags.length > 0 
                ? "Nenhuma mensagem encontrada com esses filtros" 
                : "Nenhuma mensagem disponível"
            }
          />
        )}

        <AnimatePresence>
          {showAddModal && (
            <MessageForm
              formData={formData}
              setFormData={setFormData}
              onSave={handleSaveMessage}
              onCancel={() => {
                setShowAddModal(false);
                setEditingMessage(null);
              }}
              isEditing={!!editingMessage}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </MessageProvider>
  );
};

export default SharedMessages;