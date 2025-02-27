import Link from 'next/link';
import styles from '../styles/Navbar.module.css';
import { useState, useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { FaSignOutAlt, FaBell, FaCheckDouble, FaCheck, FaMoon, FaSun } from 'react-icons/fa';
import { markNotificationAsRead, markMultipleNotificationsAsRead } from '../utils/firebase/firebaseNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db } from '../utils/firebase/firebaseConfig';
import { collection, query, where, onSnapshot, limit, startAfter } from 'firebase/firestore';
import _ from 'lodash';

export default function Navbar({ user }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
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
        setMenuOpen(false);
        setShowNotifications(false);
      }
    }, 200);

    document.addEventListener('click', handleClickOutsideDebounced);
    return () => {
      document.removeEventListener('click', handleClickOutsideDebounced);
      handleClickOutsideDebounced.cancel();
    };
  }, []);

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

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

  const handleNavigation = (path) => {
    router.push(path);
    setMenuOpen(false);
    setShowNotifications(false);
  };

  const toggleNotifications = () => {
    setShowNotifications(prev => !prev);
    setMenuOpen(false);
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

      <nav ref={navbarRef} className={styles.navbar}>
        <Link href={user.role === 'analyst' || user.role === 'tax' ? '/profile-analyst' : '/profile'} className={styles.logo}>
          <img 
            src={theme === 'dark' ? '/images/logos/olist_helper_logo.png' : '/images/logos/olist_helper_dark_logo.png'}
            alt="Logo"
          />
        </Link>

        <div className={styles.rightSection}>
          {/* Theme Toggle */}
          <button onClick={toggleTheme} className={styles.themeToggle} aria-label="Alternar tema">
            <div className={styles.themeToggleTrack}>
              <div className={`${styles.themeToggleThumb} ${theme === 'dark' ? styles.dark : ''}`}>
                {theme === 'dark' ? <FaMoon className={styles.moonIcon} /> : <FaSun className={styles.sunIcon} />}
              </div>
            </div>
          </button>

          {/* Notifications */}
          {['analyst', 'tax', 'super', 'support+', 'dev'].includes(user.role) && (
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

          {/* Menu Toggle */}
          <button 
            onClick={() => setMenuOpen(!menuOpen)} 
            className={`${styles.menuToggle} ${menuOpen ? styles.active : ''}`}
            aria-label="Menu"
          >
            <span className={styles.hamburgerIcon}></span>
            <span className={styles.hamburgerIcon}></span>
            <span className={styles.hamburgerIcon}></span>
          </button>
        </div>

        {/* Menu Dropdown */}
        {menuOpen && (
          <div className={styles.menu}>
            {(user.role === 'support' || user.role === 'support+') && (
              <>
                <button onClick={() => handleNavigation('/profile')} className={styles.menuButton}>
                  Meu Perfil
                </button>
                <button onClick={() => handleNavigation('/tools')} className={styles.menuButton}>
                  Ferramentas
                </button>
              </>
            )}

            {(user.role === 'analyst' || user.role === 'tax') && (
              <>
                <button onClick={() => handleNavigation('/profile-analyst')} className={styles.menuButton}>
                  Meu Perfil
                </button>
                <button onClick={() => handleNavigation('/registro')} className={styles.menuButton}>
                  Registrar Ajuda
                </button>
                <button onClick={() => handleNavigation('/dashboard-analyst')} className={styles.menuButton}>
                  Dashboard
                </button>
                <button onClick={() => handleNavigation('/tools')} className={styles.menuButton}>
                  Ferramentas
                </button>
              </>
            )}

            {user.role === 'super' && (
              <>
                <button onClick={() => handleNavigation('/dashboard-super')} className={styles.menuButton}>
                  Dashboard
                </button>
                <button onClick={() => handleNavigation('/tools')} className={styles.menuButton}>
                  Ferramentas
                </button>
              </>
            )}

            {(user.role === 'analyst' || user.role === 'tax' || user.role === 'super') && (
              <button onClick={() => handleNavigation('/manager')} className={styles.menuButton}>
                Gerenciador
              </button>
            )}

            {(user.role === 'support+' || user.role === 'super') && (
              <button onClick={() => handleNavigation('/remote')} className={styles.menuButton}>
                Acesso Remoto
              </button>
            )}

            {user.role === 'dev' && (
              <button onClick={() => handleNavigation('/admin-notifications')} className={styles.menuButton}>
                Admin Notificações
              </button>
            )}

            <button 
              onClick={() => signOut({ callbackUrl: '/' })} 
              className={`${styles.menuButton} ${styles.logoutButton}`}
            >
              <FaSignOutAlt style={{ marginRight: '8px', fontSize: '20px' }} /> Logout
            </button>
          </div>
        )}
      </nav>
    </div>
  );
}