import { useState, useEffect } from 'react';
import MessageList from './MessageList';
import AddMessageModal from './AddMessageModal';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faFilter } from '@fortawesome/free-solid-svg-icons';
import styles from '../../styles/MessagesManager.module.css';
import Swal from 'sweetalert2';

export default function MessagesManager({ user }) {
  const [messages, setMessages] = useState([]);
  const [viewMode, setViewMode] = useState('private');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);

  useEffect(() => {
    loadMessages();
    loadTags();
  }, [viewMode, searchTerm, selectedTags]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        isPrivate: viewMode === 'private',
        searchTerm: searchTerm,
        ...(selectedTags.length && { tags: selectedTags.map(tag => tag.value).join(',') })
      });

      const response = await fetch(`/api/messages?${queryParams}`);
      if (!response.ok) throw new Error('Erro ao carregar mensagens');
      
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
      Swal.fire('Erro', 'Não foi possível carregar as mensagens', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const response = await fetch('/api/messages/tags');
      if (!response.ok) throw new Error('Erro ao carregar tags');
      
      const tags = await response.json();
      setAvailableTags(tags.map(tag => ({
        value: tag.id,
        label: tag.name
      })));
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleTagChange = (selectedOptions) => {
    setSelectedTags(selectedOptions || []);
  };

  const handleMessageAdded = () => {
    loadMessages();
    setIsModalOpen(false);
    setEditingMessage(null);
  };

  const handleMessageDeleted = (messageId) => {
    setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
  };

  const handleMessageLiked = async (messageId) => {
    const updatedMessages = messages.map(msg => {
      if (msg.id === messageId) {
        const newLikeCount = msg.liked_by_user ? msg.likes_count - 1 : msg.likes_count + 1;
        return {
          ...msg,
          liked_by_user: !msg.liked_by_user,
          likes_count: newLikeCount
        };
      }
      return msg;
    });
    setMessages(updatedMessages);
  };

  const handleMessageEdit = (message) => {
    setEditingMessage(message);
    setIsModalOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedTags([]);
    setShowFilters(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.viewToggle}>
          <button 
            className={`${styles.toggleButton} ${viewMode === 'private' ? styles.active : ''}`}
            onClick={() => setViewMode('private')}
          >
            Minhas Mensagens
          </button>
          <button 
            className={`${styles.toggleButton} ${viewMode === 'all' ? styles.active : ''}`}
            onClick={() => setViewMode('all')}
          >
            Todas as Mensagens
          </button>
        </div>

        <button 
          className={styles.addButton}
          onClick={() => {
            setEditingMessage(null);
            setIsModalOpen(true);
          }}
        >
          <FontAwesomeIcon icon={faPlus} /> Nova Mensagem
        </button>
      </div>

      <div className={styles.searchSection}>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Pesquisar mensagens..."
            value={searchTerm}
            onChange={handleSearch}
            className={styles.searchInput}
          />
          <button 
            className={`${styles.filterButton} ${showFilters ? styles.active : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <FontAwesomeIcon icon={faFilter} />
          </button>
        </div>

        {showFilters && (
          <div className={styles.filterContainer}>
            <Select
              isMulti
              options={availableTags}
              value={selectedTags}
              onChange={handleTagChange}
              placeholder="Filtrar por tags..."
              className={styles.tagSelect}
              classNamePrefix="select"
            />
            <button 
              onClick={clearFilters}
              className={styles.clearFiltersButton}
            >
              Limpar Filtros
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>
          <div className="standardBoxLoader"></div>
        </div>
      ) : (
        <MessageList 
          messages={messages}
          user={user}
          onMessageDeleted={handleMessageDeleted}
          onMessageLiked={handleMessageLiked}
          onMessageEdit={handleMessageEdit}
        />
      )}

      <AddMessageModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingMessage(null);
        }}
        onMessageAdded={handleMessageAdded}
        user={user}
        availableTags={availableTags}
        editingMessage={editingMessage}
      />
    </div>
  );
}