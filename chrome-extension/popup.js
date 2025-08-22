// Script do popup da extensão Olist Helper
// Gerencia a interface do popup e comunicação com o background script

// Elementos do DOM
const elements = {
  connectionStatus: document.getElementById('connection-status'),
  connectionIndicator: document.getElementById('connection-indicator'),
  macrosCount: document.getElementById('macros-count'),
  lastSync: document.getElementById('last-sync'),
  refreshBtn: document.getElementById('refresh-btn'),
  refreshLoading: document.getElementById('refresh-loading'),
  refreshText: document.getElementById('refresh-text'),
  testMacroBtn: document.getElementById('test-macro-btn'),
  apiUrl: document.getElementById('api-url'),
  macroTrigger: document.getElementById('macro-trigger'),
  saveSettingsBtn: document.getElementById('save-settings-btn')
};

// Estado do popup
let popupState = {
  isConnected: false,
  isAuthenticated: false,
  userInfo: null,
  macroCount: 0,
  lastSync: null,
  isLoading: false,
  cacheStats: null
};

let currentSettings = {};

// Inicializar popup
async function initializePopup() {
  try {
    // Carregar configurações
    await loadSettings();
    
    // Verificar status da conexão
    await checkConnectionStatus();
    
    // Carregar informações das macros
    await loadMacrosInfo();
    
    // Carregar estatísticas do cache
    await getCacheStats();
    
    // Configurar event listeners
    setupEventListeners();
    
  } catch (error) {
    console.error('Erro ao inicializar popup:', error);
    showError('Erro ao carregar extensão');
  }
}

// Carregar configurações do storage
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([
      'apiBaseUrl',
      'macroTrigger',
      'enableNotifications',
      'cacheEnabled'
    ], (result) => {
      currentSettings = {
        apiBaseUrl: result.apiBaseUrl || 'http://localhost:3000',
        macroTrigger: result.macroTrigger || '//',
        enableNotifications: result.enableNotifications !== false,
        cacheEnabled: result.cacheEnabled !== false
      };
      
      // Preencher campos
      elements.apiUrl.value = currentSettings.apiBaseUrl;
      elements.macroTrigger.value = currentSettings.macroTrigger;
      
      resolve();
    });
  });
}

// Verificar autenticação
async function checkAuthentication() {
  try {
    setLoading(true);
    
    const authResponse = await chrome.runtime.sendMessage({
      action: 'checkAuth',
      force: true
    });
    
    if (authResponse && authResponse.isAuthenticated) {
      popupState.isAuthenticated = true;
      popupState.userInfo = authResponse.userInfo;
      updateConnectionStatus('Conectado', true);
    } else {
      popupState.isAuthenticated = false;
      popupState.userInfo = null;
      updateConnectionStatus('Não autenticado', false);
    }
    
    return popupState.isAuthenticated;
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error);
    popupState.isAuthenticated = false;
    updateConnectionStatus('Erro de autenticação', false);
    return false;
  } finally {
    setLoading(false);
  }
}

// Verificar status da conexão
async function checkConnectionStatus() {
  try {
    setLoading(true);
    
    // Primeiro verificar autenticação
    const isAuth = await checkAuthentication();
    
    if (isAuth) {
      // Tentar buscar algumas mensagens para testar conexão
      const response = await chrome.runtime.sendMessage({
        action: 'fetchMessages',
        filters: { limit: 1 }
      });
      
      if (response && response.success) {
        updateConnectionStatus('Conectado', true);
      } else {
        updateConnectionStatus('Erro de conexão', false);
      }
    } else {
      updateConnectionStatus('Não autenticado', false);
    }
  } catch (error) {
    console.error('Erro ao verificar conexão:', error);
    updateConnectionStatus('Erro de conexão', false);
  } finally {
    setLoading(false);
  }
}

// Atualizar status da conexão na interface
function updateConnectionStatus(status, isConnected) {
  elements.connectionStatus.textContent = status;
  elements.connectionIndicator.className = `status-indicator ${
    isConnected ? 'status-connected' : 'status-disconnected'
  }`;
}

// Atualizar status de autenticação na interface
function updateAuthenticationStatus(isAuthenticated, userInfo = null, error = null) {
  const userInfoElement = document.getElementById('userInfo') || document.getElementById('user-info');
  const authStatusElement = document.getElementById('authStatus') || document.getElementById('auth-status');
  const logoutBtn = document.getElementById('logoutBtn') || document.getElementById('logout-btn');
  
  if (isAuthenticated && userInfo) {
    if (userInfoElement) {
      userInfoElement.innerHTML = `
        <div class="user-info">
          <span class="user-name">${userInfo.name || userInfo.email || 'Usuário'}</span>
          <span class="user-role">${userInfo.role || userInfo.user_role || ''}</span>
        </div>
      `;
      userInfoElement.style.display = 'block';
    }
    
    if (authStatusElement) {
      authStatusElement.textContent = 'Autenticado';
      authStatusElement.className = 'auth-status authenticated';
    }
    
    // Mostrar botão de logout
    if (logoutBtn) {
      logoutBtn.style.display = 'block';
    }
  } else {
    if (userInfoElement) {
      userInfoElement.style.display = 'none';
    }
    
    if (authStatusElement) {
      authStatusElement.textContent = error || 'Não autenticado';
      authStatusElement.className = 'auth-status not-authenticated';
    }
    
    // Ocultar botão de logout
    if (logoutBtn) {
      logoutBtn.style.display = 'none';
    }
  }
  
  popupState.isAuthenticated = isAuthenticated;
  popupState.userInfo = userInfo;
}

// Carregar informações das macros
async function loadMacrosInfo() {
  try {
    setLoading(true);
    
    // Verificar se está autenticado primeiro
    if (!popupState.isAuthenticated) {
      elements.macrosCount.textContent = '0';
      return;
    }
    
    const response = await chrome.runtime.sendMessage({
      action: 'fetchMessages',
      filters: { limit: 100 }
    });
    
    if (response && response.success) {
      const count = response.messages ? response.messages.length : 0;
      elements.macrosCount.textContent = count;
      elements.lastSync.textContent = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (response && response.needsAuth) {
      // Sessão expirou, atualizar status de autenticação
      await checkAuthentication();
      elements.macrosCount.textContent = '0';
    } else {
      elements.macrosCount.textContent = 'Erro';
      elements.lastSync.textContent = 'Falha';
      console.error('Erro ao carregar macros:', response?.error);
    }
  } catch (error) {
    console.error('Erro ao carregar informações das macros:', error);
    elements.macrosCount.textContent = 'Erro';
    elements.lastSync.textContent = 'Falha';
  } finally {
    setLoading(false);
  }
}

// Fazer logout
async function logout() {
  try {
    setLoading(true);
    
    const response = await chrome.runtime.sendMessage({
      action: 'logout'
    });
    
    if (response && response.success) {
      // Atualizar estado local
      popupState.isAuthenticated = false;
      popupState.userInfo = null;
      popupState.macroCount = 0;
      
      // Atualizar interface
      updateAuthenticationStatus(false);
      updateConnectionStatus('Desconectado', false);
      elements.macrosCount.textContent = '0';
      
      showSuccess('Logout realizado com sucesso');
    } else {
      showError('Erro ao fazer logout: ' + (response?.error || 'Erro desconhecido'));
    }
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    showError('Erro ao fazer logout: ' + error.message);
  } finally {
    setLoading(false);
  }
}

// Funções de gerenciamento de cache
async function getCacheStats() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getCacheStats' });
    if (response.success) {
      popupState.cacheStats = response.stats;
      updateCacheDisplay();
    }
  } catch (error) {
    console.error('Erro ao obter estatísticas do cache:', error);
  }
}

async function clearCache(type = 'all') {
  try {
    const response = await chrome.runtime.sendMessage({ 
      action: 'clearCache',
      type: type
    });
    if (response.success) {
      await getCacheStats(); // Atualizar estatísticas
      showNotification('Cache limpo com sucesso!', 'success');
    }
  } catch (error) {
    console.error('Erro ao limpar cache:', error);
    showNotification('Erro ao limpar cache', 'error');
  }
}

async function syncCache() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'syncCache' });
    if (response.success) {
      await getCacheStats(); // Atualizar estatísticas
      showNotification('Cache sincronizado com sucesso!', 'success');
    }
  } catch (error) {
    console.error('Erro ao sincronizar cache:', error);
    showNotification('Erro ao sincronizar cache', 'error');
  }
}

function updateCacheDisplay() {
  const cacheInfo = document.getElementById('cacheInfo');
  if (!cacheInfo || !popupState.cacheStats) return;

  const stats = popupState.cacheStats;
  const totalSize = Object.values(stats).reduce((sum, cache) => sum + (cache.size || 0), 0);
  const totalItems = Object.values(stats).reduce((sum, cache) => sum + (cache.items || 0), 0);

  cacheInfo.innerHTML = `
    <div class="cache-summary">
      <span>📦 ${totalItems} itens</span>
      <span>💾 ${formatBytes(totalSize)}</span>
    </div>
  `;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showNotification(message, type = 'info') {
  // Implementação simples de notificação
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    padding: 10px 15px;
    border-radius: 4px;
    color: white;
    font-size: 12px;
    z-index: 1000;
    background-color: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Configurar event listeners
function setupEventListeners() {
  // Botão de atualizar
  elements.refreshBtn.addEventListener('click', handleRefresh);
  
  // Botão de testar macro
  elements.testMacroBtn.addEventListener('click', handleTestMacro);
  
  // Botão de salvar configurações
  elements.saveSettingsBtn.addEventListener('click', handleSaveSettings);
  
  // Botão de logout
  const logoutBtn = document.getElementById('logoutBtn') || document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (confirm('Tem certeza que deseja fazer logout?')) {
        await logout();
      }
    });
  }
  
  // Event listeners para botões de cache
  const syncCacheBtn = document.getElementById('syncCacheBtn');
  if (syncCacheBtn) {
    syncCacheBtn.addEventListener('click', syncCache);
  }

  const clearCacheBtn = document.getElementById('clearCacheBtn');
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', () => {
      if (confirm('Tem certeza que deseja limpar o cache? Isso pode afetar a performance temporariamente.')) {
        clearCache();
      }
    });
  }
  
  // Event listener for settings button
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
    });
  }
  
  // Validação em tempo real dos campos
  elements.apiUrl.addEventListener('input', validateApiUrl);
  elements.macroTrigger.addEventListener('input', validateMacroTrigger);
}

// Manipular atualização de macros
async function handleRefresh() {
  if (isLoading) return;
  
  setLoading(true);
  
  try {
    // Limpar cache
    await chrome.runtime.sendMessage({ action: 'clearCache' });
    
    // Verificar conexão
    await checkConnectionStatus();
    
    // Recarregar macros
    await loadMacrosInfo();
    
    showSuccess('Macros atualizadas com sucesso!');
  } catch (error) {
    console.error('Erro ao atualizar:', error);
    showError('Erro ao atualizar macros');
  } finally {
    setLoading(false);
  }
}

// Manipular teste de macro
async function handleTestMacro() {
  try {
    // Abrir nova aba com página de teste
    const testUrl = chrome.runtime.getURL('test.html');
    await chrome.tabs.create({ url: testUrl });
    
    // Fechar popup
    window.close();
  } catch (error) {
    console.error('Erro ao abrir teste:', error);
    showError('Erro ao abrir página de teste');
  }
}

// Manipular salvamento de configurações
async function handleSaveSettings() {
  try {
    const newSettings = {
      apiBaseUrl: elements.apiUrl.value.trim(),
      macroTrigger: elements.macroTrigger.value.trim()
    };
    
    // Validar configurações
    if (!validateSettings(newSettings)) {
      return;
    }
    
    // Salvar no storage
    await new Promise((resolve) => {
      chrome.storage.sync.set(newSettings, resolve);
    });
    
    // Atualizar configuração da API no background
    await chrome.runtime.sendMessage({
      action: 'updateApiConfig',
      baseUrl: newSettings.apiBaseUrl
    });
    
    currentSettings = { ...currentSettings, ...newSettings };
    
    showSuccess('Configurações salvas!');
    
    // Recarregar informações
    setTimeout(() => {
      checkConnectionStatus();
      loadMacrosInfo();
    }, 500);
    
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    showError('Erro ao salvar configurações');
  }
}

// Validar configurações
function validateSettings(settings) {
  // Validar URL da API
  try {
    new URL(settings.apiBaseUrl);
  } catch {
    showError('URL da API inválida');
    return false;
  }
  
  // Validar trigger de macro
  if (!settings.macroTrigger || settings.macroTrigger.length < 1 || settings.macroTrigger.length > 5) {
    showError('Trigger deve ter entre 1 e 5 caracteres');
    return false;
  }
  
  return true;
}

// Validar URL da API em tempo real
function validateApiUrl() {
  const url = elements.apiUrl.value.trim();
  if (url) {
    try {
      new URL(url);
      elements.apiUrl.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    } catch {
      elements.apiUrl.style.borderColor = '#ef4444';
    }
  }
}

// Validar trigger de macro em tempo real
function validateMacroTrigger() {
  const trigger = elements.macroTrigger.value;
  if (trigger.length > 5) {
    elements.macroTrigger.value = trigger.substring(0, 5);
  }
  
  if (trigger.length === 0) {
    elements.macroTrigger.style.borderColor = '#ef4444';
  } else {
    elements.macroTrigger.style.borderColor = 'rgba(255, 255, 255, 0.3)';
  }
}

// Controlar estado de loading
function setLoading(loading) {
  isLoading = loading;
  
  if (loading) {
    elements.refreshLoading.classList.remove('hidden');
    elements.refreshText.textContent = 'Atualizando...';
    elements.refreshBtn.disabled = true;
  } else {
    elements.refreshLoading.classList.add('hidden');
    elements.refreshText.textContent = '🔄 Atualizar Macros';
    elements.refreshBtn.disabled = false;
  }
}

// Mostrar mensagem de sucesso
function showSuccess(message) {
  // Criar notificação temporária
  const notification = createNotification(message, 'success');
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Mostrar mensagem de erro
function showError(message) {
  // Criar notificação temporária
  const notification = createNotification(message, 'error');
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// Criar elemento de notificação
function createNotification(message, type) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    right: 10px;
    padding: 12px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    z-index: 1000;
    animation: slideDown 0.3s ease-out;
    ${type === 'success' 
      ? 'background: #10b981; color: white;' 
      : 'background: #ef4444; color: white;'
    }
  `;
  
  notification.textContent = message;
  
  // Adicionar animação CSS
  if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      @keyframes slideDown {
        from {
          transform: translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  return notification;
}

// Utilitários
function formatDate(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('Popup carregado');
    
    // Carregar configurações
    await loadSettings();
    
    // Verificar autenticação
    await checkConnectionStatus();
    
    // Verificar status inicial
    await loadMacrosInfo();
    
    // Configurar event listeners
    setupEventListeners();
  });
} else {
  initializePopup();
}

// Listener para mudanças no storage
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    loadSettings();
  }
});

console.log('Popup da extensão Olist Helper carregado!');