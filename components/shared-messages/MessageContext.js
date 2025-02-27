import { createContext } from 'react';

// Contexto para compartilhar dados e funções entre componentes relacionados às mensagens
const MessageContext = createContext({
  user: null,
  messages: [],
  handleToggleFavorite: () => {},
  handleCopyMessage: () => {},
  handleEditMessage: () => {},
  handleDeleteMessage: () => {},
  handleGeminiSuggestion: () => {},
  separateMessages: () => ({ popular: [], regular: [] }),
  availableTags: [],
  currentPage: 1,
  totalPages: 1,
  setCurrentPage: () => {},
  POPULAR_THRESHOLD: 5
});

export default MessageContext;