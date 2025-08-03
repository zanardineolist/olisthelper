import React, { createContext, useContext } from 'react';

// Contexto para compartilhar dados e funções entre componentes relacionados às mensagens
const MessageContext = createContext({
  // Dados do usuário
  user: null,
  
  // Estados principais
  messages: [],
  loading: false,
  currentTab: 0,
  viewMode: 'grid',
  currentPage: 1,
  totalPages: 1,
  totalMessages: 0,
  sortOrder: 'newest',
  selectedTags: [],
  availableTags: [],
  POPULAR_THRESHOLD: 5,
  
  // Separação de mensagens por critérios
  separateMessages: () => ({ popular: [], regular: [] }),
  
  // Funções de navegação e visualização
  handleTabChange: () => {},
  setCurrentPage: () => {},
  toggleViewMode: () => {},
  setSortOrder: () => {},
  
  // Funções de manipulação de mensagens
  handleToggleFavorite: () => {},
  handleCopyMessage: () => {},
  handleEditMessage: () => {},
  handleDeleteMessage: () => {},
  handleGeminiSuggestion: () => {},
  handleShareMessage: () => {},
});

// Hook personalizado para usar o contexto
export const useMessageContext = () => useContext(MessageContext);

// Provider para envolver os componentes
export const MessageProvider = ({ children, value }) => (
  <MessageContext.Provider value={value}>
    {children}
  </MessageContext.Provider>
);

export default MessageContext;