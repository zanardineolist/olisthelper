import Link from 'next/link';
import styles from '../styles/Navbar.module.css';
import { useState, useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { FaBell, FaCheckDouble, FaCheck } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import _ from 'lodash';
import { useNotifications } from '../contexts/NotificationContext';

export default function Navbar({ user, isSidebarCollapsed }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [topNotification, setTopNotification] = useState(null);
  const router = useRouter();
  const notificationRef = useRef(null);
  const navbarRef = useRef(null);
  
  // Usar contexto de notificações
  const { 
    notifications, 
    loading: isLoading, 
    unreadCount, 
    bellNotifications, 
    topNotifications, 
    markAsRead, 
    markMultipleAsRead 
  } = useNotifications();

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

  // Atualizar notificação do topo baseada no contexto
  useEffect(() => {
    if (topNotifications.length > 0) {
      setTopNotification(topNotifications[0]);
    } else {
      setTopNotification(null);
    }
  }, [topNotifications]);

  // Marcar notificação individual como lida (usa contexto)
  const handleMarkAsRead = async (notificationId) => {
    await markAsRead(notificationId);
    
    // Atualizar topNotification se necessário
    if (topNotification && topNotification.id === notificationId) {
      setTopNotification(null);
    }
  };

  const toggleNotifications = () => {
    setShowNotifications(prev => !prev);
  };

  // Marcar todas as notificações como lidas (usa contexto)
  const markAllAsRead = async () => {
    const unreadNotificationsIds = bellNotifications.map(notification => notification.id);
    
    if (unreadNotificationsIds.length > 0) {
      await markMultipleAsRead(unreadNotificationsIds);
    }
  };

  // Usar notificações do sino do contexto
  const sortedNotifications = [...bellNotifications].sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  );

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Desconhecido';
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: ptBR });
  };

  const handleCloseTopNotification = async () => {
    if (topNotification) {
      await markAsRead(topNotification.id);
      setTopNotification(null);
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
                {unreadCount > 0 && (
                  <span className={styles.notificationCount}>
                    {unreadCount}
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