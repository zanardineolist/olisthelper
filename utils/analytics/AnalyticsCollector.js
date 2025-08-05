/**
 * AnalyticsCollector - Sistema de coleta em batch para analytics
 * Reduz drasticamente o número de requests ao Supabase
 */

class AnalyticsCollector {
  constructor() {
    this.eventQueue = [];
    this.sessionData = null;
    this.isOnline = navigator.onLine;
    this.flushInterval = null;
    this.pageStartTime = null;
    this.currentPage = null;
    
    // Configurações
    this.config = {
      batchSize: 10,           // Máximo de eventos por batch
      flushInterval: 30000,    // Flush a cada 30 segundos
      maxQueueSize: 50,        // Máximo de eventos na queue
      retryAttempts: 3,        // Tentativas de retry
      retryDelay: 2000,        // Delay entre retries
    };

    this.initializeCollector();
  }

  initializeCollector() {
    // Inicializar session ID
    this.generateSessionId();
    
    // Listeners para eventos de rede
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushPendingEvents();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Listener para beforeunload (usuário saindo da página)
    window.addEventListener('beforeunload', () => {
      this.handlePageExit();
    });

    // Listener para visibilitychange (aba inativa/ativa)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handlePageHidden();
      } else {
        this.handlePageVisible();
      }
    });

    // Iniciar flush automático
    this.startAutoFlush();

    console.log('📊 AnalyticsCollector initialized', {
      sessionId: this.sessionData?.sessionId,
      config: this.config
    });
  }

  generateSessionId() {
    if (!this.sessionData) {
      this.sessionData = {
        sessionId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        startTime: Date.now(),
        lastActivity: Date.now(),
        pageViews: 0
      };
    }
  }

  // Método principal para rastrear visita de página
  trackPageVisit(pagePath, pageTitle = null, referrer = null) {
    // Finalizar página anterior se existir
    if (this.currentPage) {
      this.finalizeCurrentPage();
    }

    // Iniciar nova página
    this.currentPage = {
      path: pagePath,
      title: pageTitle || document.title,
      referrer: referrer || document.referrer,
      startTime: Date.now()
    };

    this.pageStartTime = Date.now();
    this.sessionData.pageViews++;
    this.sessionData.lastActivity = Date.now();

    // Adicionar evento à queue
    this.queueEvent({
      type: 'page_visit',
      page_path: pagePath,
      page_title: pageTitle || document.title,
      referrer: referrer || document.referrer,
      visit_duration: 0,
      timestamp: new Date().toISOString()
    });

    console.log('📄 Page visit tracked:', {
      path: pagePath,
      sessionId: this.sessionData.sessionId
    });
  }

  // Finalizar página atual com duração
  finalizeCurrentPage() {
    if (!this.currentPage || !this.pageStartTime) return;

    const duration = Math.floor((Date.now() - this.pageStartTime) / 1000);
    
    // Só registrar se permaneceu pelo menos 2 segundos
    if (duration >= 2) {
      this.queueEvent({
        type: 'page_duration_update',
        page_path: this.currentPage.path,
        page_title: this.currentPage.title,
        referrer: this.currentPage.referrer,
        visit_duration: duration,
        timestamp: new Date().toISOString()
      });
    }

    this.currentPage = null;
    this.pageStartTime = null;
  }

  // Adicionar evento à queue
  queueEvent(eventData) {
    const event = {
      ...eventData,
      session_id: this.sessionData.sessionId,
      user_agent: navigator.userAgent,
      timestamp: eventData.timestamp || new Date().toISOString(),
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
    };

    this.eventQueue.push(event);

    // Flush se atingiu tamanho máximo
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flushEvents();
    }

    // Limpar queue se muito grande (evitar memory leak)
    if (this.eventQueue.length > this.config.maxQueueSize) {
      console.warn('⚠️ Analytics queue overflow, dropping oldest events');
      this.eventQueue = this.eventQueue.slice(-this.config.maxQueueSize);
    }
  }

  // Enviar eventos em batch
  async flushEvents() {
    if (this.eventQueue.length === 0 || !this.isOnline) {
      return;
    }

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await this.sendEventsToServer(eventsToSend);
      console.log('✅ Analytics batch sent:', eventsToSend.length, 'events');
    } catch (error) {
      console.error('❌ Failed to send analytics batch:', error);
      
      // Re-adicionar eventos à queue para retry
      this.eventQueue.unshift(...eventsToSend.slice(0, 10)); // Máximo 10 para retry
    }
  }

  // Enviar eventos para o servidor
  async sendEventsToServer(events, retryCount = 0) {
    try {
      const response = await fetch('/api/analytics/track-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: events,
          session_data: this.sessionData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Atualizar dados da sessão se retornados
      if (result.session_data) {
        this.sessionData = { ...this.sessionData, ...result.session_data };
      }

      return result;
    } catch (error) {
      if (retryCount < this.config.retryAttempts) {
        console.log(`🔄 Retrying analytics batch (${retryCount + 1}/${this.config.retryAttempts})`);
        
        await this.delay(this.config.retryDelay * (retryCount + 1));
        return this.sendEventsToServer(events, retryCount + 1);
      }
      
      throw error;
    }
  }

  // Heartbeat da sessão
  sendHeartbeat() {
    if (!this.isOnline) return;

    this.sessionData.lastActivity = Date.now();
    
    fetch('/api/analytics/heartbeat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: this.sessionData.sessionId,
        last_activity: new Date().toISOString()
      })
    }).catch(error => {
      console.warn('⚠️ Heartbeat failed:', error.message);
    });
  }

  // Eventos de ciclo de vida
  handlePageExit() {
    this.finalizeCurrentPage();
    this.flushPendingEvents(true); // Flush síncrono
  }

  handlePageHidden() {
    this.finalizeCurrentPage();
    this.flushEvents();
  }

  handlePageVisible() {
    this.sessionData.lastActivity = Date.now();
  }

  // Flush para eventos pendentes (usa sendBeacon se disponível)
  flushPendingEvents(synchronous = false) {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    if (synchronous && navigator.sendBeacon) {
      // Usar sendBeacon para flush síncrono (mais confiável em page unload)
      const data = JSON.stringify({
        events: eventsToSend,
        session_data: this.sessionData
      });
      
      navigator.sendBeacon('/api/analytics/track-batch', data);
      console.log('📡 Sent analytics via beacon:', eventsToSend.length, 'events');
    } else {
      this.sendEventsToServer(eventsToSend).catch(error => {
        console.error('❌ Failed to flush pending events:', error);
      });
    }
  }

  // Auto flush
  startAutoFlush() {
    this.flushInterval = setInterval(() => {
      this.flushEvents();
      this.sendHeartbeat();
    }, this.config.flushInterval);
  }

  stopAutoFlush() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  // Utilitários
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Métodos para debugging/analytics internos
  getQueueStatus() {
    return {
      queueLength: this.eventQueue.length,
      sessionData: this.sessionData,
      isOnline: this.isOnline,
      currentPage: this.currentPage
    };
  }

  // Limpar dados (para logout/reset)
  reset() {
    this.stopAutoFlush();
    this.flushPendingEvents();
    this.eventQueue = [];
    this.sessionData = null;
    this.currentPage = null;
    this.pageStartTime = null;
  }
}

// Singleton instance
let analyticsCollector = null;

export const getAnalyticsCollector = () => {
  if (!analyticsCollector) {
    analyticsCollector = new AnalyticsCollector();
  }
  return analyticsCollector;
};

export const resetAnalyticsCollector = () => {
  if (analyticsCollector) {
    analyticsCollector.reset();
    analyticsCollector = null;
  }
};

export default AnalyticsCollector;