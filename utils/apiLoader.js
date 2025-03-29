// utils/apiLoader.js
// Utilitário para gerenciar chamadas de API com integração automática ao sistema de loading

/**
 * Função para fazer chamadas de API com gerenciamento automático de loading
 * @param {string} url - URL da API a ser chamada
 * @param {Object} options - Opções do fetch (method, headers, body, etc)
 * @param {Object} loadingOptions - Opções de loading (message, showLoading)
 * @returns {Promise<any>} - Resultado da chamada à API em formato JSON
 */
export async function fetchWithLoading(url, options = {}, loadingOptions = {}) {
  // Esta função é definida para ser utilizada no lado do cliente
  // Verifica se estamos no lado do cliente ou servidor
  if (typeof window === 'undefined') {
    // Se estivermos no servidor, apenas faz a chamada sem mostrar loading
    const response = await fetch(url, options);
    return await response.json();
  }

  // Importação dinâmica para evitar problemas de SSR
  const { useLoading } = await import('../components/LoadingIndicator');
  
  // Obtém as funções do contexto de loading
  const loadingContext = useLoading();
  
  if (!loadingContext) {
    console.warn('Loading context não disponível. Certifique-se de que o LoadingProvider está configurado corretamente.');
    const response = await fetch(url, options);
    return await response.json();
  }
  
  const { startLoading, stopLoading } = loadingContext;
  
  const {
    message = 'Carregando...',
    showLoading = true,
    type = 'fullscreen'
  } = loadingOptions;
  
  try {
    // Inicia o loading se necessário
    if (showLoading) {
      startLoading({ message, type });
    }
    
    // Faz a chamada à API
    const response = await fetch(url, options);
    
    // Verifica se houve erro na resposta HTTP
    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }
    
    // Converte a resposta para JSON
    const data = await response.json();
    
    return data;
  } catch (error) {
    console.error('Erro na chamada de API:', error);
    throw error;
  } finally {
    // Para o loading se ele foi iniciado
    if (showLoading) {
      stopLoading();
    }
  }
}

/**
 * Hook para fazer chamadas de API com gerenciamento de loading em componentes React
 * Este hook deve ser usado apenas em componentes do lado do cliente
 */
export function useApiLoader() {
  let loadingContext;
  
  // Essa parte só será executada no cliente
  if (typeof window !== 'undefined') {
    try {
      // Importação específica para componentes do cliente
      const { useLoading } = require('../components/LoadingIndicator');
      loadingContext = useLoading();
    } catch (error) {
      console.warn('Loading context não disponível', error);
    }
  }
  
  /**
   * Função para fazer chamadas de API com loading automatizado
   */
  const callApi = async (url, options = {}, loadingOptions = {}) => {
    if (!loadingContext) {
      console.warn('Loading context não disponível. Usando fetch padrão.');
      const response = await fetch(url, options);
      return await response.json();
    }
    
    const { startLoading, stopLoading } = loadingContext;
    
    const {
      message = 'Carregando...',
      showLoading = true,
      type = 'fullscreen'
    } = loadingOptions;
    
    try {
      if (showLoading) {
        startLoading({ message, type });
      }
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro na chamada de API:', error);
      throw error;
    } finally {
      if (showLoading) {
        stopLoading();
      }
    }
  };
  
  return { callApi };
} 