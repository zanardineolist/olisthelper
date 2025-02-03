import Link from 'next/link';
import styles from '../styles/Navbar.module.css';
import { useState, useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSignOutAlt, FaBell, FaCheckDouble, FaCheck } from 'react-icons/fa';
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

  // Handle click outside navbar and notification box
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

  // Load saved theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Toggle theme between dark and light
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // Real-time notifications with Firestore
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

  // Load more notifications
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

  // Handle navigation
  const handleNavigation = (path) => {
    router.push(path);
    setMenuOpen(false);
    setShowNotifications(false);
  };

  // Toggle notifications box
  const toggleNotifications = () => {
    setShowNotifications(prev => !prev);
    setMenuOpen(false);
  };

  // Mark notification as read
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

  // Mark all notifications as read
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

  // Count unread notifications
  const unreadNotificationsCount = notifications.filter(notification => !notification.read).length;

  // Sort notifications by timestamp
  const sortedNotifications = [...notifications].sort((a, b) => b.timestamp - a.timestamp);

  // Format timestamp to time ago
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Desconhecido';
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: ptBR });
  };

  // Handle closing top notification
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
      <AnimatePresence>
        {topNotification && (
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className={`${styles.notificationBanner} ${
              topNotification.notificationStyle === 'informacao' 
                ? styles.informacaoBanner 
                : styles.avisoBanner
            }`}
          >
            <p>{topNotification.message}</p>
            <button onClick={handleCloseTopNotification} className={styles.closeButton}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.nav 
        ref={navbarRef} 
        className={styles.navbar}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        <Link href={user.role === 'analyst' || user.role === 'tax' ? '/profile-analyst' : '/profile'} className={styles.logo}>
          <motion.img 
            src={theme === 'dark' ? '/images/logos/olist_helper_logo.png' : '/images/logos/olist_helper_dark_logo.png'}
            alt="Logo"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400 }}
          />
        </Link>

        <div className={styles.rightSection}>
          {/* Theme Toggle Button */}
          <motion.button
            onClick={toggleTheme}
            className={styles.themeToggle}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className={styles.themeToggleWrapper}>
              <motion.div 
                className={styles.themeIcon}
                initial={false}
                animate={{ rotate: theme === 'dark' ? 0 : 180 }}
              >
                {theme === 'dark' ? '🌙' : '☀️'}
              </motion.div>
            </div>
          </motion.button>

          {/* Notifications */}
          {['analyst', 'tax', 'super', 'support+', 'dev'].includes(user.role) && (
            <div className={styles.notificationsWrapper}>
              <motion.div
                className={styles.notificationToggle}
                onClick={toggleNotifications}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaBell />
                {unreadNotificationsCount > 0 && (
                  <motion.span
                    className={styles.notificationCount}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    {unreadNotificationsCount}
                  </motion.span>
                )}
              </motion.div>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    ref={notificationRef}
                    className={styles.notificationsBox}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {sortedNotifications.length === 0 ? (
                      <p className={styles.noNotifications}>Nenhuma notificação disponível</p>
                    ) : (
                      <>
                        <ul className={styles.notificationsList}>
                          {sortedNotifications.map((notification) => (
                            <motion.li
                              key={notification.id}
                              className={`${styles.notificationItem} ${notification.read ? styles.read : ''}`}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ type: "spring", stiffness: 300 }}
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
                                  <motion.div 
                                    onClick={() => handleMarkAsRead(notification.id)}
                                    className={styles.markAsReadWrapper}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <span className={styles.markAsReadText}>Marcar como lido</span>
                                    <FaCheck className={styles.checkIcon} />
                                  </motion.div>
                                )}
                              </div>
                            </motion.li>
                          ))}
                        </ul>
                        <motion.button
                          onClick={markAllAsRead}
                          className={styles.markAllReadButton}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Marcar todas como lidas
                        </motion.button>
                        {lastVisible && (
                          <motion.button
                            onClick={loadMoreNotifications}
                            disabled={isLoadingMore}
                            className={styles.loadMoreButton}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {isLoadingMore ? 'Carregando...' : 'Carregar mais'}
                          </motion.button>
                        )}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Menu Toggle */}
          <motion.button
            onClick={() => setMenuOpen(!menuOpen)}
            className={styles.menuToggle}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className={`${styles.hamburger} ${menuOpen ? styles.active : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </motion.button>
        </div>

        {/* Menu Dropdown */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className={styles.menu}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {(user.role === 'support' || user.role === 'support+') && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleNavigation('/profile')}
                    className={styles.menuButton}
                  >
                    Meu Perfil
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleNavigation('/tools')}
                    className={styles.menuButton}
                  >
                    Ferramentas
                  </motion.button>
                </>
              )}

              {(user.role === 'analyst' || user.role === 'tax') && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleNavigation('/profile-analyst')}
                    className={styles.menuButton}
                  >
                    Meu Perfil
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleNavigation('/registro')}
                    className={styles.menuButton}
                  >
                    Registrar Ajuda
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleNavigation('/dashboard-analyst')}
                    className={styles.menuButton}
                  >
                    Dashboard
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleNavigation('/tools')}
                    className={styles.menuButton}
                  >
                    Ferramentas
                  </motion.button>
                </>
              )}

              {user.role === 'super' && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleNavigation('/dashboard-super')}
                    className={styles.menuButton}
                  >
                    Dashboard
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleNavigation('/tools')}
                    className={styles.menuButton}
                  >
                    Ferramentas
                  </motion.button>
                </>
              )}

              {(user.role === 'analyst' || user.role === 'tax' || user.role === 'super') && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleNavigation('/manager')}
                  className={styles.menuButton}
                >
                  Gerenciador
                </motion.button>
              )}

              {(user.role === 'support+' || user.role === 'super') && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleNavigation('/remote')}
                  className={styles.menuButton}
                >
                  Acesso Remoto
                </motion.button>
              )}

              {user.role === 'dev' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleNavigation('/admin-notifications')}
                  className={styles.menuButton}
                >
                  Admin Notificações
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => signOut({ callbackUrl: '/' })}
                className={`${styles.menuButton} ${styles.logoutButton}`}
              >
                <FaSignOutAlt style={{ marginRight: '8px', fontSize: '20px' }} /> Logout
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </div>
  );
}