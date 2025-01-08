import { useState, useEffect } from 'react';
import { fetchMessages, fetchAllTags } from '../../utils/supabase';
import MessageList from './MessageList';
import AddMessageModal from './AddMessageModal';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faFilter } from '@fortawesome/free-solid-svg-icons';
import styles from '../../styles/MessagesManager.module.css';

export default function MessagesManager({ user }) {
  const [messages, setMessages] = useState([]);
  const [viewMode, setViewMode] = useState('private');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadMessages();
    loadTags();
  }, [viewMode, user.id]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await fetchMessages({
        isPrivate: viewMode === 'private',
        userId: user.id,
        searchTerm,
        tags: selectedTags.map(tag => tag.value)
      });
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const tags = await fetchAllTags();
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
    // Debounce implementado para melhor performance
    const timeoutId = setTimeout(() => {
      loadMessages();
    }, 300);
    return () => clearTimeout(timeoutId);
  };

  const handleTagChange = (selectedOptions) => {
    setSelectedTags(selectedOptions || []);
    loadMessages();
  };

  const handleMessageAdded = () => {
    loadMessages();
    setIsModalOpen(false);
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
          onClick={() => setIsModalOpen(true)}
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
            className={styles.filterButton}
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
          onMessageDeleted={loadMessages}
          onMessageLiked={loadMessages}
        />
      )}

      <AddMessageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onMessageAdded={handleMessageAdded}
        user={user}
        availableTags={availableTags}
      />
    </div>
  );
}