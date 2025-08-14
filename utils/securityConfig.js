// utils/securityConfig.js
// Configurações centralizadas de segurança

export const SECURITY_CONFIG = {
  // Rate Limiting
  RATE_LIMIT: {
    MAX_REQUESTS: 100,        // Máximo de requisições por IP
    WINDOW_MS: 15 * 60 * 1000, // 15 minutos
    CLEANUP_INTERVAL: 15 * 60 * 1000 // Limpeza a cada 15 minutos
  },

  // Domínios de email permitidos
  ALLOWED_EMAIL_DOMAINS: ['olist.com', 'tiny.com.br'],

  // Headers de segurança
  SECURITY_HEADERS: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-XSS-Protection': '1; mode=block',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  },

  // Configurações de sessão
  SESSION: {
    MAX_AGE: 24 * 60 * 60, // 24 horas
    UPDATE_AGE: 60 * 60,   // Atualizar a cada hora
    JWT_SECRET_MIN_LENGTH: 32
  },

  // Logs de segurança
  LOGGING: {
    MAX_LOGS: 1000,
    CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hora
    LOG_LEVELS: ['INFO', 'WARNING', 'ERROR']
  },

  // Validações
  VALIDATION: {
    MIN_PASSWORD_LENGTH: 8,
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000 // 15 minutos
  },

  // Rotas protegidas
  PROTECTED_ROUTES: [
    '/profile',
    '/dashboard-analyst',
    '/dashboard-super',
    '/dashboard-quality',
    '/profile-analyst',
    '/manager',
    '/admin-notifications',
    '/remote',
    '/tools'
  ],

  // Rotas que requerem permissões específicas
  PERMISSION_ROUTES: {
    '/registrar-ajuda': 'can_register_help',
    '/remote': 'can_remote_access',
    '/admin-notifications': 'admin'
  }
};

// Funções de validação
export const SecurityValidators = {
  // Validar domínio de email
  isValidEmailDomain: (email) => {
    if (!email || !email.includes('@')) return false;
    const domain = email.split('@')[1];
    return SECURITY_CONFIG.ALLOWED_EMAIL_DOMAINS.includes(domain);
  },

  // Validar força de senha (se implementar autenticação local)
  isStrongPassword: (password) => {
    if (!password || password.length < SECURITY_CONFIG.VALIDATION.MIN_PASSWORD_LENGTH) {
      return false;
    }
    // Adicionar mais validações conforme necessário
    return true;
  },

  // Validar formato de IP
  isValidIP: (ip) => {
    if (!ip || ip === 'unknown') return false;
    // Validação básica de IP
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }
};

// Funções de sanitização
export const SecuritySanitizers = {
  // Sanitizar entrada de usuário
  sanitizeInput: (input) => {
    if (typeof input !== 'string') return input;
    return input
      .replace(/[<>]/g, '') // Remover tags HTML básicas
      .trim();
  },

  // Sanitizar email
  sanitizeEmail: (email) => {
    if (!email) return '';
    return email.toLowerCase().trim();
  }
};
