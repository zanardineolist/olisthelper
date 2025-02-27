import React, { useState, useEffect, useCallback } from 'react';
import { Tab, Tabs } from '@mui/material';
import Swal from 'sweetalert2';
import { FaInbox } from 'react-icons/fa';

import MessageContext from './shared-messages/MessageContext';
import SearchBar from './shared-messages/SearchBar';
import MessageList from './shared-messages/MessageList';
import MessageForm from './shared-messages/MessageForm';
import LoadingIndicator from './ui/LoadingIndicator';
import EmptyState from './ui/EmptyState';
import MessageTabs from './shared-messages/MessageTabs';

import styles from '../styles/SharedMessages.module.css';

// Constante para definir o limiar de mensagens populares
const POPULAR_THRESHOLD = 5;
const ITEMS_PER_PAGE = 12;

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
  
      const queryParams = new URLSearchParams({
        searchTerm,
        tags: selectedTags.map(tag => tag.value).join(','),
        page: currentPage,
        limit: ITEMS_PER_PAGE
      });
  
      const response = await fetch(`${endpoint}?${queryParams}`);
      if (!response.ok) throw new Error('Erro ao carregar mensagens');
      
      const data = await response.json();
      setMessages(data.messages);
      setTotalPages(data.totalPages || 1);
      
      // Atualizar tags disponíveis - excluir duplicatas
      const allTags = new Set(data.messages.flatMap(msg => msg.tags || []));
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
      });
    } finally {
      setLoading(false);
    }
  }, [currentTab, searchTerm, selectedTags, currentPage]);

  // Efeito para carregar mensagens quando os filtros ou a tab mudam
  useEffect(() => {
    setCurrentPage(1); // Reset page when filters change
    loadMessages();
  }, [currentTab, searchTerm, selectedTags]);

  // Efeito para carregar mensagens quando a página muda
  useEffect(() => {
    loadMessages();
  }, [currentPage]);

  // Alternar entre tabs
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    setCurrentPage(1);
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
                  <li>${msg.title} (${msg.similarity}% similar)</li>
                `).join('')}
              </ul>
              <div style="margin-top: 10px;">Deseja continuar mesmo assim?</div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sim, publicar mesmo assim',
            cancelButtonText: 'Não, vou revisar'
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
        showConfirmButton: true
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
        cancelButtonText: 'Cancelar'
      });

      if (result.isConfirmed) {
        setLoading(true);
        const response = await fetch(`/api/shared-messages/${messageId}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('Erro ao excluir mensagem');
        }

        await loadMessages();

        Swal.fire({
          icon: 'success',
          title: 'Excluída!',
          text: 'Mensagem excluída com sucesso',
          timer: 1500,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error('Erro ao excluir mensagem:', error);
      Swal.fire('Erro', 'Erro ao excluir mensagem', 'error');
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

  // Outros handlers
  const handleToggleFavorite = async (messageId) => {
    // Implementação existente
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
  
      // Atualiza o estado local
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === messageId 
            ? { 
                ...msg, 
                isFavorite,
                favorites_count: isFavorite 
                  ? (msg.favorites_count || 0) + 1
                  : (msg.favorites_count || 1) - 1
              }
            : msg
        )
      );
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
      Swal.fire('Erro', error.message, 'error');
    }
  };

  const handleCopyMessage = async (content, messageId) => {
    // Implementação existente
    try {
      await navigator.clipboard.writeText(content);
      
      const response = await fetch(`/api/shared-messages/${messageId}/copy`, {
        method: 'POST'
      });
  
      if (!response.ok) {
        throw new Error('Erro ao atualizar contador de cópias');
      }
  
      const { copy_count } = await response.json();
      
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
      Swal.fire('Erro', 'Erro ao copiar mensagem', 'error');
    }
  };

  const handleGeminiSuggestion = async (messageId, currentContent) => {
    // Implementação existente
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
        inputPlaceholder: 'Selecione uma opção'
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
  
      const { suggestion } = await response.json();
  
      const result = await Swal.fire({
        title: 'Sugestão do Gemini',
        html: `
          <div class="gemini-preview">
            <h4>Texto Original:</h4>
            <div class="original-text">${currentContent}</div>
            <h4>Sugestão:</h4>
            <div class="suggested-text">${suggestion}</div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Usar esta sugestão',
        cancelButtonText: 'Manter original',
        width: '800px'
      });
  
      if (result.isConfirmed) {
        await handleUpdateContent(messageId, suggestion);
      }
    } catch (error) {
      console.error('Erro ao gerar sugestão:', error);
      Swal.fire('Erro', 'Não foi possível gerar a sugestão', 'error');
    }
  };

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
  
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === messageId ? { ...msg, content: newContent } : msg
        )
      );
  
      Swal.fire('Sucesso', 'Mensagem atualizada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao atualizar conteúdo:', error);
      Swal.fire('Erro', error.message || 'Erro ao atualizar mensagem', 'error');
    }
  };

  // Contexto para compartilhar dados e funções com componentes filhos
  const messageContextValue = {
    user,
    messages,
    handleToggleFavorite,
    handleCopyMessage,
    handleEditMessage,
    handleDeleteMessage,
    handleGeminiSuggestion,
    separateMessages,
    availableTags,
    currentPage,
    totalPages,
    setCurrentPage,
    POPULAR_THRESHOLD
  };

  return (
    <MessageContext.Provider value={messageContextValue}>
      <div className={styles.container}>
        <div className={styles.header}>
          <SearchBar 
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedTags={selectedTags}
            setSelectedTags={setSelectedTags}
            availableTags={availableTags}
          />
          <button
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
            className={styles.addButton}
            aria-label="Adicionar nova mensagem"
          >
            <span className={styles.addButtonIcon}>+</span>
            <span>Nova Mensagem</span>
          </button>
        </div>

        <MessageTabs 
          currentTab={currentTab} 
          handleTabChange={handleTabChange} 
        />

        {loading ? (
          <LoadingIndicator />
        ) : messages.length > 0 ? (
          <MessageList />
        ) : (
          <EmptyState 
            icon={<FaInbox className={styles.emptyIcon} />}
            message="Nenhuma mensagem encontrada"
          />
        )}

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
      </div>
    </MessageContext.Provider>
  );
};

export default SharedMessages;