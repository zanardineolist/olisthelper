// utils/securityMonitor.js
// Sistema de monitoramento de segurança simples

class SecurityMonitor {
  constructor() {
    this.events = [];
    this.maxEvents = 100;
  }

  // Registrar evento de segurança
  logEvent(type, details) {
    const event = {
      timestamp: new Date().toISOString(),
      type,
      details,
      severity: this.getSeverity(type)
    };

    this.events.push(event);
    
    // Manter apenas os últimos eventos
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log no console para desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SECURITY_MONITOR] ${type}:`, details);
    }

    return event;
  }

  // Determinar severidade do evento
  getSeverity(type) {
    const severityMap = {
      'LOGIN_SUCCESS': 'INFO',
      'LOGIN_FAILED': 'WARNING',
      'RATE_LIMIT': 'WARNING',
      'UNAUTHORIZED_ACCESS': 'WARNING',
      'PERMISSION_DENIED': 'WARNING',
      'ERROR': 'ERROR'
    };
    
    return severityMap[type] || 'INFO';
  }

  // Obter eventos por tipo
  getEventsByType(type) {
    return this.events.filter(event => event.type === type);
  }

  // Obter eventos por severidade
  getEventsBySeverity(severity) {
    return this.events.filter(event => event.event.severity === severity);
  }

  // Obter eventos recentes
  getRecentEvents(minutes = 60) {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.events.filter(event => new Date(event.timestamp) > cutoff);
  }

  // Limpar eventos antigos
  cleanupOldEvents(hours = 24) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    this.events = this.events.filter(event => new Date(event.timestamp) > cutoff);
  }

  // Estatísticas básicas
  getStats() {
    const now = new Date();
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const eventsLastHour = this.events.filter(e => new Date(e.timestamp) > lastHour);
    const eventsLast24Hours = this.events.filter(e => new Date(e.timestamp) > last24Hours);

    return {
      totalEvents: this.events.length,
      eventsLastHour: eventsLastHour.length,
      eventsLast24Hours: eventsLast24Hours.length,
      eventsByType: this.events.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      }, {}),
      eventsBySeverity: this.events.reduce((acc, event) => {
        acc[event.severity] = (acc[event.severity] || 0) + 1;
        return acc;
      }, {})
    };
  }
}

// Instância global
const securityMonitor = new SecurityMonitor();

// Limpeza automática a cada hora
if (typeof setInterval !== 'undefined') {
  setInterval(() => securityMonitor.cleanupOldEvents(), 60 * 60 * 1000);
}

module.exports = securityMonitor;
