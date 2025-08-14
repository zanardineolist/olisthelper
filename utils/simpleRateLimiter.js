// utils/simpleRateLimiter.js
// Rate limiter simplificado e compatível

class SimpleRateLimiter {
  constructor() {
    this.requests = new Map();
    this.maxRequests = 100;
    this.windowMs = 15 * 60 * 1000; // 15 minutos
  }

  isAllowed(ip) {
    const now = Date.now();
    const userRequests = this.requests.get(ip) || [];
    
    // Filtrar requisições antigas
    const validRequests = userRequests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Adicionar nova requisição
    validRequests.push(now);
    this.requests.set(ip, validRequests);
    
    return true;
  }

  // Limpeza automática
  cleanup() {
    const now = Date.now();
    for (const [ip, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(ip);
      } else {
        this.requests.set(ip, validRequests);
      }
    }
  }
}

// Instância global
const rateLimiter = new SimpleRateLimiter();

// Limpeza a cada 15 minutos
if (typeof setInterval !== 'undefined') {
  setInterval(() => rateLimiter.cleanup(), 15 * 60 * 1000);
}

module.exports = rateLimiter;
