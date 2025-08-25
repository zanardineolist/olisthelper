// Settings page functionality
class SettingsManager {
  constructor() {
    this.config = null;
    this.unsavedChanges = false;
    this.init();
  }

  async init() {
    await this.loadConfig();
    this.setupEventListeners();
    this.populateSettings();
    this.setupTabNavigation();
  }

  async loadConfig() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getConfig'
      });
      
      if (response.success) {
        this.config = response.config;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      this.showNotification('Erro ao carregar configurações', 'error');
    }
  }

  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Toggle switches
    document.querySelectorAll('.toggle-switch').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        this.handleToggle(e.target);
      });
    });

    // Form controls
    document.querySelectorAll('.form-control').forEach(control => {
      control.addEventListener('change', (e) => {
        this.handleInputChange(e.target);
      });
    });

    // Range inputs
    document.querySelectorAll('.range-input').forEach(range => {
      range.addEventListener('input', (e) => {
        this.handleRangeChange(e.target);
      });
    });

    // Action buttons
    document.getElementById('saveBtn').addEventListener('click', () => {
      this.saveConfig();
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
      this.resetConfig();
    });

    document.getElementById('exportBtn').addEventListener('click', () => {
      this.exportConfig();
    });

    document.getElementById('importBtn').addEventListener('click', () => {
      document.getElementById('importFile').click();
    });

    document.getElementById('importFile').addEventListener('change', (e) => {
      this.importConfig(e.target.files[0]);
    });

    // Warn about unsaved changes
    window.addEventListener('beforeunload', (e) => {
      if (this.unsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Você tem alterações não salvas. Deseja sair mesmo assim?';
      }
    });
  }

  setupTabNavigation() {
    // Set first tab as active by default
    this.switchTab('interface');
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
  }

  populateSettings() {
    if (!this.config) return;

    // Populate form controls
    document.querySelectorAll('[data-config]').forEach(element => {
      const configPath = element.dataset.config;
      const value = this.getNestedValue(this.config, configPath);
      
      if (element.classList.contains('toggle-switch')) {
        element.classList.toggle('active', value);
      } else if (element.type === 'range') {
        element.value = value;
        this.updateRangeDisplay(element);
      } else {
        element.value = value;
      }
    });
  }

  handleToggle(toggle) {
    toggle.classList.toggle('active');
    const configPath = toggle.dataset.config;
    const value = toggle.classList.contains('active');
    this.setNestedValue(this.config, configPath, value);
    this.markUnsaved();
  }

  handleInputChange(input) {
    const configPath = input.dataset.config;
    let value = input.value;
    
    // Convert numeric values
    if (input.type === 'number' || input.type === 'range') {
      value = parseInt(value, 10);
    }
    
    this.setNestedValue(this.config, configPath, value);
    this.markUnsaved();
  }

  handleRangeChange(range) {
    this.updateRangeDisplay(range);
    this.handleInputChange(range);
  }

  updateRangeDisplay(range) {
    const valueDisplay = range.parentNode.querySelector('.range-value');
    if (!valueDisplay) return;

    const configPath = range.dataset.config;
    const value = parseInt(range.value, 10);
    
    let displayText = value;
    
    // Custom display formats
    switch (configPath) {
      case 'ui.maxResults':
        displayText = `${value} resultados`;
        break;
      case 'cache.maxSize':
        displayText = `${value} itens`;
        break;
      case 'search.minQueryLength':
        displayText = `${value} caracteres`;
        break;
      case 'search.searchDelay':
        displayText = `${value}ms`;
        break;
      default:
        displayText = value;
    }
    
    valueDisplay.textContent = displayText;
  }

  async saveConfig() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'setConfig',
        config: this.config
      });
      
      if (response.success) {
        this.unsavedChanges = false;
        this.showNotification('Configurações salvas com sucesso!', 'success');
        this.updateSaveButton();
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      this.showNotification('Erro ao salvar configurações', 'error');
    }
  }

  async resetConfig() {
    if (!confirm('Tem certeza que deseja restaurar todas as configurações para os valores padrão?')) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'resetConfig'
      });
      
      if (response.success) {
        this.config = response.config;
        this.populateSettings();
        this.unsavedChanges = false;
        this.showNotification('Configurações restauradas para os padrões', 'info');
        this.updateSaveButton();
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Erro ao resetar configurações:', error);
      this.showNotification('Erro ao resetar configurações', 'error');
    }
  }

  async exportConfig() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'exportConfig'
      });
      
      if (response.success) {
        const dataStr = JSON.stringify(response.config, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `olist-helper-config-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showNotification('Configurações exportadas com sucesso!', 'success');
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Erro ao exportar configurações:', error);
      this.showNotification('Erro ao exportar configurações', 'error');
    }
  }

  async importConfig(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const importedConfig = JSON.parse(text);
      
      const response = await chrome.runtime.sendMessage({
        action: 'importConfig',
        config: importedConfig
      });
      
      if (response.success) {
        this.config = response.config;
        this.populateSettings();
        this.unsavedChanges = false;
        this.showNotification('Configurações importadas com sucesso!', 'success');
        this.updateSaveButton();
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Erro ao importar configurações:', error);
      this.showNotification('Erro ao importar configurações. Verifique se o arquivo é válido.', 'error');
    }
  }

  markUnsaved() {
    this.unsavedChanges = true;
    this.updateSaveButton();
  }

  updateSaveButton() {
    const saveBtn = document.getElementById('saveBtn');
    if (this.unsavedChanges) {
      saveBtn.textContent = '💾 Salvar Alterações *';
      saveBtn.style.background = '#28a745';
    } else {
      saveBtn.textContent = '💾 Salvar Configurações';
      saveBtn.style.background = '#667eea';
    }
  }

  showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) {
      existing.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    // Hide notification after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}

// Initialize settings manager when page loads
document.addEventListener('DOMContentLoaded', () => {
  new SettingsManager();
});

// Keyboard shortcuts for settings page
document.addEventListener('keydown', (e) => {
  // Ctrl+S to save
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    document.getElementById('saveBtn').click();
  }
  
  // Escape to close (if opened in popup)
  if (e.key === 'Escape') {
    window.close();
  }
  
  // Tab navigation with Ctrl+1-6
  if (e.ctrlKey && e.key >= '1' && e.key <= '6') {
    e.preventDefault();
    const tabs = ['interface', 'shortcuts', 'cache', 'search', 'accessibility', 'advanced'];
    const tabIndex = parseInt(e.key) - 1;
    if (tabs[tabIndex]) {
      document.querySelector(`[data-tab="${tabs[tabIndex]}"]`).click();
    }
  }
});