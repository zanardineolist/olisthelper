// Utilitário para validação de segurança de arquivos

// Tipos de arquivo permitidos por categoria
const ALLOWED_FILE_TYPES = {
  images: {
    mimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    maxSize: 10 * 1024 * 1024 // 10MB
  },
  spreadsheets: {
    mimeTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ],
    extensions: ['.xls', '.xlsx', '.csv'],
    maxSize: 50 * 1024 * 1024 // 50MB
  },
  documents: {
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ],
    extensions: ['.pdf', '.doc', '.docx', '.txt'],
    maxSize: 25 * 1024 * 1024 // 25MB
  }
};

// Assinaturas de arquivo (magic numbers) para validação adicional
const FILE_SIGNATURES = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/gif': [0x47, 0x49, 0x46],
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [0x50, 0x4B, 0x03, 0x04],
  'application/vnd.ms-excel': [0xD0, 0xCF, 0x11, 0xE0]
};

// Nomes de arquivo perigosos
const DANGEROUS_FILENAMES = [
  'con', 'prn', 'aux', 'nul',
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'
];

/**
 * Valida se um arquivo é seguro para upload
 * @param {Object} file - Objeto do arquivo
 * @param {string} category - Categoria do arquivo (images, spreadsheets, documents)
 * @param {Buffer} fileBuffer - Buffer do arquivo para validação de assinatura
 * @returns {Object} - Resultado da validação
 */
export function validateFile(file, category, fileBuffer = null) {
  const result = {
    isValid: false,
    errors: []
  };

  // Verificar se a categoria é válida
  if (!ALLOWED_FILE_TYPES[category]) {
    result.errors.push('Categoria de arquivo inválida');
    return result;
  }

  const allowedTypes = ALLOWED_FILE_TYPES[category];

  // Validar nome do arquivo
  if (!file.originalFilename || typeof file.originalFilename !== 'string') {
    result.errors.push('Nome do arquivo é obrigatório');
    return result;
  }

  // Sanitizar nome do arquivo
  const sanitizedName = sanitizeFilename(file.originalFilename);
  if (!sanitizedName) {
    result.errors.push('Nome do arquivo inválido');
    return result;
  }

  // Verificar extensão
  const extension = getFileExtension(sanitizedName).toLowerCase();
  if (!allowedTypes.extensions.includes(extension)) {
    result.errors.push(`Extensão de arquivo não permitida. Permitidas: ${allowedTypes.extensions.join(', ')}`);
  }

  // Verificar tipo MIME
  if (!file.mimetype || !allowedTypes.mimeTypes.includes(file.mimetype)) {
    result.errors.push(`Tipo de arquivo não permitido. Permitidos: ${allowedTypes.mimeTypes.join(', ')}`);
  }

  // Verificar tamanho
  if (!file.size || file.size > allowedTypes.maxSize) {
    const maxSizeMB = Math.round(allowedTypes.maxSize / (1024 * 1024));
    result.errors.push(`Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`);
  }

  // Verificar tamanho mínimo (evitar arquivos vazios)
  if (file.size < 1) {
    result.errors.push('Arquivo não pode estar vazio');
  }

  // Validar assinatura do arquivo se o buffer foi fornecido
  if (fileBuffer && fileBuffer.length > 0) {
    if (!validateFileSignature(file.mimetype, fileBuffer)) {
      result.errors.push('Assinatura do arquivo não corresponde ao tipo declarado');
    }
  }

  result.isValid = result.errors.length === 0;
  return result;
}

/**
 * Sanitiza o nome do arquivo removendo caracteres perigosos
 * @param {string} filename - Nome do arquivo
 * @returns {string} - Nome sanitizado
 */
export function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return null;
  }

  // Remover caracteres perigosos
  let sanitized = filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // Caracteres perigosos
    .replace(/\.\.+/g, '.') // Múltiplos pontos
    .replace(/^\.|\.$/, '') // Pontos no início ou fim
    .trim();

  // Verificar se é um nome perigoso do Windows
  const nameWithoutExt = sanitized.split('.')[0].toLowerCase();
  if (DANGEROUS_FILENAMES.includes(nameWithoutExt)) {
    return null;
  }

  // Verificar comprimento
  if (sanitized.length === 0 || sanitized.length > 255) {
    return null;
  }

  return sanitized;
}

/**
 * Extrai a extensão do arquivo
 * @param {string} filename - Nome do arquivo
 * @returns {string} - Extensão do arquivo
 */
export function getFileExtension(filename) {
  if (!filename || typeof filename !== 'string') {
    return '';
  }
  
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
    return '';
  }
  
  return filename.substring(lastDotIndex);
}

/**
 * Valida a assinatura do arquivo
 * @param {string} mimeType - Tipo MIME do arquivo
 * @param {Buffer} fileBuffer - Buffer do arquivo
 * @returns {boolean} - Se a assinatura é válida
 */
export function validateFileSignature(mimeType, fileBuffer) {
  const signature = FILE_SIGNATURES[mimeType];
  if (!signature) {
    return true; // Se não temos assinatura para validar, assumimos que é válido
  }

  if (fileBuffer.length < signature.length) {
    return false;
  }

  for (let i = 0; i < signature.length; i++) {
    if (fileBuffer[i] !== signature[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Gera um nome de arquivo seguro e único
 * @param {string} originalName - Nome original do arquivo
 * @returns {string} - Nome seguro e único
 */
export function generateSafeFilename(originalName) {
  const sanitized = sanitizeFilename(originalName);
  if (!sanitized) {
    return `file_${Date.now()}.tmp`;
  }

  const extension = getFileExtension(sanitized);
  const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);

  return `${nameWithoutExt}_${timestamp}_${random}${extension}`;
}

export { ALLOWED_FILE_TYPES };