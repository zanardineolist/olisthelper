// pages/knowledge.js
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FaPlus, FaLayerGroup, FaSearch, FaThLarge, FaList, FaFilter } from 'react-icons/fa';
import Layout from '../components/Layout';
import { KnowledgeProvider } from '../components/knowledge/KnowledgeContext';
import KnowledgeForm from '../components/knowledge/KnowledgeForm';
import KnowledgeCard from '../components/knowledge/KnowledgeCard';
import SessionForm from '../components/knowledge/SessionForm';
import GeminiSearch from '../components/knowledge/GeminiSearch';
import TagInput from '../components/TagInput';
import LoadingIndicator from '../components/LoadingIndicator';
import styles from '../styles/knowledge/Layout.module.css';

const KnowledgePage = () => {
  const { data: session, status } = useSession();
  const loading = status === 'loading';

  // Estado para controle da interface
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSessionFormOpen, setIsSessionFormOpen] = useState(false);
  
  // Estado para dados
  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carregar dados iniciais
  useEffect(() => {
    if (session) {
      loadKnowledgeItems();
      loadSessions();
    }
  }, [session]);

  // Carregar itens de conhecimento
  const loadKnowledgeItems = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/knowledge?${new URLSearchParams({
        searchTerm,
        tags: selectedTags.join(','),
        sessionId: selectedSession || ''
      })}`);
      
      if (!response.ok) throw new Error('Falha ao carregar itens');
      
      const data = await response.json();
      setKnowledgeItems(data.items);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar itens de conhecimento:', err);
      setError('Não foi possível carregar os itens. Tente novamente.');
      setKnowledgeItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar sessões
  const loadSessions = async () => {
    try {
      const response = await fetch('/api/knowledge/sessions');
      
      if (!response.ok) throw new Error('Falha ao carregar sessões');
      
      const data = await response.json();
      setSessions(data.sessions);
    } catch (err) {
      console.error('Erro ao carregar sessões:', err);
      setSessions([]);
    }
  };

  // Pesquisar ao alterar filtros
  useEffect(() => {
    if (session) {
      const timer = setTimeout(() => {
        loadKnowledgeItems();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchTerm, selectedTags, selectedSession]);

  // Manipular mudança na pesquisa
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Manipular mudança nas tags
  const handleTagsChange = (tagsString) => {
    const tagsArray = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag);
    setSelectedTags(tagsArray);
  };

  // Manipular mudança na sessão
  const handleSessionChange = (e) => {
    setSelectedSession(e.target.value === 'all' ? null : e.target.value);
  };

  // Alternar modo de visualização
  const toggleViewMode = (mode) => {
    setViewMode(mode);
  };

  // Alternar visibilidade dos filtros
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // Abrir formulário para novo item
  const openNewItemForm = () => {
    setIsFormOpen(true);
  };

  // Abrir formulário para nova sessão
  const openNewSessionForm = () => {
    setIsSessionFormOpen(true);
  };

  // Renderizar conteúdo principal
  const renderContent = () => {
    if (loading || isLoading) {
      return <LoadingIndicator />;
    }

    if (error) {
      return <div className={styles.errorMessage}>{error}</div>;
    }

    if (knowledgeItems.length === 0) {
      return (
        <div className={styles.emptyState}>
          <h3>Nenhum item encontrado</h3>
          <p>Comece adicionando seu primeiro item à base de conhecimento.</p>
          <button 
            className={styles.primaryButton}
            onClick={openNewItemForm}
          >
            <FaPlus /> Adicionar Item
          </button>
        </div>
      );
    }

    return (
      <div className={viewMode === 'grid' ? styles.knowledgeGrid : styles.knowledgeList}>
        {knowledgeItems.map(item => (
          <KnowledgeCard key={item.id} item={item} />
        ))}
      </div>
    );
  };

  return (
    <Layout>
      <KnowledgeProvider>
        <div className={styles.knowledgeContainer}>
          <div className={styles.knowledgeHeader}>
            <h1 className={styles.knowledgeTitle}>Base de Conhecimento</h1>
            <div className={styles.knowledgeActions}>
              <button 
                className={styles.actionButton}
                onClick={openNewItemForm}
                title="Adicionar novo item"
              >
                <FaPlus /> Novo Item
              </button>
              <button 
                className={styles.actionButton}
                onClick={openNewSessionForm}
                title="Criar nova sessão"
              >
                <FaLayerGroup /> Nova Sessão
              </button>
            </div>
          </div>

          <div className={styles.knowledgeToolbar}>
            <div className={styles.searchContainer}>
              <FaSearch className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Pesquisar na base de conhecimento..."
                value={searchTerm}
                onChange={handleSearchChange}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.toolbarActions}>
              <button 
                className={`${styles.viewButton} ${viewMode === 'grid' ? styles.active : ''}`}
                onClick={() => toggleViewMode('grid')}
                title="Visualização em grade"
              >
                <FaThLarge />
              </button>
              <button 
                className={`${styles.viewButton} ${viewMode === 'list' ? styles.active : ''}`}
                onClick={() => toggleViewMode('list')}
                title="Visualização em lista"
              >
                <FaList />
              </button>
              <button 
                className={`${styles.filterButton} ${showFilters ? styles.active : ''}`}
                onClick={toggleFilters}
                title="Mostrar filtros"
              >
                <FaFilter />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className={styles.filtersContainer}>
              <div className={styles.filterGroup}>
                <label htmlFor="session-filter">Sessão:</label>
                <select
                  id="session-filter"
                  value={selectedSession || 'all'}
                  onChange={handleSessionChange}
                  className={styles.selectFilter}
                >
                  <option value="all">Todas as sessões</option>
                  {sessions.map(session => (
                    <option key={session.id} value={session.id}>
                      {session.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>Tags:</label>
                <TagInput
                  tags={selectedTags.join(',')}
                  onChange={handleTagsChange}
                  placeholder="Filtrar por tags..."
                  className={styles.tagFilter}
                />
              </div>
            </div>
          )}

          <div className={styles.knowledgeContent}>
            {/* Componente de busca com IA */}
            <div className={styles.geminiContainer}>
              <GeminiSearch />
            </div>
            
            <div className={styles.knowledgeListContainer}>
              {renderContent()}
            </div>
          </div>

          {isFormOpen && <KnowledgeForm />}
          {isSessionFormOpen && <SessionForm />}
        </div>
      </KnowledgeProvider>
    </Layout>
  );
};

export default KnowledgePage;