import Link from 'next/link';
import styles from '../styles/Navbar.module.css';
import { useState, useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { FaBell, FaCheckDouble, FaCheck } from 'react-icons/fa';
import { markNotificationAsRead, markMultipleNotificationsAsRead } from '../utils/firebase/firebaseNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db } from '../utils/firebase/firebaseConfig';
import { collection, query, where, onSnapshot, limit, startAfter } from 'firebase/firestore';
import _ from 'lodash';

export default function Navbar({ user, isSidebarCollapsed }) {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
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

  // Notifications
  useEffect(() => {
    if (!user?.id) return;

    const notificationsCollection = collection(db, "notifications");
    const q = query(notificationsCollection, where("userId", "==", user.id));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const updatedNotifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setNotifications(updatedNotifications.filter(notification => notification.notificationType === 'bell'));
      const topNotif = updatedNotifications.find(notification => 
        notification.notificationType === 'top' && !notification.read
      );
      setTopNotification(topNotif);
      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
    });

    return () => unsubscribe();
  }, [user?.id]);

  const loadMoreNotifications = async () => {
    if (!lastVisible || isLoadingMore) return;

    setIsLoadingMore(true);
    const notificationsCollection = collection(db, "notifications");
    const q = query(
      notificationsCollection,
      where("userId", "==", user.id),
      startAfter(lastVisible),
      limit(10)
    );

    onSnapshot(q, (querySnapshot) => {
      const moreNotifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(prev => [...prev, ...moreNotifications]);
      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      setIsLoadingMore(false);
    });
  };

  const toggleNotifications = () => {
    setShowNotifications(prev => !prev);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification.id === notificationId ? { ...notification, read: true } : notification
        )
      );
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const markAllAsRead = async () => {
    const unreadNotificationsIds = notifications
      .filter(notification => !notification.read)
      .map(notification => notification.id);

    if (unreadNotificationsIds.length > 0) {
      try {
        await markMultipleNotificationsAsRead(unreadNotificationsIds);
        setNotifications(prevNotifications =>
          prevNotifications.map(notification => ({ ...notification, read: true }))
        );
      } catch (error) {
        console.error('Erro ao marcar todas as notificações como lidas:', error);
      }
    }
  };

  const unreadNotificationsCount = notifications.filter(notification => !notification.read).length;
  const sortedNotifications = [...notifications].sort((a, b) => b.timestamp - a.timestamp);

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Desconhecido';
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: ptBR });
  };

  const handleCloseTopNotification = async () => {
    if (topNotification) {
      try {
        await markNotificationAsRead(topNotification.id);
        setTopNotification(null);
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
          topNotification.notificationStyle === 'informacao' 
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
          {['analyst', 'tax', 'super', 'support+', 'dev', 'quality'].includes(user.role) && (
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
                                {getTimeAgo(notification.timestamp)}
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
                      {lastVisible && (
                        <button
                          onClick={loadMoreNotifications}
                          disabled={isLoadingMore}
                          className={styles.loadMoreButton}
                        >
                          {isLoadingMore ? 'Carregando...' : 'Carregar mais'}
                        </button>
                      )}
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