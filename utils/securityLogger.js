// utils/securityLogger.js
// Sistema de logging de segurança

class SecurityLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // Manter apenas os últimos 1000 logs
  }

  // Log de tentativa de login
  logLoginAttempt(email, success, ip, userAgent) {
    const log = {
      timestamp: new Date().toISOString(),
      type: 'LOGIN_ATTEMPT',
      email,
      success,
      ip,
      userAgent,
      severity: success ? 'INFO' : 'WARNING'
    };
    
    this.addLog(log);
    
    // Log no console para desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SECURITY] ${log.type}: ${email} - ${success ? 'SUCCESS' : 'FAILED'} - IP: ${ip}`);
    }
  }

  // Log de tentativa de acesso a rota protegida
  logRouteAccess(route, userId, ip, success) {
    const log = {
      timestamp: new Date().toISOString(),
      type: 'ROUTE_ACCESS',
      route,
      userId,
      ip,
      success,
      severity: success ? 'INFO' : 'WARNING'
    };
    
    this.addLog(log);
  }

  // Log de rate limiting
  logRateLimit(ip, route) {
    const log = {
      timestamp: new Date().toISOString(),
      type: 'RATE_LIMIT',
      ip,
      route,
      severity: 'WARNING'
    };
    
    this.addLog(log);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SECURITY] ${log.type}: IP ${ip} limitado na rota ${route}`);
    }
  }

  // Log de erro de autenticação
  logAuthError(error, context) {
    const log = {
      timestamp: new Date().toISOString(),
      type: 'AUTH_ERROR',
      error: error.message || error,
      context,
      severity: 'ERROR'
    };
    
    this.addLog(log);
    
    if (process.env.NODE_ENV === 'development') {
      console.error(`[SECURITY] ${log.type}:`, error, context);
    }
  }

  // Adicionar log e manter limite
  addLog(log) {
    this.logs.push(log);
    
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  // Obter logs por tipo
  getLogsByType(type) {
    return this.logs.filter(log => log.type === type);
  }

  // Obter logs por severidade
  getLogsBySeverity(severity) {
    return this.logs.filter(log => log.severity === severity);
  }

  // Obter logs recentes
  getRecentLogs(minutes = 60) {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.logs.filter(log => new Date(log.timestamp) > cutoff);
  }

  // Limpar logs antigos
  cleanupOldLogs(hours = 24) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    this.logs = this.logs.filter(log => new Date(log.timestamp) > cutoff);
  }
}

// Instância global
const securityLogger = new SecurityLogger();

// Limpeza automática a cada hora
setInterval(() => securityLogger.cleanupOldLogs(), 60 * 60 * 1000);

module.exports = securityLogger;
