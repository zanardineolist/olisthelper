// contexts/NotificationContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications deve ser usado dentro de NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState(Date.now());

  // Função para buscar notificações
  const fetchNotifications = async (silent = false) => {
    if (!session?.id) return;
    
    if (!silent) setLoading(true);
    
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setLastFetch(Date.now());
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Função para marcar notificação como lida
  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });

      if (response.ok) {
        // Atualizar estado local imediatamente
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, read: true, read_at: new Date().toISOString() }
              : notif
          )
        );
        
        // Opcional: Buscar novamente para garantir sincronização
        setTimeout(() => fetchNotifications(true), 1000);
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  // Função para marcar múltiplas notificações como lidas
  const markMultipleAsRead = async (notificationIds) => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds }),
      });

      if (response.ok) {
        // Atualizar estado local imediatamente
        setNotifications(prev => 
          prev.map(notif => 
            notificationIds.includes(notif.id)
              ? { ...notif, read: true, read_at: new Date().toISOString() }
              : notif
          )
        );
        
        // Opcional: Buscar novamente para garantir sincronização
        setTimeout(() => fetchNotifications(true), 1000);
      }
    } catch (error) {
      console.error('Erro ao marcar notificações como lidas:', error);
    }
  };

  // Função para refrescar notificações
  const refreshNotifications = () => {
    fetchNotifications(true);
  };

  // Buscar notificações quando session estiver disponível
  useEffect(() => {
    if (session?.id) {
      fetchNotifications();
    }
  }, [session?.id]);

  // Polling para atualizações em tempo real a cada 30 segundos
  useEffect(() => {
    if (!session?.id) return;

    const interval = setInterval(() => {
      // Só fazer polling se a aba estiver ativa
      if (!document.hidden) {
        fetchNotifications(true);
      }
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [session?.id]);

  // Escutar visibilidade da aba para atualizar quando voltar
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && session?.id) {
        // Se a aba ficou ativa e já passou mais de 1 minuto desde a última busca
        const timeSinceLastFetch = Date.now() - lastFetch;
        if (timeSinceLastFetch > 60000) { // 1 minuto
          fetchNotifications(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session?.id, lastFetch]);

  // Escutar eventos de foco da janela
  useEffect(() => {
    const handleFocus = () => {
      if (session?.id) {
        const timeSinceLastFetch = Date.now() - lastFetch;
        if (timeSinceLastFetch > 30000) { // 30 segundos
          fetchNotifications(true);
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [session?.id, lastFetch]);

  const value = {
    notifications,
    loading,
    fetchNotifications,
    markAsRead,
    markMultipleAsRead,
    refreshNotifications,
    // Getters úteis
    unreadCount: notifications.filter(n => !n.read).length,
    bellNotifications: notifications.filter(n => 
      (n.notification_type === 'bell' || n.notification_type === 'both') && !n.read
    ),
    topNotifications: notifications.filter(n => 
      (n.notification_type === 'top' || n.notification_type === 'both') && !n.read
    ),
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};