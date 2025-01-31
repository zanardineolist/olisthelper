// components/SharedMessages.js
import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { Tab, Tabs } from '@mui/material';
import { FaHeart, FaRegHeart, FaCopy, FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import Swal from 'sweetalert2';
import styles from '../styles/SharedMessages.module.css';

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

  useEffect(() => {
    loadMessages();
  }, [currentTab, searchTerm, selectedTags]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      let endpoint = '/api/shared-messages';
      
      if (currentTab === 1) {
        endpoint += '/user';
      } else if (currentTab === 2) {
        endpoint += '/favorites';
      }

      const queryParams = new URLSearchParams({
        searchTerm,
        tags: selectedTags.map(tag => tag.value).join(',')
      });

      const response = await fetch(`${endpoint}?${queryParams}`);
      const data = await response.json();

      setMessages(data.messages);
      
      // Atualizar tags disponíveis
      const allTags = new Set(data.messages.flatMap(msg => msg.tags));
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

  const handleCopyMessage = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      Swal.fire({
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

      if (!response.ok) throw new Error('Erro ao atualizar favorito');
      
      // Recarregar mensagens para atualizar contadores
      loadMessages();
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
      Swal.fire('Erro', 'Erro ao atualizar favorito', 'error');
    }
  };

  const handleSaveMessage = async () => {
    try {
      if (!formData.title || !formData.content) {
        Swal.fire('Erro', 'Título e conteúdo são obrigatórios', 'error');
        return;
      }

      const tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      const method = editingMessage ? 'PUT' : 'POST';
      const endpoint = editingMessage 
        ? `/api/shared-messages/${editingMessage.id}`
        : '/api/shared-messages';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          tags,
          isPublic: formData.isPublic
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar mensagem');
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

      Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: editingMessage ? 'Mensagem atualizada com sucesso' : 'Mensagem adicionada com sucesso',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error);
      Swal.fire('Erro', 'Erro ao salvar mensagem', 'error');
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
      isPublic: message.isPublic
    });
    setShowAddModal(true);
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

      <div className={styles.messageGrid}>
        {loading ? (
          <div className={styles.loading}>Carregando...</div>
        ) : messages.length > 0 ? (
          messages.map((message) => (
            <div
              key={message.id}
              className={`${styles.messageCard} ${
                message.favorites_count > 0 ? styles.popular : ''
              }`}
            >
              <div className={styles.messageHeader}>
                <h3>{message.title}</h3>
                <div className={styles.actions}>
                  <button
                    onClick={() => handleToggleFavorite(message.id)}
                    className={styles.favoriteButton}
                  >
                    {message.isFavorite ? (
                      <FaHeart className={styles.favoriteIcon} />
                    ) : (
                      <FaRegHeart />
                    )}
                    <span>{message.favorites_count}</span>
                  </button>
                  {message.user_id === user.id && (
                    <>
                      <button
                        onClick={() => handleEditMessage(message)}
                        className={styles.editButton}
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(message.id)}
                        className={styles.deleteButton}
                      >
                        <FaTrash />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleCopyMessage(message.content)}
                    className={styles.copyButton}
                  >
                    <FaCopy />
                  </button>
                </div>
              </div>
              <div className={styles.messageContent}>
                <p>{message.content}</p>
              </div>
              <div className={styles.messageTags}>
                {message.favorites_count > 0 && (
                  <span className={styles.popularTag}>Popular</span>
                )}
                {message.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className={styles.noMessages}>
            Nenhuma mensagem encontrada
          </div>
        )}
      </div>

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