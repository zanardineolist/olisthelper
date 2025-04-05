// pages/knowledge.js
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FaPlus, FaLayerGroup, FaSearch, FaThLarge, FaList, FaFilter } from 'react-icons/fa';
import Layout from '../components/Layout';
import { KnowledgeProvider, useKnowledgeContext } from '../components/knowledge/KnowledgeContext';
import KnowledgeForm from '../components/knowledge/KnowledgeForm';
import KnowledgeCard from '../components/knowledge/KnowledgeCard';
import SessionForm from '../components/knowledge/SessionForm';
import GeminiSearch from '../components/knowledge/GeminiSearch';
import TagInput from '../components/TagInput';
import LoadingIndicator from '../components/LoadingIndicator';
import styles from '../styles/knowledge/Layout.module.css';

// Componente interno que usa o contexto
const KnowledgePage = () => {
  const { data: session, status } = useSession();
  const loading = status === 'loading';
  
  // Usar o contexto em vez de estado local
  const {
    knowledgeItems,
    sessions,
    loading: isLoading,
    error,
    searchTerm,
    setSearchTerm,
    selectedTags,
    setSelectedTags,
    selectedSession,
    setSelectedSession,
    viewMode,
    setViewMode,
    isFormOpen,
    setIsFormOpen,
    isSessionFormOpen,
    setIsSessionFormOpen,
    loadKnowledgeItems,
    loadSessions
  } = useKnowledgeContext();
  
  const [showFilters, setShowFilters] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    if (session) {
      loadKnowledgeItems();
      loadSessions();
    }
  }, [session, loadKnowledgeItems, loadSessions]);


  // Pesquisar ao alterar filtros
  useEffect(() => {
    if (session) {
      const timer = setTimeout(() => {
        loadKnowledgeItems();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [session, searchTerm, selectedTags, selectedSession, loadKnowledgeItems]);

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
    // Resetar o formulário antes de abrir
    resetForm();
    setIsFormOpen(true);
  };

  // Abrir formulário para nova sessão
  const openNewSessionForm = () => {
    // Resetar o formulário antes de abrir
    resetSessionForm();
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
    </Layout>
  );
};

// Componente wrapper que fornece o contexto
const KnowledgePageWithProvider = () => (
  <KnowledgeProvider>
    <KnowledgePage />
  </KnowledgeProvider>
);

export default KnowledgePageWithProvider;