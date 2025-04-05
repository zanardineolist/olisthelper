// components/knowledge/KnowledgeContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

// Criar o contexto
const KnowledgeContext = createContext();

// Hook personalizado para usar o contexto
export const useKnowledgeContext = () => useContext(KnowledgeContext);

// Provedor do contexto
export const KnowledgeProvider = ({ children }) => {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  // Estado para itens de conhecimento
  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estado para pesquisa e filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' ou 'list'
  
  // Estado para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Estado para formulários
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: [],
    sessionId: null,
    ticketLink: ''
  });
  
  const [isSessionFormOpen, setIsSessionFormOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [sessionFormData, setSessionFormData] = useState({
    name: '',
    description: ''
  });

  // Carregar itens de conhecimento
  const loadKnowledgeItems = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/knowledge?${new URLSearchParams({
        searchTerm,
        tags: selectedTags.join(','),
        sessionId: selectedSession || ''
      })}`);
      
      if (!response.ok) throw new Error('Falha ao carregar itens');
      
      const data = await response.json();
      setKnowledgeItems(data.items);
      setTotalItems(data.total);
      setTotalPages(data.totalPages);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar itens de conhecimento:', err);
      setError('Não foi possível carregar os itens. Tente novamente.');
      setKnowledgeItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Carregar sessões
  const loadSessions = async () => {
    if (!userId) return;
    
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

  // Efeito para carregar dados quando o usuário mudar
  useEffect(() => {
    if (userId) {
      loadKnowledgeItems();
      loadSessions();
    }
  }, [userId]);

  // Efeito para recarregar itens quando os filtros mudarem
  useEffect(() => {
    if (userId) {
      loadKnowledgeItems();
    }
  }, [searchTerm, selectedTags, selectedSession, currentPage]);

  // Adicionar item de conhecimento
  const addKnowledgeItem = async (itemData) => {
    try {
      const response = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      });
      
      if (!response.ok) throw new Error('Falha ao adicionar item');
      
      await loadKnowledgeItems();
      return true;
    } catch (err) {
      console.error('Erro ao adicionar item:', err);
      return false;
    }
  };

  // Atualizar item de conhecimento
  const updateKnowledgeItem = async (itemId, updates) => {
    try {
      const response = await fetch(`/api/knowledge/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error('Falha ao atualizar item');
      
      await loadKnowledgeItems();
      return true;
    } catch (err) {
      console.error('Erro ao atualizar item:', err);
      return false;
    }
  };

  // Excluir item de conhecimento
  const deleteKnowledgeItem = async (itemId) => {
    try {
      const response = await fetch(`/api/knowledge/${itemId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Falha ao excluir item');
      
      await loadKnowledgeItems();
      return true;
    } catch (err) {
      console.error('Erro ao excluir item:', err);
      return false;
    }
  };

  // Adicionar sessão
  const addKnowledgeSession = async (sessionData) => {
    try {
      const response = await fetch('/api/knowledge/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });
      
      if (!response.ok) throw new Error('Falha ao adicionar sessão');
      
      await loadSessions();
      return true;
    } catch (err) {
      console.error('Erro ao adicionar sessão:', err);
      return false;
    }
  };

  // Atualizar sessão
  const updateKnowledgeSession = async (sessionId, updates) => {
    try {
      const response = await fetch(`/api/knowledge/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error('Falha ao atualizar sessão');
      
      await loadSessions();
      return true;
    } catch (err) {
      console.error('Erro ao atualizar sessão:', err);
      return false;
    }
  };

  // Excluir sessão
  const deleteKnowledgeSession = async (sessionId) => {
    try {
      const response = await fetch(`/api/knowledge/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Falha ao excluir sessão');
      
      await loadSessions();
      await loadKnowledgeItems(); // Recarregar itens pois podem ter sido afetados
      return true;
    } catch (err) {
      console.error('Erro ao excluir sessão:', err);
      return false;
    }
  };

  // Consultar Gemini com a base de conhecimento
  const queryGemini = async (query) => {
    try {
      const response = await fetch('/api/knowledge/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      if (!response.ok) throw new Error('Falha ao consultar Gemini');
      
      const data = await response.json();
      return data.response;
    } catch (err) {
      console.error('Erro ao consultar Gemini:', err);
      return 'Não foi possível processar sua consulta. Tente novamente.';
    }
  };

  // Resetar formulário de item
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      tags: [],
      sessionId: null,
      ticketLink: ''
    });
    setEditingItemId(null);
  };

  // Resetar formulário de sessão
  const resetSessionForm = () => {
    setSessionFormData({
      name: '',
      description: ''
    });
    setEditingSessionId(null);
  };

  // Preparar formulário para edição de item
  const editItem = (item) => {
    setFormData({
      title: item.title,
      description: item.description,
      tags: item.tags || [],
      sessionId: item.session_id,
      ticketLink: item.ticket_link || ''
    });
    setEditingItemId(item.id);
    setIsFormOpen(true);
  };

  // Preparar formulário para edição de sessão
  const editSession = (session) => {
    setSessionFormData({
      name: session.name,
      description: session.description || ''
    });
    setEditingSessionId(session.id);
    setIsSessionFormOpen(true);
  };

  // Valor do contexto
  const contextValue = {
    // Dados
    knowledgeItems,
    sessions,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    selectedTags,
    setSelectedTags,
    selectedSession,
    setSelectedSession,
    viewMode,
    setViewMode,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    
    // Formulários
    isFormOpen,
    setIsFormOpen,
    formData,
    setFormData,
    editingItemId,
    isSessionFormOpen,
    setIsSessionFormOpen,
    sessionFormData,
    setSessionFormData,
    editingSessionId,
    
    // Funções
    loadKnowledgeItems,
    loadSessions,
    addKnowledgeItem,
    updateKnowledgeItem,
    deleteKnowledgeItem,
    addKnowledgeSession,
    updateKnowledgeSession,
    deleteKnowledgeSession,
    queryGemini,
    resetForm,
    resetSessionForm,
    editItem,
    editSession
  };

  return (
    <KnowledgeContext.Provider value={contextValue}>
      {children}
    </KnowledgeContext.Provider>
  );
};