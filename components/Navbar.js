import Link from 'next/link';
import styles from '../styles/Navbar.module.css';
import { useState, useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { FaSignOutAlt, FaMoon, FaSun, FaBell, FaCheckDouble, FaCheck } from 'react-icons/fa';
import { markNotificationAsRead } from '../utils/firebase/firebaseNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db } from '../utils/firebase/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function Navbar({ user }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [topNotification, setTopNotification] = useState(null);
  const router = useRouter();
  const notificationRef = useRef(null);
  const navbarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target)) {
        setMenuOpen(false);
        setShowNotifications(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

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

  useEffect(() => {
    if (!user?.id) return;

    // Buscar todas as notificações do usuário em tempo real
    const notificationsCollection = collection(db, "notifications");
    const q = query(notificationsCollection, where("userId", "==", user.id));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const updatedNotifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(updatedNotifications);

      // Filtrar a notificação do tipo "top" que ainda não foi lida
      const topNotif = updatedNotifications.find(
        (notification) => notification.notificationType === 'top' && !notification.read
      );
      setTopNotification(topNotif);
    });

    return () => unsubscribe();
  }, [user.id]);

  const handleNavigation = (path) => {
    router.push(path);
    setMenuOpen(false);
    setShowNotifications(false);
  };

  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);
    setMenuOpen(false);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) =>
          notification.id === notificationId ? { ...notification, read: true } : notification
        )
      );

      // Remover a notificação do topo se for marcada como lida
      if (topNotification?.id === notificationId) {
        setTopNotification(null);
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const handleCloseBanner = async () => {
    if (topNotification) {
      try {
        await markNotificationAsRead(topNotification.id);
        setTopNotification(null);
      } catch (error) {
        console.error('Erro ao marcar notificação como lida:', error);
      }
    }
  };

  const unreadNotificationsCount = notifications.filter(notification => !notification.read).length;

  const sortedNotifications = [...notifications]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  const getTimeAgo = (timestamp) => {
    if (typeof timestamp !== 'number') {
      return 'Desconhecido';
    }

    const notificationTime = new Date(timestamp);
    if (isNaN(notificationTime)) {
      return 'Desconhecido';
    }

    return formatDistanceToNow(notificationTime, { addSuffix: true, locale: ptBR });
  };

  return (
    <>
      {topNotification && (
        <div className={styles.notificationBanner}>
          <p>{topNotification.message}</p>
          <button className={styles.closeButton} onClick={handleCloseBanner} aria-label="Fechar banner de notificação">X</button>
        </div>
      )}
      <nav ref={navbarRef} className={styles.navbar}>
        <div className={styles.logo}>
          <Link href={user.role === 'analyst' || user.role === 'tax' ? '/profile-analyst' : '/profile'}>
            <img 
              src={theme === 'dark' ? '/images/logos/olist_helper_logo.png' : '/images/logos/olist_helper_dark_logo.png'}
              alt="Novo Logo" 
            />
          </Link>
        </div>

        <div className={styles.rightSection}>
          <button onClick={toggleTheme} className={styles.themeToggle} aria-label="Alternar tema">
            {theme === 'dark' ? <FaSun /> : <FaMoon />}
          </button>

          {['analyst', 'tax', 'super', 'support+'].includes(user.role) && (
            <>
              <div className={styles.notificationToggle} onClick={toggleNotifications} aria-label="Notificações">
                <FaBell />
                {unreadNotificationsCount > 0 && (
                  <span className={styles.notificationCount}>{unreadNotificationsCount}</span>
                )}
              </div>

              {showNotifications && (
                <div ref={notificationRef} className={styles.notificationsBox}>
                  {sortedNotifications.length === 0 ? (
                    <p className={styles.noNotifications}>Nenhuma notificação disponível</p>
                  ) : (
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
                              <FaCheckDouble 
                                className={`${styles.checkIconDouble}`} 
                                title="Lido"
                              />
                            ) : (
                              <div onClick={() => handleMarkAsRead(notification.id)} className={styles.markAsReadWrapper}>
                                <span className={styles.markAsReadText}>Marcar como lido</span>
                                <FaCheck className={`${styles.checkIcon}`} />
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}

          <button onClick={() => setMenuOpen(!menuOpen)} className={styles.menuToggle} aria-label="Menu">
            ☰
          </button>
        </div>

        {menuOpen && (
          <div className={styles.menu}>
            {(user.role === 'support' || user.role === 'support+') && (
              <button onClick={() => handleNavigation('/profile')} className={styles.menuButton}>
                Meu Perfil
              </button>
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
              </>
            )}
            {user.role === 'super' && (
              <button onClick={() => handleNavigation('/dashboard-super')} className={styles.menuButton}>
                Dashboard
              </button>
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
            <button onClick={() => signOut({ callbackUrl: '/' })} className={`${styles.menuButton} ${styles.logoutButton}`}>
              <FaSignOutAlt style={{ marginRight: '8px', fontSize: '20px' }} /> Logout
            </button>
          </div>
        )}
      </nav>
    </>
  );
}
