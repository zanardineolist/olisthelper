import Link from 'next/link';
import styles from '../styles/Navbar.module.css';
import { useState, useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { FaBell, FaCheckDouble, FaCheck } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import _ from 'lodash';

export default function Navbar({ user, isSidebarCollapsed }) {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [topNotification, setTopNotification] = useState(null);
  const router = useRouter();
  const notificationRef = useRef(null);
  const navbarRef = useRef(null);

  // Handle click outside
  useEffect(() => {
    const handleClickOutsideDebounced = _.debounce((event) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }, 200);

    document.addEventListener('click', handleClickOutsideDebounced);
    return () => {
      document.removeEventListener('click', handleClickOutsideDebounced);
      handleClickOutsideDebounced.cancel();
    };
  }, []);

  // Buscar notificações do Supabase
  const fetchNotifications = async (type = 'bell') => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/notifications?notificationType=${type}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        
        if (type === 'bell') {
          setNotifications(data.notifications || []);
        } else if (type === 'top') {
          const unreadTopNotification = data.notifications?.find(n => !n.read);
          setTopNotification(unreadTopNotification || null);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar notificações quando componente montar
  useEffect(() => {
    if (user?.id) {
      fetchNotifications('bell');  // Notificações do sino
      fetchNotifications('top');   // Notificações do topo
    }
  }, [user?.id]);

  // Marcar notificação individual como lida
  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      });

      if (response.ok) {
        // Atualizar estado local
        setNotifications(prevNotifications =>
          prevNotifications.map(notification =>
            notification.id === notificationId 
              ? { ...notification, read: true, read_at: new Date().toISOString() }
              : notification
          )
        );
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const toggleNotifications = () => {
    setShowNotifications(prev => !prev);
  };

  // Marcar todas as notificações como lidas
  const markAllAsRead = async () => {
    const unreadNotificationsIds = notifications
      .filter(notification => !notification.read)
      .map(notification => notification.id);

    if (unreadNotificationsIds.length > 0) {
      try {
        const response = await fetch('/api/notifications/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationIds: unreadNotificationsIds })
        });

        if (response.ok) {
          // Atualizar estado local
          setNotifications(prevNotifications =>
            prevNotifications.map(notification => ({ 
              ...notification, 
              read: true, 
              read_at: new Date().toISOString() 
            }))
          );
        }
      } catch (error) {
        console.error('Erro ao marcar notificações como lidas:', error);
      }
    }
  };

  const unreadNotificationsCount = notifications.filter(notification => !notification.read).length;
  const sortedNotifications = [...notifications].sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  );

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Desconhecido';
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: ptBR });
  };

  const handleCloseTopNotification = async () => {
    if (topNotification) {
      try {
        const response = await fetch('/api/notifications/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationId: topNotification.id })
        });

        if (response.ok) {
          setTopNotification(null);
        }
      } catch (error) {
        console.error('Erro ao marcar notificação do topo como lida:', error);
      }
    }
  };

  const getPageTitle = () => {
    switch(router.pathname) {
      case '/profile':
        return 'Meu Perfil';
      case '/profile-analyst':
        return 'Perfil do Analista';
      case '/dashboard-analyst':
        return 'Dashboard Analista';
      case '/dashboard-super':
        return 'Dashboard Super';
      case '/dashboard-quality':
        return 'Dashboard Qualidade';
      case '/tools':
        return 'Ferramentas';
      case '/registro':
        return 'Registrar Ajuda';
      case '/manager':
        return 'Gerenciador';
      case '/remote':
        return 'Acesso Remoto';
      case '/admin-notifications':
        return 'Administrar Notificações';
      case '/analytics':
        return 'Analytics & Métricas';
      case '/':
        return 'OlistHelper';
      default:
        return 'OlistHelper';
    }
  };

  return (
    <div className={`${styles.navbarWrapper} ${topNotification ? styles.withBanner : ''}`}>
      {topNotification && (
        <div className={`${styles.notificationBanner} ${
          topNotification.notification_style === 'informacao' 
            ? styles.informacaoBanner 
            : styles.avisoBanner
        }`}>
          <p>{topNotification.message}</p>
          <button onClick={handleCloseTopNotification} className={styles.closeButton}>✕</button>
        </div>
      )}

      <nav 
        ref={navbarRef} 
        className={`${styles.navbar} ${isSidebarCollapsed ? styles.sidebarCollapsed : styles.sidebarExpanded}`}
      >
        {/* Page Title */}
        <div className={styles.pageTitle}>
          <h1 className={styles.title}>{getPageTitle()}</h1>
        </div>

        <div className={styles.rightSection}>
          {/* Notifications */}
          {['analyst', 'tax', 'super', 'dev', 'quality', 'support'].includes(user.role) && (
            <div className={styles.notificationsWrapper}>
              <button className={styles.notificationToggle} onClick={toggleNotifications}>
                <FaBell />
                {unreadNotificationsCount > 0 && (
                  <span className={styles.notificationCount}>
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div ref={notificationRef} className={styles.notificationsBox}>
                  {sortedNotifications.length === 0 ? (
                    <p className={styles.noNotifications}>Nenhuma notificação disponível</p>
                  ) : (
                    <>
                      <ul className={styles.notificationsList}>
                        {sortedNotifications.map((notification) => (
                          <li
                            key={notification.id}
                            className={`${styles.notificationItem} ${notification.read ? styles.read : ''}`}
                          >
                            <div className={styles.notificationContent}>
                              <strong>{notification.title}</strong>
                              <p>{notification.message}</p>
                              <span className={styles.timestamp}>
                                {getTimeAgo(notification.created_at)}
                              </span>
                            </div>
                            <div className={styles.markAsReadIndicator}>
                              {notification.read ? (
                                <FaCheckDouble className={styles.checkIconDouble} title="Lido" />
                              ) : (
                                <div 
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  className={styles.markAsReadWrapper}
                                >
                                  <span className={styles.markAsReadText}>Marcar como lido</span>
                                  <FaCheck className={styles.checkIcon} />
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                      <button onClick={markAllAsRead} className={styles.markAllReadButton}>
                        Marcar todas como lidas
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}