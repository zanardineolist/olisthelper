import Link from 'next/link';
import styles from '../../styles/Navbar.module.css';
import { useState, useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { FaSignOutAlt, FaBell, FaCheckDouble, FaCheck, FaMoon, FaSun, FaSpinner } from 'react-icons/fa';
import { markNotificationAsRead, markMultipleNotificationsAsRead } from '../../utils/firebase/firebaseNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db } from '../../utils/firebase/firebaseConfig';
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
  const [clickedLinks, setClickedLinks] = useState({});
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

  // Resetar estado de clique quando a navegação for concluída
  useEffect(() => {
    const handleRouteComplete = () => {
      setClickedLinks({});
    };

    router.events.on('routeChangeComplete', handleRouteComplete);
    return () => {
      router.events.off('routeChangeComplete', handleRouteComplete);
    };
  }, [router]);

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Função para lidar com o clique em links de navegação
  const handleNavLinkClick = (e, path) => {
    // Se o link já foi clicado, impedir a navegação duplicada
    if (clickedLinks[path]) {
      e.preventDefault();
      return;
    }

    // Marcar o link como clicado
    setClickedLinks(prev => ({
      ...prev,
      [path]: true
    }));

    // Fechar menu em dispositivos móveis
    setMenuOpen(false);
  };

  // Componente NavLink personalizado com feedback visual
  const NavLink = ({ href, children, className }) => {
    const isActive = router.pathname === href;
    const isClicked = clickedLinks[href];
    
    return (
      <Link 
        href={href} 
        className={`${className || ''} ${isActive ? styles.active : ''} ${isClicked ? styles.clicked : ''}`}
        onClick={(e) => handleNavLinkClick(e, href)}
        tabIndex={isClicked ? -1 : 0}
        aria-disabled={isClicked}
      >
        {children}
        {isClicked && <FaSpinner className={styles.spinnerIcon} />}
      </Link>
    );
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

  return (
    <>
      {topNotification && (
        <div className={styles.topNotification}>
          <span>{topNotification.message}</span>
          <button onClick={() => handleMarkAsRead(topNotification.id)}>
            <FaCheck />
          </button>
        </div>
      )}

      <nav className={styles.navbar} ref={navbarRef}>
        <div className={styles.navbarContainer}>
          <Link href="/remote" className={styles.logo}>
            <span>Olist Helper</span>
          </Link>

          <div className={`${styles.navbarMenu} ${menuOpen ? styles.active : ''}`}>
            <div className={styles.navbarNavLeft}>
              <NavLink href="/remote" className={styles.navbarLink}>
                Home
              </NavLink>
              <NavLink href="/tools" className={styles.navbarLink}>
                Ferramentas
              </NavLink>
              {['analyst', 'super', 'tax'].includes(user?.role) && (
                <NavLink href="/manager" className={styles.navbarLink}>
                  Gerenciar
                </NavLink>
              )}
            </div>

            <div className={styles.navbarNavRight}>
              {/* Tema */}
              <button
                className={styles.themeToggle}
                onClick={toggleTheme}
                title={`Mudar para ${theme === 'dark' ? 'claro' : 'escuro'}`}
              >
                {theme === 'dark' ? <FaSun /> : <FaMoon />}
              </button>

              {/* Notificações */}
              <div className={styles.notificationContainer}>
                <button
                  className={styles.notificationButton}
                  onClick={toggleNotifications}
                  title="Notificações"
                >
                  <FaBell />
                  {unreadNotificationsCount > 0 && (
                    <span className={styles.notificationBadge}>
                      {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className={styles.notificationDropdown} ref={notificationRef}>
                    <div className={styles.notificationHeader}>
                      <h3>Notificações ({unreadNotificationsCount})</h3>
                      {unreadNotificationsCount > 0 && (
                        <button
                          className={styles.markAllAsRead}
                          onClick={markAllAsRead}
                          title="Marcar todas como lidas"
                        >
                          <FaCheckDouble />
                        </button>
                      )}
                    </div>

                    <div className={styles.notificationList}>
                      {sortedNotifications.length === 0 ? (
                        <p className={styles.noNotifications}>Nenhuma notificação</p>
                      ) : (
                        sortedNotifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`${styles.notificationItem} ${
                              !notification.read ? styles.unread : ''
                            }`}
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            <div className={styles.notificationContent}>
                              <p>{notification.message}</p>
                              <span className={styles.notificationTime}>
                                {getTimeAgo(notification.timestamp)}
                              </span>
                            </div>
                            {!notification.read && (
                              <div className={styles.unreadIndicator}></div>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {sortedNotifications.length >= 10 && (
                      <div className={styles.loadMoreContainer}>
                        <button
                          className={styles.loadMore}
                          onClick={loadMoreNotifications}
                          disabled={isLoadingMore}
                        >
                          {isLoadingMore ? 'Carregando...' : 'Carregar mais'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Perfil e Sair */}
              <div className={styles.userMenu}>
                <span className={styles.userName}>{user?.name}</span>
                <button
                  className={styles.logoutButton}
                  onClick={() => signOut({ callbackUrl: '/' })}
                  title="Sair"
                >
                  <FaSignOutAlt />
                </button>
              </div>
            </div>
          </div>

          <div className={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </nav>
    </>
  );
} 