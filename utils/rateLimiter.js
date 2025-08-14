// utils/rateLimiter.js
// Sistema simples de rate limiting para proteção básica

class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.maxRequests = 100; // Máximo de requisições por IP
    this.windowMs = 15 * 60 * 1000; // 15 minutos
  }

  // Verificar se IP está dentro do limite
  isAllowed(ip) {
    const now = Date.now();
    const userRequests = this.requests.get(ip) || [];
    
    // Remover requisições antigas (fora da janela de tempo)
    const validRequests = userRequests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Adicionar nova requisição
    validRequests.push(now);
    this.requests.set(ip, validRequests);
    
    return true;
  }

  // Limpar dados antigos (executar periodicamente)
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
const rateLimiter = new RateLimiter();

// Limpeza automática a cada 15 minutos
setInterval(() => rateLimiter.cleanup(), 15 * 60 * 1000);

module.exports = rateLimiter;
