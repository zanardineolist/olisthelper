// Content script para detecção de macros e interface de busca

// Configurações
const CONFIG = {
  macroTrigger: '//',
  debounceDelay: 200,
  maxResults: 8,
  minSearchLength: 0,
  maxPreviewLength: 100,
  animationDuration: 200
};

// Estado global
let currentField = null;
let macroInterface = null;
let isInterfaceVisible = false;
let searchTimeout = null;
let lastSearchTerm = '';
let messagesCache = [];
let lastTriggerPosition = -1;
let isProcessingMacro = false;
let selectedIndex = 0;
let userConfig = null;

// Cache de elementos
const elementCache = new WeakMap();

// Criar interface de macro
function createMacroInterface() {
  if (macroInterface) return macroInterface;

  const container = document.createElement('div');
  container.id = 'olist-macro-interface';
  container.className = 'olist-macro-container';
  
  // Adicionar estilos CSS
  const style = document.createElement('style');
  style.textContent = `
    .olist-macro-container {
      position: absolute;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 10000;
    }
    .olist-macro-item:hover {
      background-color: #f0f8ff;
      border-color: #007bff;
    }
    .olist-macro-item.selected {
      background-color: #e3f2fd;
      border-color: #2196f3;
    }
    .cache-indicator {
      background-color: #e3f2fd;
      color: #1976d2;
      padding: 4px 8px;
      font-size: 11px;
      border-radius: 12px;
      margin-bottom: 8px;
      text-align: center;
      border: 1px solid #bbdefb;
    }
    
    /* Theme and accessibility styles */
    .olist-helper-dark-theme .macro-interface {
      background: #2d3748;
      border-color: #4a5568;
      color: #e2e8f0;
    }
    
    .olist-helper-dark-theme .macro-search {
      background: #4a5568;
      border-color: #718096;
      color: #e2e8f0;
    }
    
    .olist-helper-dark-theme .macro-results {
      background: #2d3748;
      border-color: #4a5568;
    }
    
    .olist-helper-dark-theme .macro-item {
      border-color: #4a5568;
      color: #e2e8f0;
    }
    
    .olist-helper-dark-theme .macro-item:hover,
    .olist-helper-dark-theme .macro-item.selected {
      background: #4a5568;
    }
    
    .olist-helper-dark-theme .cache-indicator {
      background-color: #2d3748;
      color: #63b3ed;
      border-color: #4a5568;
    }
    
    .olist-helper-high-contrast .macro-interface {
      border: 3px solid #000;
      background: #fff;
    }
    
    .olist-helper-high-contrast .macro-item {
      border: 2px solid #000;
      color: #000;
    }
    
    .olist-helper-high-contrast .macro-item:hover,
    .olist-helper-high-contrast .macro-item.selected {
      background: #000;
      color: #fff;
    }
    
    .olist-helper-large-text .macro-interface {
      font-size: 16px;
    }
    
    .olist-helper-large-text .macro-search {
      font-size: 16px;
      padding: 12px;
    }
    
    .olist-helper-large-text .macro-item {
      padding: 12px;
      font-size: 16px;
    }
    
    .olist-helper-reduce-motion * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  `;
  document.head.appendChild(style);
  
  container.innerHTML = `
    <div class="olist-macro-header">
      <span class="olist-macro-title">📝 Olist Helper - Macros</span>
      <button class="olist-macro-close" title="Fechar (Esc)">×</button>
    </div>
    <div class="olist-macro-search">
      <input type="text" placeholder="Buscar macros..." class="olist-macro-search-input">
    </div>
    <div class="olist-macro-results"></div>
    <div class="olist-macro-footer">
      <span class="olist-macro-help">Use ↑↓ para navegar, Enter para selecionar, Esc para fechar</span>
    </div>
  `;

  // Adicionar event listeners
  const closeBtn = container.querySelector('.olist-macro-close');
  const searchInput = container.querySelector('.olist-macro-search-input');
  const resultsContainer = container.querySelector('.olist-macro-results');

  closeBtn.addEventListener('click', hideMacroInterface);
  searchInput.addEventListener('input', handleSearch);
  searchInput.addEventListener('keydown', handleSearchKeydown);

  // Prevenir propagação de eventos
  container.addEventListener('mousedown', (e) => e.stopPropagation());
  container.addEventListener('keydown', (e) => e.stopPropagation());

  document.body.appendChild(container);
  macroInterface = container;
  
  return container;
}

// Posicionar interface próxima ao campo ativo
function positionInterface(field) {
  if (!macroInterface || !field) return;
  
  const fieldRect = field.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;
  
  // Dimensões da interface
  const interfaceWidth = Math.min(500, viewportWidth - 40);
  const maxInterfaceHeight = Math.min(400, viewportHeight - 100);
  
  // Posição inicial (abaixo do campo)
  let top = fieldRect.bottom + scrollY + 8;
  let left = fieldRect.left + scrollX;
  
  // Verificar se há espaço suficiente abaixo
  const spaceBelow = viewportHeight - fieldRect.bottom;
  const spaceAbove = fieldRect.top;
  
  if (spaceBelow < 200 && spaceAbove > spaceBelow) {
    // Posicionar acima do campo
    top = fieldRect.top + scrollY - maxInterfaceHeight - 8;
  }
  
  // Ajustar posição horizontal
  if (left + interfaceWidth > viewportWidth + scrollX) {
    left = viewportWidth + scrollX - interfaceWidth - 20;
  }
  
  // Garantir que não saia da tela
  left = Math.max(scrollX + 20, left);
  top = Math.max(scrollY + 20, top);
  
  // Aplicar estilos
  macroInterface.style.position = 'absolute';
  macroInterface.style.top = `${top}px`;
  macroInterface.style.left = `${left}px`;
  macroInterface.style.width = `${interfaceWidth}px`;
  macroInterface.style.maxHeight = `${maxInterfaceHeight}px`;
  macroInterface.style.zIndex = '10000';
}

// Atualizar posição da interface
function updateInterfacePosition() {
  if (isInterfaceVisible && currentField) {
    positionInterface(currentField);
  }
}

// Mostrar interface de macro
function showMacroInterface(field, searchTerm = '') {
  currentField = field;
  
  const container = createMacroInterface();
  const searchInput = container.querySelector('.olist-macro-search-input');
  
  positionInterface(field);
  
  // Animar entrada
  container.style.opacity = '0';
  container.style.transform = 'translateY(-10px)';
  container.style.display = 'block';
  
  requestAnimationFrame(() => {
    container.style.transition = `opacity ${CONFIG.animationDuration}ms ease, transform ${CONFIG.animationDuration}ms ease`;
    container.style.opacity = '1';
    container.style.transform = 'translateY(0)';
  });
  
  isInterfaceVisible = true;
  
  // Focar no campo de busca
  searchInput.value = searchTerm;
  if (!searchTerm) {
    setTimeout(() => searchInput.focus(), CONFIG.animationDuration);
  }
  
  // Carregar mensagens
  loadMessages(searchTerm);
}

// Esconder interface de macro
function hideMacroInterface() {
  if (!macroInterface) return;
  
  // Animar saída
  macroInterface.style.transition = `opacity ${CONFIG.animationDuration}ms ease, transform ${CONFIG.animationDuration}ms ease`;
  macroInterface.style.opacity = '0';
  macroInterface.style.transform = 'translateY(-10px)';
  
  setTimeout(() => {
    if (macroInterface && macroInterface.parentNode) {
      macroInterface.parentNode.removeChild(macroInterface);
    }
    macroInterface = null;
  }, CONFIG.animationDuration);
  
  isInterfaceVisible = false;
  selectedIndex = 0;
  lastTriggerPosition = -1;
  
  // Limpar timeouts
  clearTimeout(searchTimeout);
}

// Carregar mensagens do background script
async function loadMessages(searchTerm = '') {
  try {
    const maxResults = userConfig?.ui?.maxResults || 10;
    const response = await chrome.runtime.sendMessage({
      action: 'searchMessages',
      query: searchTerm,
      limit: maxResults,
      filters: {} // Filtros adicionais podem ser adicionados aqui
    });
    
    if (response.success) {
      messagesCache = response.messages;
      displayResults(response.messages, response.fromCache);
    } else {
      displayError(response.error || 'Erro ao carregar mensagens');
    }
  } catch (error) {
    console.error('Erro ao carregar mensagens:', error);
    displayError('Erro de conexão');
  }
}

// Exibir resultados na interface
function displayResults(messages, fromCache = false) {
  const resultsContainer = macroInterface?.querySelector('.olist-macro-results');
  if (!resultsContainer) return;
  
  if (messages.length === 0) {
    resultsContainer.innerHTML = `
      <div class="olist-macro-no-results">
        <span>Nenhuma macro encontrada</span>
      </div>
    `;
    return;
  }
  
  // Adicionar indicador de cache se necessário
  const cacheIndicator = fromCache ? 
    '<div class="cache-indicator">📋 Resultados do cache local</div>' : '';
  
  const html = messages.slice(0, CONFIG.maxResults).map((message, index) => `
    <div class="olist-macro-item" data-index="${index}" data-id="${message.id}">
      <div class="olist-macro-item-header">
        <span class="olist-macro-command">${message.command || 'Sem comando'}</span>
        <span class="olist-macro-title">${escapeHtml(message.title)}</span>
      </div>
      <div class="olist-macro-content">${escapeHtml(truncateText(message.content, 100))}</div>
      <div class="olist-macro-meta">
        <span class="olist-macro-author">por ${escapeHtml(message.authorName)}</span>
        <span class="olist-macro-copies">${message.copyCount} cópias</span>
      </div>
    </div>
  `).join('');
  
  resultsContainer.innerHTML = cacheIndicator + html;
  
  // Adicionar event listeners aos itens
  resultsContainer.querySelectorAll('.olist-macro-item').forEach(item => {
    item.addEventListener('click', () => selectMacro(parseInt(item.dataset.index)));
    item.addEventListener('mouseenter', () => highlightItem(parseInt(item.dataset.index)));
  });
  
  // Destacar primeiro item
  highlightItem(0);
}

// Exibir erro
function displayError(message) {
  const resultsContainer = macroInterface?.querySelector('.olist-macro-results');
  if (!resultsContainer) return;
  
  resultsContainer.innerHTML = `
    <div class="olist-macro-error">
      <span>❌ ${escapeHtml(message)}</span>
    </div>
  `;
}

// Destacar item selecionado
function highlightItem(index) {
  const items = macroInterface?.querySelectorAll('.olist-macro-item');
  if (!items) return;
  
  items.forEach((item, i) => {
    item.classList.toggle('olist-macro-selected', i === index);
  });
}

// Selecionar macro e inserir no campo
function selectMacro(index) {
  if (!currentField || !messagesCache[index]) return;
  
  const message = messagesCache[index];
  insertMacro(message);
}

// Inserir macro no campo
function insertMacro(message) {
  if (!currentField || !message) return;
  
  isProcessingMacro = true;
  
  try {
    const value = getFieldValue(currentField);
    const cursorPos = getCursorPosition(currentField);
    
    // Encontrar posição do trigger
    const triggerIndex = value.lastIndexOf(CONFIG.macroTrigger, cursorPos);
    
    if (triggerIndex !== -1) {
      const beforeTrigger = value.substring(0, triggerIndex);
      const afterCursor = value.substring(cursorPos);
      const newValue = beforeTrigger + message.content + afterCursor;
      
      // Inserir conteúdo baseado no tipo de campo
      if (isInputField(currentField)) {
        currentField.value = newValue;
        const newCursorPos = beforeTrigger.length + message.content.length;
        currentField.setSelectionRange(newCursorPos, newCursorPos);
      } else if (isContentEditable(currentField)) {
        insertIntoContentEditable(currentField, beforeTrigger, message.content, afterCursor);
      }
      
      // Disparar eventos
      currentField.dispatchEvent(new Event('input', { bubbles: true }));
      currentField.dispatchEvent(new Event('change', { bubbles: true }));
    }
  } catch (error) {
    console.error('Erro ao inserir macro:', error);
  } finally {
    hideMacroInterface();
    currentField.focus();
    
    setTimeout(() => {
      isProcessingMacro = false;
      lastTriggerPosition = -1;
    }, 100);
  }
}

// Obter valor do campo
function getFieldValue(field) {
  if (isInputField(field)) {
    return field.value || '';
  } else if (isContentEditable(field)) {
    return field.textContent || field.innerText || '';
  }
  return '';
}

// Obter posição do cursor
function getCursorPosition(field) {
  if (isInputField(field)) {
    return field.selectionStart || 0;
  } else if (isContentEditable(field)) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(field);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      return preCaretRange.toString().length;
    }
  }
  return 0;
}

// Verificar se é campo de input
function isInputField(element) {
  return element.tagName === 'INPUT' || element.tagName === 'TEXTAREA';
}

// Verificar se é contenteditable
function isContentEditable(element) {
  return element.contentEditable === 'true' || element.isContentEditable;
}

// Inserir em campo contenteditable
function insertIntoContentEditable(field, beforeText, insertText, afterText) {
  const newContent = beforeText + insertText + afterText;
  field.textContent = newContent;
  
  // Posicionar cursor
  const range = document.createRange();
  const sel = window.getSelection();
  const textNode = field.firstChild || field;
  
  if (textNode.nodeType === Node.TEXT_NODE) {
    const newCursorPos = beforeText.length + insertText.length;
    range.setStart(textNode, Math.min(newCursorPos, textNode.textContent.length));
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

// Inserir texto no campo (função legada - mantida para compatibilidade)
function insertTextInField(field, text) {
  const message = { content: text };
  insertMacro(message);
}

// Manipular busca
function handleSearch(e) {
  const searchTerm = e.target.value;
  
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    if (searchTerm !== lastSearchTerm) {
      lastSearchTerm = searchTerm;
      loadMessages(searchTerm);
    }
  }, CONFIG.debounceDelay);
}

// Manipular teclas na busca
function handleSearchKeydown(e) {
  const items = macroInterface?.querySelectorAll('.olist-macro-item');
  if (!items || items.length === 0) return;
  
  const currentSelected = macroInterface?.querySelector('.olist-macro-selected');
  let currentIndex = currentSelected ? parseInt(currentSelected.dataset.index) : -1;
  
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      currentIndex = Math.min(currentIndex + 1, items.length - 1);
      highlightItem(currentIndex);
      scrollToSelected(currentIndex);
      break;
      
    case 'ArrowUp':
      e.preventDefault();
      currentIndex = Math.max(currentIndex - 1, 0);
      highlightItem(currentIndex);
      scrollToSelected(currentIndex);
      break;
      
    case 'Enter':
      e.preventDefault();
      if (currentIndex >= 0) {
        selectMacro(currentIndex);
      }
      break;
      
    case 'Escape':
      e.preventDefault();
      hideMacroInterface();
      if (currentField) {
        currentField.focus();
      }
      break;
      
    case 'Tab':
      e.preventDefault();
      // Manter foco no campo de busca
      break;
  }
}

// Rolar para o item selecionado
function scrollToSelected(index) {
  if (!macroInterface) return;
  
  const selectedItem = macroInterface.querySelector(`.olist-macro-item[data-index="${index}"]`);
  const resultsList = macroInterface.querySelector('.olist-macro-results');
  
  if (selectedItem && resultsList) {
    const itemRect = selectedItem.getBoundingClientRect();
    const listRect = resultsList.getBoundingClientRect();
    
    if (itemRect.bottom > listRect.bottom) {
      selectedItem.scrollIntoView({ block: 'end', behavior: 'smooth' });
    } else if (itemRect.top < listRect.top) {
      selectedItem.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }
}

// Manipular input de texto
function handleTextInput(event) {
  const field = event.target;
  
  if (!isValidTextField(field) || isProcessingMacro) return;
  
  const value = field.value || field.textContent || '';
  const cursorPosition = field.selectionStart || 0;
  
  // Verificar se o trigger foi digitado
  const triggerResult = detectTrigger(value, cursorPosition);
  
  if (triggerResult.found) {
    currentField = field;
    lastTriggerPosition = triggerResult.position;
    
    // Debounce da busca
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      performSearch(triggerResult.searchTerm, field);
    }, CONFIG.debounceDelay);
  } else if (isInterfaceVisible) {
    // Verificar se ainda estamos no contexto da macro
    if (!isInMacroContext(value, cursorPosition)) {
      hideMacroInterface();
    }
  }
}

// Detectar trigger de macro
function detectTrigger(value, cursorPosition) {
  const triggerIndex = value.lastIndexOf(CONFIG.macroTrigger, cursorPosition);
  
  if (triggerIndex === -1) {
    return { found: false };
  }
  
  // Verificar se há espaço ou quebra de linha antes do trigger
  const charBefore = triggerIndex > 0 ? value[triggerIndex - 1] : ' ';
  if (charBefore !== ' ' && charBefore !== '\n' && charBefore !== '\t') {
    return { found: false };
  }
  
  // Extrair termo de busca
  const searchStart = triggerIndex + CONFIG.macroTrigger.length;
  const searchTerm = value.substring(searchStart, cursorPosition);
  
  // Verificar se o termo de busca é válido (sem espaços)
  if (searchTerm.includes(' ') || searchTerm.includes('\n')) {
    return { found: false };
  }
  
  return {
    found: true,
    position: triggerIndex,
    searchTerm: searchTerm.trim()
  };
}

// Verificar se ainda estamos no contexto da macro
function isInMacroContext(value, cursorPosition) {
  if (lastTriggerPosition === -1) return false;
  
  const triggerEnd = lastTriggerPosition + CONFIG.macroTrigger.length;
  const textAfterTrigger = value.substring(triggerEnd, cursorPosition);
  
  // Se há espaço ou quebra de linha, saímos do contexto
  return !textAfterTrigger.includes(' ') && !textAfterTrigger.includes('\n');
}

// Realizar busca de macros
function performSearch(searchTerm, field) {
  const searchDelay = userConfig?.search?.searchDelay || 300;
  const minQueryLength = userConfig?.search?.minQueryLength || 2;
  
  if (searchTerm.length < minQueryLength) {
    hideMacroInterface();
    return;
  }
  
  if (!messagesCache.length) {
    loadMessages(searchTerm);
    return;
  }
  
  // Filtrar mensagens
  const filteredMessages = filterMessages(searchTerm);
  selectedIndex = 0;
  
  if (filteredMessages.length > 0) {
    messagesCache = filteredMessages;
    showMacroInterface(field, searchTerm);
  } else {
    hideMacroInterface();
  }
}

// Filtrar mensagens por termo de busca
function filterMessages(searchTerm) {
  if (!searchTerm) {
    return messagesCache.slice(0, CONFIG.maxResults);
  }
  
  const term = searchTerm.toLowerCase();
  const results = [];
  
  // Busca por comando exato primeiro
  const exactCommandMatch = messagesCache.filter(msg => 
    msg.command && msg.command.toLowerCase() === `/${term}`
  );
  results.push(...exactCommandMatch);
  
  // Busca por comando que começa com o termo
  const commandStartMatch = messagesCache.filter(msg => 
    msg.command && 
    msg.command.toLowerCase().startsWith(`/${term}`) &&
    !exactCommandMatch.includes(msg)
  );
  results.push(...commandStartMatch);
  
  // Busca fuzzy no título e conteúdo
  const fuzzyMatches = messagesCache.filter(msg => {
    if (exactCommandMatch.includes(msg) || commandStartMatch.includes(msg)) {
      return false;
    }
    const searchText = `${msg.title} ${msg.content}`.toLowerCase();
    return searchText.includes(term);
  });
  
  results.push(...fuzzyMatches);
  
  return results.slice(0, CONFIG.maxResults);
}

// Verificar se é um campo de texto válido
function isValidTextField(element) {
  if (!element) return false;
  
  const tagName = element.tagName.toLowerCase();
  const type = element.type?.toLowerCase();
  
  // Campos de input de texto
  if (tagName === 'input' && ['text', 'email', 'search', 'url', 'tel'].includes(type)) {
    return true;
  }
  
  // Textarea
  if (tagName === 'textarea') {
    return true;
  }
  
  // Elementos contentEditable
  if (element.contentEditable === 'true') {
    return true;
  }
  
  return false;
}

// Utilitários
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Manipular teclas globais
function handleGlobalKeydown(event) {
  if (!isInterfaceVisible) return;
  
  // Se a interface está visível, interceptar algumas teclas
  if (event.key === 'Escape') {
    event.preventDefault();
    hideMacroInterface();
    if (currentField) {
      currentField.focus();
    }
  }
}

// Manipular cliques globais
function handleGlobalClick(event) {
  if (!isInterfaceVisible || !macroInterface) return;
  
  // Fechar interface se clicar fora dela
  if (!macroInterface.contains(event.target) && event.target !== currentField) {
    hideMacroInterface();
  }
}

// Manipular mudanças de foco
function handleFocusChange(event) {
  if (event.type === 'focusout' && isInterfaceVisible) {
    // Pequeno delay para permitir cliques na interface
    setTimeout(() => {
      if (isInterfaceVisible && document.activeElement !== currentField && 
          (!macroInterface || !macroInterface.contains(document.activeElement))) {
        hideMacroInterface();
      }
    }, 100);
  }
}

// Manipular mudanças no DOM
function handleDOMChanges(mutations) {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // Verificar novos campos de texto
        const textFields = node.querySelectorAll('input[type="text"], input[type="search"], textarea, [contenteditable="true"]');
        textFields.forEach(field => {
          if (!elementCache.has(field)) {
            elementCache.set(field, true);
            // Adicionar listeners específicos se necessário
          }
        });
      }
    });
  });
}

// Verificar se é campo de texto válido
function isTextInput(element) {
  if (!element || !element.tagName) return false;
  
  const tagName = element.tagName.toLowerCase();
  
  // Campos de input
  if (tagName === 'input') {
    const type = element.type.toLowerCase();
    return ['text', 'search', 'url', 'email', 'password'].includes(type);
  }
  
  // Textarea
  if (tagName === 'textarea') {
    return true;
  }
  
  // Contenteditable
  if (element.contentEditable === 'true' || element.isContentEditable) {
    return true;
  }
  
  return false;
}

// Atualizar seleção visual
function updateSelection() {
  if (!macroInterface) return;
  
  const items = macroInterface.querySelectorAll('.macro-item');
  items.forEach((item, index) => {
    if (index === selectedIndex) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
}

// Load user configuration
async function loadUserConfig() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getConfig' });
    if (response.success) {
      userConfig = response.config;
      applyUserConfig();
    }
  } catch (error) {
    console.error('Error loading user config:', error);
  }
}

// Apply user configuration to the interface
function applyUserConfig() {
  if (!userConfig) return;
  
  // Apply theme
  if (userConfig.ui.theme === 'dark') {
    document.documentElement.classList.add('olist-helper-dark-theme');
  } else if (userConfig.ui.theme === 'light') {
    document.documentElement.classList.remove('olist-helper-dark-theme');
  }
  
  // Apply accessibility settings
  if (userConfig.accessibility.highContrast) {
    document.documentElement.classList.add('olist-helper-high-contrast');
  }
  
  if (userConfig.accessibility.largeText) {
    document.documentElement.classList.add('olist-helper-large-text');
  }
  
  if (userConfig.accessibility.reduceMotion) {
    document.documentElement.classList.add('olist-helper-reduce-motion');
  }
}

// Inicializar content script
function initializeContentScript() {
  // Load user configuration first
  loadUserConfig();
  
  // Event listeners globais
  document.addEventListener('input', handleTextInput);
  document.addEventListener('mousedown', handleGlobalClick);
  document.addEventListener('keydown', handleGlobalKeydown);
  document.addEventListener('focusout', handleFocusChange);
  
  // Reposicionar interface ao redimensionar janela
  window.addEventListener('resize', updateInterfacePosition);
  
  // Observer para mudanças no DOM
  const observer = new MutationObserver(handleDOMChanges);
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Carregar configurações do storage
  chrome.storage.sync.get(['macroTrigger'], (result) => {
    if (result.macroTrigger) {
      CONFIG.macroTrigger = result.macroTrigger;
    }
  });
  
  // Listener para mudanças nas configurações
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.macroTrigger) {
      CONFIG.macroTrigger = changes.macroTrigger.newValue;
    }
  });
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  initializeContentScript();
}

console.log('Olist Helper Macro Extension carregada!');