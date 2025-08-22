// Sistema de configuração e personalização da extensão Olist Helper
// Gerencia preferências do usuário e configurações da extensão

class ConfigManager {
  constructor() {
    this.defaultConfig = {
      // Configurações de interface
      ui: {
        theme: 'auto', // 'light', 'dark', 'auto'
        position: 'bottom-right', // Posição da interface de busca
        maxResults: 10, // Número máximo de resultados
        showPreview: true, // Mostrar preview das mensagens
        animationSpeed: 'normal', // 'slow', 'normal', 'fast'
        fontSize: 'medium' // 'small', 'medium', 'large'
      },
      
      // Configurações de atalhos
      shortcuts: {
        triggerMacro: '//', // Sequência para ativar macro
        closeInterface: 'Escape', // Tecla para fechar interface
        selectNext: 'ArrowDown', // Navegar para próximo item
        selectPrev: 'ArrowUp', // Navegar para item anterior
        insertSelected: 'Enter', // Inserir item selecionado
        quickSearch: 'Ctrl+Shift+F' // Busca rápida global
      },
      
      // Configurações de cache
      cache: {
        enabled: true, // Habilitar cache
        ttl: 300000, // TTL em milissegundos (5 minutos)
        maxSize: 50, // Máximo de itens no cache
        autoSync: true, // Sincronização automática
        syncInterval: 600000, // Intervalo de sincronização (10 minutos)
        preloadPopular: true // Pré-carregar mensagens populares
      },
      
      // Configurações de busca
      search: {
        minQueryLength: 2, // Mínimo de caracteres para busca
        searchDelay: 300, // Delay em ms antes de buscar
        fuzzySearch: true, // Busca aproximada
        highlightMatches: true, // Destacar termos encontrados
        searchInTags: true, // Buscar também nas tags
        caseSensitive: false // Busca sensível a maiúsculas
      },
      
      // Configurações de notificações
      notifications: {
        enabled: true, // Habilitar notificações
        position: 'top-right', // Posição das notificações
        duration: 3000, // Duração em ms
        showSuccess: true, // Mostrar notificações de sucesso
        showErrors: true, // Mostrar notificações de erro
        sound: false // Som nas notificações
      },
      
      // Configurações de performance
      performance: {
        lazyLoad: true, // Carregamento sob demanda
        debounceSearch: true, // Debounce na busca
        virtualScrolling: false, // Scroll virtual para listas grandes
        prefetchResults: true, // Pré-buscar resultados
        compressionLevel: 'medium' // 'low', 'medium', 'high'
      },
      
      // Configurações de acessibilidade
      accessibility: {
        highContrast: false, // Alto contraste
        largeText: false, // Texto grande
        reduceMotion: false, // Reduzir animações
        screenReader: false, // Otimizações para leitores de tela
        keyboardNavigation: true // Navegação por teclado
      },
      
      // Configurações avançadas
      advanced: {
        debugMode: false, // Modo debug
        logLevel: 'error', // 'debug', 'info', 'warn', 'error'
        telemetry: true, // Enviar dados de uso
        betaFeatures: false, // Habilitar recursos beta
        customCSS: '', // CSS personalizado
        apiTimeout: 10000 // Timeout da API em ms
      }
    };
    
    this.config = { ...this.defaultConfig };
    this.listeners = new Map();
  }
  
  // Inicializar configurações
  async initialize() {
    try {
      await this.loadConfig();
      this.applyConfig();
      console.log('Sistema de configuração inicializado');
    } catch (error) {
      console.error('Erro ao inicializar configurações:', error);
      // Usar configurações padrão em caso de erro
      this.config = { ...this.defaultConfig };
    }
  }
  
  // Carregar configurações do storage
  async loadConfig() {
    const result = await chrome.storage.sync.get('olistHelperConfig');
    if (result.olistHelperConfig) {
      this.config = this.mergeConfig(this.defaultConfig, result.olistHelperConfig);
    }
  }
  
  // Salvar configurações no storage
  async saveConfig() {
    await chrome.storage.sync.set({ olistHelperConfig: this.config });
    this.applyConfig();
    this.notifyListeners('configChanged', this.config);
  }
  
  // Mesclar configurações (deep merge)
  mergeConfig(defaultConfig, userConfig) {
    const merged = { ...defaultConfig };
    
    for (const [key, value] of Object.entries(userConfig)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        merged[key] = this.mergeConfig(defaultConfig[key] || {}, value);
      } else {
        merged[key] = value;
      }
    }
    
    return merged;
  }
  
  // Aplicar configurações
  applyConfig() {
    // Verificar se estamos em um contexto que suporta DOM (não service worker)
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.applyTheme();
      this.applyAccessibility();
      this.applyPerformance();
    }
  }
  
  // Aplicar tema
  applyTheme() {
    // Verificar se estamos em um contexto que suporta DOM
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    
    const theme = this.config.ui.theme;
    if (theme === 'auto') {
      // Detectar preferência do sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }
  
  // Aplicar configurações de acessibilidade
  applyAccessibility() {
    // Verificar se estamos em um contexto que suporta DOM
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    
    const { accessibility } = this.config;
    
    document.documentElement.classList.toggle('high-contrast', accessibility.highContrast);
    document.documentElement.classList.toggle('large-text', accessibility.largeText);
    document.documentElement.classList.toggle('reduce-motion', accessibility.reduceMotion);
  }
  
  // Aplicar configurações de performance
  applyPerformance() {
    const { performance } = this.config;
    
    // Configurar debounce baseado nas configurações
    if (performance.debounceSearch) {
      this.searchDebounceTime = this.config.search.searchDelay;
    } else {
      this.searchDebounceTime = 0;
    }
  }
  
  // Obter configuração específica
  get(path) {
    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }
  
  // Definir configuração específica
  async set(path, value) {
    const keys = path.split('.');
    let current = this.config;
    
    // Navegar até o penúltimo nível
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    // Definir o valor final
    current[keys[keys.length - 1]] = value;
    
    await this.saveConfig();
  }
  
  // Resetar configurações para padrão
  async reset(section = null) {
    if (section) {
      this.config[section] = { ...this.defaultConfig[section] };
    } else {
      this.config = { ...this.defaultConfig };
    }
    
    await this.saveConfig();
  }
  
  // Exportar configurações
  export() {
    return JSON.stringify(this.config, null, 2);
  }
  
  // Importar configurações
  async import(configJson) {
    try {
      const importedConfig = JSON.parse(configJson);
      this.config = this.mergeConfig(this.defaultConfig, importedConfig);
      await this.saveConfig();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  // Validar configuração
  validateConfig(config) {
    const errors = [];
    
    // Validar tipos e valores
    if (config.cache?.ttl && (typeof config.cache.ttl !== 'number' || config.cache.ttl < 0)) {
      errors.push('TTL do cache deve ser um número positivo');
    }
    
    if (config.search?.minQueryLength && (typeof config.search.minQueryLength !== 'number' || config.search.minQueryLength < 1)) {
      errors.push('Comprimento mínimo da busca deve ser um número positivo');
    }
    
    return errors;
  }
  
  // Adicionar listener para mudanças de configuração
  addListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }
  
  // Remover listener
  removeListener(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }
  
  // Notificar listeners
  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Erro ao executar listener:', error);
        }
      });
    }
  }
  
  // Obter esquema de configuração para UI
  getConfigSchema() {
    return {
      ui: {
        title: 'Interface',
        fields: {
          theme: { type: 'select', options: ['light', 'dark', 'auto'], label: 'Tema' },
          position: { type: 'select', options: ['top-left', 'top-right', 'bottom-left', 'bottom-right'], label: 'Posição' },
          maxResults: { type: 'number', min: 5, max: 50, label: 'Máximo de resultados' },
          showPreview: { type: 'boolean', label: 'Mostrar preview' },
          animationSpeed: { type: 'select', options: ['slow', 'normal', 'fast'], label: 'Velocidade das animações' },
          fontSize: { type: 'select', options: ['small', 'medium', 'large'], label: 'Tamanho da fonte' }
        }
      },
      shortcuts: {
        title: 'Atalhos',
        fields: {
          triggerMacro: { type: 'text', label: 'Ativar macro' },
          closeInterface: { type: 'text', label: 'Fechar interface' },
          quickSearch: { type: 'text', label: 'Busca rápida' }
        }
      },
      cache: {
        title: 'Cache',
        fields: {
          enabled: { type: 'boolean', label: 'Habilitar cache' },
          ttl: { type: 'number', min: 60000, max: 3600000, label: 'TTL (ms)' },
          maxSize: { type: 'number', min: 10, max: 200, label: 'Tamanho máximo' },
          autoSync: { type: 'boolean', label: 'Sincronização automática' }
        }
      },
      search: {
        title: 'Busca',
        fields: {
          minQueryLength: { type: 'number', min: 1, max: 10, label: 'Mínimo de caracteres' },
          searchDelay: { type: 'number', min: 0, max: 1000, label: 'Delay (ms)' },
          fuzzySearch: { type: 'boolean', label: 'Busca aproximada' },
          highlightMatches: { type: 'boolean', label: 'Destacar resultados' }
        }
      },
      accessibility: {
        title: 'Acessibilidade',
        fields: {
          highContrast: { type: 'boolean', label: 'Alto contraste' },
          largeText: { type: 'boolean', label: 'Texto grande' },
          reduceMotion: { type: 'boolean', label: 'Reduzir animações' },
          keyboardNavigation: { type: 'boolean', label: 'Navegação por teclado' }
        }
      }
    };
  }
}

// Instância global do gerenciador de configurações
const configManager = new ConfigManager();

// Exportar para uso em outros scripts (ES6 modules)
export { ConfigManager, configManager };