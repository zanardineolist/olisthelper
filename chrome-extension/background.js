// Background script para a extensão Olist Helper
// Gerencia comunicação com a API e cache de mensagens

// Importar sistemas usando ES6 modules
import { authManager } from './auth.js';
import { cacheManager } from './cache.js';
import { configManager } from './config.js';

// Configurações da API
const API_CONFIG = {
  baseUrl: 'https://olisthelper.vercel.app',
  endpoints: {
    messages: '/api/extension/messages',
    macros: '/api/extension/macros',
    auth: '/api/auth/session'
  },
  timeout: 10000
};

// Sistema de cache gerenciado pelo CacheManager (importado)

// Buscar mensagens da API
async function fetchMessages(filters = {}) {
  try {
    // Verificar autenticação primeiro
    const authResult = await authManager.checkAuthentication();
    if (!authResult.isAuthenticated) {
      return {
        success: false,
        error: 'Usuário não autenticado',
        messages: [],
        needsAuth: true
      };
    }
    
    // Verificar permissão
    if (!authManager.hasPermission('read_messages')) {
      return {
        success: false,
        error: 'Sem permissão para ler mensagens',
        messages: []
      };
    }
    
    const apiBaseUrl = await authManager.getApiBaseUrl();
    const url = new URL(apiBaseUrl + API_CONFIG.endpoints.messages);
    
    // Adicionar filtros como query parameters
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        url.searchParams.append(key, filters[key]);
      }
    });
    
    const response = await authManager.authenticatedFetch(url.toString(), {
      method: 'GET'
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: 'Sessão expirada',
          messages: [],
          needsAuth: true
        };
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      success: true,
      messages: data.messages || data,
      total: data.total || data.length
    };
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    return {
      success: false,
      error: error.message,
      messages: []
    };
  }
}

// Buscar macros da API
async function fetchMacros(filters = {}) {
  try {
    // Verificar autenticação primeiro
    const authResult = await authManager.checkAuthentication();
    if (!authResult.isAuthenticated) {
      return {
        success: false,
        error: 'Usuário não autenticado',
        macros: [],
        needsAuth: true
      };
    }
    
    const apiBaseUrl = await authManager.getApiBaseUrl();
    const url = new URL(apiBaseUrl + API_CONFIG.endpoints.macros);
    
    // Adicionar filtros como query parameters
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        url.searchParams.append(key, filters[key]);
      }
    });
    
    const response = await authManager.authenticatedFetch(url.toString(), {
      method: 'GET'
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: 'Sessão expirada',
          macros: [],
          needsAuth: true
        };
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      success: true,
      macros: data.macros || data,
      total: data.total || data.length
    };
  } catch (error) {
    console.error('Erro ao buscar macros:', error);
    return {
      success: false,
      error: error.message,
      macros: []
    };
  }
}

// Buscar mensagens com cache
async function getCachedMessages(filters = {}) {
  // Verificar autenticação primeiro
  const authResult = await authManager.checkAuthentication();
  if (!authResult.isAuthenticated) {
    return {
      success: false,
      error: 'Usuário não autenticado',
      messages: [],
      needsAuth: true
    };
  }
  
  // Usar o novo sistema de cache
  try {
    const result = await cacheManager.getMessages(filters);
    return result;
  } catch (error) {
    console.error('Erro ao buscar mensagens com cache:', error);
    return {
      success: false,
      error: error.message,
      messages: []
    };
  }
}

// Buscar mensagens com busca textual
async function searchCachedMessages(query, filters = {}) {
  // Verificar autenticação primeiro
  const authResult = await authManager.checkAuthentication();
  if (!authResult.isAuthenticated) {
    return {
      success: false,
      error: 'Usuário não autenticado',
      messages: [],
      needsAuth: true
    };
  }
  
  // Usar o sistema de cache de busca
  try {
    const result = await cacheManager.searchMessages(query, filters);
    return result;
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    return {
      success: false,
      error: error.message,
      messages: []
    };
  }
}

// Buscar mensagem específica por comando
async function getMessageByCommand(command) {
  try {
    const response = await fetchMessages('', command);
    if (response.success && response.messages.length > 0) {
      return response.messages[0];
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar mensagem por comando:', error);
    return null;
  }
}

// Verificar autenticação
async function checkAuth() {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.auth}`, {
      credentials: 'include'
    });
    return response.ok;
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error);
    return false;
  }
}

// Listener para mensagens de outros componentes da extensão
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Mensagem recebida no background:', request);
  
  switch (request.action) {
    case 'fetchMessages':
      getCachedMessages(request.filters || {})
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Indica resposta assíncrona
      
    case 'fetchMacros':
      fetchMacros(request.filters || {})
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'searchMessages':
      searchCachedMessages(request.query, { limit: request.limit || 10, ...request.filters })
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'getMessageByCommand':
      getMessageByCommand(request.command)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'checkAuth':
      authManager.checkAuthentication(request.force || false)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'getUserInfo':
      sendResponse({
        success: true,
        userInfo: authManager.getUserInfo(),
        isAuthenticated: authManager.isAuthenticated
      });
      break;
      
    case 'logout':
      authManager.logout()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'hasPermission':
      sendResponse({
        success: true,
        hasPermission: authManager.hasPermission(request.permission)
      });
      break;
      
    case 'clearCache':
      cacheManager.clearCache(request.type)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    
    case 'getCacheStats':
      cacheManager.getCacheStats()
        .then(stats => sendResponse({ success: true, stats }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    
    case 'syncCache':
      cacheManager.syncData()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    
    case 'getConfig':
      sendResponse({ success: true, config: configManager.config });
      break;
    
    case 'setConfig':
      configManager.set(request.path, request.value)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    
    case 'resetConfig':
      configManager.reset(request.section)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    
    case 'exportConfig':
      try {
        const exportData = configManager.export();
        sendResponse({ success: true, data: exportData });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
      break;
    
    case 'importConfig':
      configManager.import(request.data)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'updateApiConfig':
      if (request.baseUrl) {
        API_CONFIG.baseUrl = request.baseUrl;
        // Limpar cache ao mudar configuração
        cacheManager.clearAllCache();
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'URL base é obrigatória' });
      }
      break;

    default:
      console.warn('Ação não reconhecida:', request.action);
      sendResponse({ success: false, error: 'Ação não reconhecida' });
  }
});

// Listener para quando a extensão é instalada
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Olist Helper Macro Extension instalada!');
    
    // Configurar valores padrão no storage
    chrome.storage.sync.set({
      macroTrigger: '//',
      enableNotifications: true,
      cacheEnabled: true
    });
  }
});

// A URL da API é fixa para o Vercel - não precisa ser configurável
// Isso garante que a extensão sempre aponte para o servidor correto
console.log('API configurada para:', API_CONFIG.baseUrl);

// Inicializar sistema de autenticação quando o script carrega
authManager.initialize().then(() => {
  console.log('Sistema de autenticação inicializado');
}).catch(error => {
  console.error('Erro ao inicializar sistema de autenticação:', error);
});

// Inicializar sistemas quando o script carrega
configManager.initialize().then(() => {
  console.log('Sistema de configuração inicializado');
}).catch(error => {
  console.error('Erro ao inicializar sistema de configuração:', error);
});

cacheManager.initialize().then(() => {
  console.log('Sistema de cache inicializado');
}).catch(error => {
  console.error('Erro ao inicializar sistema de cache:', error);
});

// Função para debug
function debugInfo() {
  const cacheStats = cacheManager.getCacheStats();
  return {
    apiConfig: API_CONFIG,
    cacheInfo: {
      itemsCount: cacheStats.messages?.itemsCount || 0,
      lastUpdate: cacheStats.messages?.lastUpdate || 'Never',
      isValid: cacheStats.messages?.isValid || false
    }
  };
}

// Expor função de debug globalmente para desenvolvimento
if (typeof globalThis !== 'undefined') {
  globalThis.olistHelperDebug = debugInfo;
}