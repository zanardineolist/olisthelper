// components/SharedMessages.js
import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { Tab, Tabs } from '@mui/material';
import MessageActions from './MessageActions';
import { FaHeart, FaCopy, FaPlus, FaUser, FaClock, FaGlobe, FaTag, FaLock, FaStar, FaInbox } from 'react-icons/fa';
import Swal from 'sweetalert2';
import styles from '../styles/SharedMessages.module.css';

// Define o limiar para mensagens populares
const POPULAR_THRESHOLD = 5;

// Função para separar mensagens populares
const separateMessages = (messages) => {
  const popular = messages.filter(msg => msg.favorites_count >= POPULAR_THRESHOLD);
  const regular = messages.filter(msg => msg.favorites_count < POPULAR_THRESHOLD);
  return { popular, regular };
};

// Função para formatar tempo relativo
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000); // diferença em segundos

  if (diff < 60) return `${diff} segundos atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutos atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} horas atrás`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} dias atrás`;

  return date.toLocaleDateString(); // Exibe a data se for muito antiga
}

export default function SharedMessages({ user }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);

  // Estados para o formulário de nova mensagem/edição
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: '',
    isPublic: false
  });

  const MessageContent = ({ content }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const previewLength = 100;
    const needsExpansion = content.length > previewLength;
  
    return (
      <div className={styles.messageBody}>
        <p 
          style={{ whiteSpace: 'pre-wrap' }}
          className={isExpanded ? styles.expanded : undefined}
        >
          {isExpanded ? content : content.slice(0, previewLength)}
          {!isExpanded && needsExpansion && (
            <span className={styles.fadeOut}>...</span>
          )}
        </p>
        {needsExpansion && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)} 
            className={styles.expandButton}
          >
            {isExpanded ? 'Ver menos' : 'Ver mais'}
          </button>
        )}
      </div>
    );
  };

  const handleUpdateContent = async (messageId, newContent) => {
    try {
      // Buscar a mensagem original antes de atualizar
      const messageToUpdate = messages.find(msg => msg.id === messageId);
      if (!messageToUpdate) throw new Error('Mensagem não encontrada');
  
      const response = await fetch(`/api/shared-messages/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: messageToUpdate.title,
          content: newContent,
          isPublic: messageToUpdate.isPublic,
          tags: messageToUpdate.tags,
        }),
      });
  
      if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.error || 'Erro ao atualizar mensagem');
      }
  
      // Atualiza localmente o estado das mensagens
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

  useEffect(() => {
    loadMessages();
  }, [currentTab, searchTerm, selectedTags]);

  const loadMessages = async () => {
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
        tags: selectedTags.map(tag => tag.value).join(',')
      });
  
      const response = await fetch(`${endpoint}?${queryParams}`);
      if (!response.ok) throw new Error('Erro ao carregar mensagens');
      
      const data = await response.json();
      setMessages(data.messages);
      
      // Atualizar tags disponíveis - excluir duplicatas
      const allTags = new Set(data.messages.flatMap(msg => msg.tags || []));
      setAvailableTags(Array.from(allTags).map(tag => ({
        value: tag,
        label: tag
      })));
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      Swal.fire('Erro', 'Erro ao carregar mensagens', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleCopyMessage = async (content, messageId) => {
    try {
      // Primeiro tenta copiar o conteúdo
      await navigator.clipboard.writeText(content);
      
      // Só incrementa o contador se a cópia foi bem sucedida
      const response = await fetch(`/api/shared-messages/${messageId}/copy`, {
        method: 'POST'
      });
  
      if (!response.ok) {
        throw new Error('Erro ao atualizar contador de cópias');
      }
  
      const { copy_count } = await response.json();
      
      // Atualiza apenas o contador de cópias localmente
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

  const handleSaveMessage = async () => {
    try {
      if (!formData.title || !formData.content) {
        Swal.fire('Erro', 'Título e conteúdo são obrigatórios', 'error');
        return;
      }
  
      // Verificar duplicatas apenas para novas mensagens públicas
      if (!editingMessage && formData.isPublic) {
        const similarResponse = await fetch('/api/shared-messages/check-similar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title,
            content: formData.content
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
            return;
          }
        }
      }
  
      const tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      const messageData = {
        title: formData.title,
        content: formData.content,
        tags,
        isPublic: formData.isPublic
      };
  
      // Para mensagens existentes, preservar os contadores
      if (editingMessage) {
        messageData.copy_count = editingMessage.copy_count;
        messageData.favorites_count = editingMessage.favorites_count;
      }
  
      const method = editingMessage ? 'PUT' : 'POST';
      const endpoint = editingMessage 
        ? `/api/shared-messages/${editingMessage.id}`
        : '/api/shared-messages';
  
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar mensagem');
      }
  
      const savedMessage = await response.json();
  
      // Atualizar o estado local mantendo os contadores originais
      if (editingMessage) {
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === editingMessage.id 
              ? {
                  ...msg,
                  ...savedMessage,
                  copy_count: editingMessage.copy_count,
                  favorites_count: editingMessage.favorites_count
                }
              : msg
          )
        );
      } else {
        await loadMessages(); // Recarrega para novas mensagens
      }
  
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
  
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: error.message || 'Erro ao salvar mensagem',
        showConfirmButton: true
      });
    }
  };

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
    }
  };

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

  const handleGeminiSuggestion = async (messageId, currentContent) => {
    try {
      // Mostrar modal com opções de prompt
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
  
      // Mostrar loader
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
  
      // Mostrar preview com opção de substituir
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
        // Atualizar o texto
        await handleUpdateContent(messageId, suggestion);
      }
    } catch (error) {
      console.error('Erro ao gerar sugestão:', error);
      Swal.fire('Erro', 'Não foi possível gerar a sugestão', 'error');
    }
  };

  // Estilos customizados para o Select
  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: 'var(--modals-inputs)',
      borderColor: state.isFocused ? 'var(--color-primary)' : 'var(--color-border)',
      color: 'var(--text-color)',
      '&:hover': {
        borderColor: 'var(--color-primary)'
      }
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: 'var(--modals-inputs)'
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused ? 'var(--color-trodd)' : 'var(--box-color)',
      color: 'var(--text-color)'
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: 'var(--color-primary)',
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: 'var(--color-white)',
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: 'var(--color-white)',
      '&:hover': {
        backgroundColor: 'var(--color-primary-hover)',
        color: 'var(--color-white)',
      }
    })
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Buscar mensagens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <Select
            isMulti
            options={availableTags}
            value={selectedTags}
            onChange={setSelectedTags}
            placeholder="Filtrar por tags..."
            styles={customSelectStyles}
            className={styles.tagSelect}
          />
        </div>
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
        >
          <FaPlus /> Nova Mensagem
        </button>
      </div>

      <Tabs
        value={currentTab}
        onChange={handleTabChange}
        className={styles.tabs}
        centered
      >
        <Tab label="Todas as Mensagens" />
        <Tab label="Minhas Mensagens" />
        <Tab label="Favoritas" />
      </Tabs>

      {loading ? (
        <div className={styles.loading}>Carregando...</div>
      ) : messages.length > 0 ? (
        <>
          {/* Seção de Mensagens Populares */}
            {separateMessages(messages).popular.length > 0 && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Mensagens Populares</h2>
                <div className={styles.messageGrid}>
                  {separateMessages(messages).popular.map((message) => (
                    <div
                      key={message.id}
                      className={`${styles.messageCard} ${styles.popular}`}
                    >
                      <div className={styles.messageHeader}>
                        <h3>{message.title}</h3>
                        <MessageActions 
                          message={message}
                          user={user}
                          onToggleFavorite={handleToggleFavorite}
                          onCopy={handleCopyMessage}
                          onEdit={handleEditMessage}
                          onDelete={handleDeleteMessage}
                          onGeminiSuggestion={handleGeminiSuggestion}
                        />
                      </div>

                      <div className={styles.authorSection}>
                        <div className={styles.authorPrimary}>
                          <span className={styles.author}>
                            <FaUser className={styles.authorIcon} /> {message.author_name}
                          </span>
                          {message.is_public ? (
                            <span className={styles.public} title="Mensagem pública">
                              <FaGlobe /> Pública
                            </span>
                          ) : (
                            <span className={styles.private} title="Mensagem privada">
                              <FaLock /> Privada
                            </span>
                          )}
                        </div>
                        <div className={styles.authorSecondary}>
                          <span className={styles.timestamp} title={new Date(message.created_at).toLocaleString()}>
                            <FaClock /> {formatRelativeTime(message.created_at)}
                          </span>
                          {message.updated_at !== message.created_at && (
                            <span className={styles.edited} title={`Atualizado em ${new Date(message.updated_at).toLocaleString()}`}>
                              (editado)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className={styles.messageBody}>
                        <MessageContent content={message.content} />
                      </div>

                      <div className={styles.messageFooter}>
                        <div className={styles.messageTags}>
                          <span className={styles.popularTag}>
                            <FaStar /> Popular
                          </span>
                          {message.tags.map((tag) => (
                            <span key={tag} className={styles.tag}>
                              <FaTag className={styles.tagIcon} />
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className={styles.messageMetrics}>
                          <span className={styles.metric} title="Total de cópias">
                            <FaCopy /> {message.copy_count || 0}
                          </span>
                          <span className={styles.metric} title="Total de favoritos">
                            <FaHeart /> {message.favorites_count}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Seção de Mensagens Regulares */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Todas as Mensagens</h2>
              <div className={styles.messageGrid}>
                {separateMessages(messages).regular.map((message) => (
                  <div
                    key={message.id}
                    className={styles.messageCard}
                  >
                    <div className={styles.messageHeader}>
                      <h3>{message.title}</h3>
                      <MessageActions 
                        message={message}
                        user={user}
                        onToggleFavorite={handleToggleFavorite}
                        onCopy={handleCopyMessage}
                        onEdit={handleEditMessage}
                        onDelete={handleDeleteMessage}
                        onGeminiSuggestion={handleGeminiSuggestion}
                      />
                    </div>

                    <div className={styles.authorSection}>
                      <div className={styles.authorPrimary}>
                        <span className={styles.author}>
                          <FaUser className={styles.authorIcon} /> {message.author_name}
                        </span>
                        {message.is_public ? (
                          <span className={styles.public} title="Mensagem pública">
                            <FaGlobe /> Pública
                          </span>
                        ) : (
                          <span className={styles.private} title="Mensagem privada">
                            <FaLock /> Privada
                          </span>
                        )}
                      </div>
                      <div className={styles.authorSecondary}>
                        <span className={styles.timestamp} title={new Date(message.created_at).toLocaleString()}>
                          <FaClock /> {formatRelativeTime(message.created_at)}
                        </span>
                        {message.updated_at !== message.created_at && (
                          <span className={styles.edited} title={`Atualizado em ${new Date(message.updated_at).toLocaleString()}`}>
                            (editado)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={styles.messageBody}>
                      <MessageContent content={message.content} />
                    </div>

                    <div className={styles.messageFooter}>
                      <div className={styles.messageTags}>
                        {message.tags.map((tag) => (
                          <span key={tag} className={styles.tag}>
                            <FaTag className={styles.tagIcon} />
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className={styles.messageMetrics}>
                        <span className={styles.metric} title="Total de cópias">
                          <FaCopy /> {message.copy_count || 0}
                        </span>
                        <span className={styles.metric} title="Total de favoritos">
                          <FaHeart /> {message.favorites_count}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </>
      ) : (
        <div className={styles.noMessages}>
          <FaInbox className={styles.emptyIcon} />
          <p>Nenhuma mensagem encontrada</p>
        </div>
      )}

      {showAddModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>{editingMessage ? 'Editar Mensagem' : 'Nova Mensagem'}</h2>
            <input
              type="text"
              placeholder="Título"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={styles.modalInput}
            />
            <textarea
              placeholder="Conteúdo"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className={styles.modalTextarea}
            />
            <input
              type="text"
              placeholder="Tags (separadas por vírgula)"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className={styles.modalInput}
            />
            <label className={styles.modalCheckbox}>
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
              />
              Compartilhar com outros usuários
            </label>
            <div className={styles.modalButtons}>
              <button onClick={handleSaveMessage} className={styles.saveButton}>
                {editingMessage ? 'Atualizar' : 'Salvar'}
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingMessage(null);
                }}
                className={styles.cancelButton}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}