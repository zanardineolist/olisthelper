// Sistema de autenticação para a extensão Olist Helper
// Gerencia autenticação usando cookies de sessão do navegador

class AuthManager {
  constructor() {
    this.isAuthenticated = false;
    this.userInfo = null;
    this.sessionToken = null;
    this.lastAuthCheck = 0;
    this.authCheckInterval = 5 * 60 * 1000; // 5 minutos
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  // Verificar se o usuário está autenticado
  async checkAuthentication(force = false) {
    const now = Date.now();
    
    // Usar cache se não forçado e dentro do intervalo
    if (!force && (now - this.lastAuthCheck) < this.authCheckInterval) {
      return {
        isAuthenticated: this.isAuthenticated,
        userInfo: this.userInfo
      };
    }

    try {
      const result = await this.performAuthCheck();
      this.lastAuthCheck = now;
      return result;
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      return {
        isAuthenticated: false,
        error: error.message
      };
    }
  }

  // Realizar verificação de autenticação
  async performAuthCheck() {
    const apiBaseUrl = this.getApiBaseUrl();
    
    // Obter cookies de sessão
    const sessionCookies = await this.getSessionCookies(apiBaseUrl);
    
    if (!sessionCookies || sessionCookies.length === 0) {
      this.clearAuthState();
      return {
        isAuthenticated: false,
        reason: 'no_session_cookies'
      };
    }

    // Verificar autenticação com o backend
    const authResult = await this.validateWithBackend(apiBaseUrl, sessionCookies);
    
    if (authResult.success) {
      this.isAuthenticated = true;
      this.userInfo = authResult.user;
      this.sessionToken = authResult.token;
      
      // Salvar informações no storage
      await this.saveAuthState();
      
      return {
        isAuthenticated: true,
        userInfo: this.userInfo
      };
    } else {
      this.clearAuthState();
      return {
        isAuthenticated: false,
        reason: authResult.reason || 'validation_failed'
      };
    }
  }

  // Obter cookies de sessão do navegador
  async getSessionCookies(baseUrl) {
    try {
      const url = new URL(baseUrl);
      const domain = url.hostname;
      
      console.log('Buscando cookies para domínio:', domain);
      
      // Buscar cookies relevantes para autenticação
      const cookies = await chrome.cookies.getAll({
        domain: domain
      });
      
      console.log('Todos os cookies encontrados:', cookies.map(c => c.name));
      
      // Filtrar cookies de sessão do NextAuth
      const sessionCookies = cookies.filter(cookie => {
        const name = cookie.name.toLowerCase();
        return name.includes('session') || 
               name.includes('auth') || 
               name.includes('token') ||
               name.startsWith('next-auth') ||
               name.startsWith('__session') ||
               name.startsWith('__secure-next-auth') ||
               name.startsWith('__host-next-auth') ||
               name === 'next-auth.session-token' ||
               name === '__secure-next-auth.session-token';
      });
      
      console.log('Cookies de sessão filtrados:', sessionCookies.map(c => c.name));
      
      return sessionCookies;
    } catch (error) {
      console.error('Erro ao obter cookies:', error);
      return [];
    }
  }

  // Validar autenticação com o backend
  async validateWithBackend(baseUrl, cookies) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const cookieHeader = cookies
          .map(cookie => `${cookie.name}=${cookie.value}`)
          .join('; ');
        
        console.log('Fazendo requisição para:', `${baseUrl}/api/auth/session`);
        console.log('Cookie header:', cookieHeader);
        
        const response = await fetch(`${baseUrl}/api/auth/session`, {
          method: 'GET',
          headers: {
            'Cookie': cookieHeader,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        console.log('Status da resposta:', response.status);
        
        if (response.ok) {
          const sessionData = await response.json();
          
          if (sessionData && sessionData.user) {
            return {
              success: true,
              user: sessionData.user,
              token: sessionData.accessToken || null
            };
          } else {
            return {
              success: false,
              reason: 'no_user_data'
            };
          }
        } else if (response.status === 401) {
          return {
            success: false,
            reason: 'unauthorized'
          };
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        lastError = error;
        console.warn(`Tentativa ${attempt} de autenticação falhou:`, error.message);
        
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }
    
    return {
      success: false,
      reason: 'network_error',
      error: lastError?.message
    };
  }

  // URL base da API é fixa para o Vercel
  getApiBaseUrl() {
    return 'https://olisthelper.vercel.app';
  }

  // Salvar estado de autenticação
  async saveAuthState() {
    const authData = {
      isAuthenticated: this.isAuthenticated,
      userInfo: this.userInfo,
      sessionToken: this.sessionToken,
      lastAuthCheck: this.lastAuthCheck
    };
    
    return new Promise((resolve) => {
      chrome.storage.local.set({ authState: authData }, resolve);
    });
  }

  // Carregar estado de autenticação
  async loadAuthState() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['authState'], (result) => {
        if (result.authState) {
          this.isAuthenticated = result.authState.isAuthenticated || false;
          this.userInfo = result.authState.userInfo || null;
          this.sessionToken = result.authState.sessionToken || null;
          this.lastAuthCheck = result.authState.lastAuthCheck || 0;
        }
        resolve();
      });
    });
  }

  // Limpar estado de autenticação
  clearAuthState() {
    this.isAuthenticated = false;
    this.userInfo = null;
    this.sessionToken = null;
    this.lastAuthCheck = 0;
    
    // Limpar do storage
    chrome.storage.local.remove(['authState']);
  }

  // Fazer logout
  async logout() {
    try {
      const apiBaseUrl = this.getApiBaseUrl();
      
      // Tentar fazer logout no backend
      await fetch(`${apiBaseUrl}/api/auth/signout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.warn('Erro ao fazer logout no backend:', error);
    }
    
    // Limpar estado local
    this.clearAuthState();
    
    return { success: true };
  }

  // Obter informações do usuário
  getUserInfo() {
    return this.userInfo;
  }

  // Verificar se tem permissão específica
  hasPermission(permission) {
    if (!this.isAuthenticated || !this.userInfo) {
      return false;
    }
    
    // Verificar role do usuário
    const userRole = this.userInfo.role || this.userInfo.user_role;
    
    switch (permission) {
      case 'read_messages':
        return ['admin', 'manager', 'analyst', 'agent'].includes(userRole);
      case 'write_messages':
        return ['admin', 'manager', 'analyst'].includes(userRole);
      case 'admin':
        return userRole === 'admin';
      default:
        return false;
    }
  }

  // Obter headers de autenticação para requisições
  async getAuthHeaders() {
    const apiBaseUrl = this.getApiBaseUrl();
    const cookies = await this.getSessionCookies(apiBaseUrl);
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (cookies && cookies.length > 0) {
      headers['Cookie'] = cookies
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ');
    }
    
    if (this.sessionToken) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    }
    
    return headers;
  }

  // Fazer requisição autenticada
  async authenticatedFetch(url, options = {}) {
    const headers = await this.getAuthHeaders();
    
    const requestOptions = {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      },
      credentials: 'include'
    };
    
    const response = await fetch(url, requestOptions);
    
    // Se não autorizado, limpar estado de auth
    if (response.status === 401) {
      this.clearAuthState();
    }
    
    return response;
  }

  // Utilitário para delay
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Inicializar gerenciador de autenticação
  async initialize() {
    await this.loadAuthState();
    
    // Verificar autenticação inicial
    await this.checkAuthentication(true);
    
    // Configurar verificação periódica
    setInterval(() => {
      this.checkAuthentication(true);
    }, this.authCheckInterval);
  }

  // Método de debug para testar sessão
  async debugSession() {
    try {
      console.log('[DEBUG] === TESTE DE SESSÃO ===');
      
      // Testar endpoint de debug
      const response = await fetch('https://olisthelper.vercel.app/api/auth/session-debug', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('[DEBUG] Status da resposta:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[DEBUG] Dados da sessão:', data);
        return data;
      } else {
        const errorText = await response.text();
        console.log('[DEBUG] Erro da resposta:', errorText);
        return { error: errorText, status: response.status };
      }
      
    } catch (error) {
      console.error('[DEBUG] Erro no teste de sessão:', error);
      return { error: error.message };
    }
  }
}

// Instância global do gerenciador de autenticação
const authManager = new AuthManager();

// Exportar para uso em outros scripts (ES6 modules)
export { AuthManager, authManager };

// Compatibilidade com window para content scripts
if (typeof window !== 'undefined') {
  window.authManager = authManager;
}

console.log('Sistema de autenticação da extensão carregado');