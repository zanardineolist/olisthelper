import Link from 'next/link';
import styles from '../styles/Sidebar.module.css';
import { useState, useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { 
  FaSignOutAlt, 
  FaBell, 
  FaCheckDouble, 
  FaCheck, 
  FaMoon, 
  FaSun, 
  FaSpinner,
  FaUser,
  FaTools,
  FaChartBar,
  FaEdit,
  FaCog,
  FaUsers,
  FaDesktop,
  FaShieldAlt,
  FaBars,
  FaTimes,
  FaHome,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import { markNotificationAsRead, markMultipleNotificationsAsRead } from '../utils/firebase/firebaseNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db } from '../utils/firebase/firebaseConfig';
import { collection, query, where, onSnapshot, limit, startAfter } from 'firebase/firestore';
import _ from 'lodash';

export default function Sidebar({ user }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [topNotification, setTopNotification] = useState(null);
  const [clickedLinks, setClickedLinks] = useState({});
  const router = useRouter();
  const notificationRef = useRef(null);
  const sidebarRef = useRef(null);

  // Handle click outside
  useEffect(() => {
    const handleClickOutsideDebounced = _.debounce((event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setShowNotifications(false);
        if (window.innerWidth <= 768) {
          setIsMobileOpen(false);
        }
      }
    }, 200);

    document.addEventListener('click', handleClickOutsideDebounced);
    return () => {
      document.removeEventListener('click', handleClickOutsideDebounced);
      handleClickOutsideDebounced.cancel();
    };
  }, []);

  // Responsive handling
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsExpanded(false);
        setIsMobileOpen(false);
      } else {
        setIsExpanded(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset clicked state when navigation completes
  useEffect(() => {
    const handleRouteComplete = () => {
      setClickedLinks({});
      setIsMobileOpen(false);
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

  // Navigation handling
  const handleNavLinkClick = (e, path) => {
    if (clickedLinks[path]) {
      e.preventDefault();
      return;
    }

    setClickedLinks(prev => ({
      ...prev,
      [path]: true
    }));
  };

  // Custom NavLink component
  const NavLink = ({ href, children, icon: Icon, className, badge }) => {
    const isActive = router.pathname === href;
    const isClicked = clickedLinks[href];
    
    return (
      <Link 
        href={href} 
        className={`${styles.navLink} ${isActive ? styles.active : ''} ${isClicked ? styles.clicked : ''} ${className || ''}`}
        onClick={(e) => handleNavLinkClick(e, href)}
        tabIndex={isClicked ? -1 : 0}
        aria-disabled={isClicked}
        title={!isExpanded ? children : ''}
      >
        <div className={styles.navLinkContent}>
          <div className={styles.iconWrapper}>
            <Icon className={styles.navIcon} />
            {badge && <span className={styles.badge}>{badge}</span>}
          </div>
          {isExpanded && (
            <span className={styles.navLabel}>
              {children}
              {isClicked && <FaSpinner className={styles.navSpinner} />}
            </span>
          )}
        </div>
      </Link>
    );
  };

  // Notifications setup
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

  const unreadNotificationsCount = notifications.filter(notification => !notification.read).length;
  const sortedNotifications = [...notifications].sort((a, b) => b.timestamp - a.timestamp);

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Desconhecido';
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: ptBR });
  };

  // Menu items configuration
  const getMenuItems = () => {
    const items = [];

    // Common items for all roles
    if (user.role === 'support' || user.role === 'support+') {
      items.push(
        { href: '/profile', label: 'Meu Perfil', icon: FaUser },
        { href: '/tools', label: 'Ferramentas', icon: FaTools }
      );
    }

    if (user.role === 'analyst' || user.role === 'tax') {
      items.push(
        { href: '/profile-analyst', label: 'Meu Perfil', icon: FaUser },
        { href: '/registro', label: 'Registrar Ajuda', icon: FaEdit },
        { href: '/dashboard-analyst', label: 'Dashboard', icon: FaChartBar },
        { href: '/tools', label: 'Ferramentas', icon: FaTools }
      );
    }

    if (user.role === 'super') {
      items.push(
        { href: '/dashboard-super', label: 'Dashboard', icon: FaChartBar },
        { href: '/tools', label: 'Ferramentas', icon: FaTools }
      );
    }

    if (user.role === 'quality') {
      items.push(
        { href: '/dashboard-quality', label: 'Dashboard Qualidade', icon: FaChartBar },
        { href: '/tools', label: 'Ferramentas', icon: FaTools }
      );
    }

    // Manager access
    if (['analyst', 'tax', 'super'].includes(user.role)) {
      items.push({ href: '/manager', label: 'Gerenciador', icon: FaCog });
    }

    // Remote access
    if (['support+', 'super'].includes(user.role)) {
      items.push({ href: '/remote', label: 'Acesso Remoto', icon: FaDesktop });
    }

    // Dev access
    if (user.role === 'dev') {
      items.push({ href: '/admin-notifications', label: 'Admin Notificações', icon: FaShieldAlt });
    }

    return items;
  };

  return (
    <>
      {/* Top notification banner */}
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

      {/* Mobile overlay */}
      {isMobileOpen && <div className={styles.mobileOverlay} onClick={() => setIsMobileOpen(false)} />}

      {/* Mobile toggle button */}
      <button 
        className={styles.mobileToggle}
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label="Toggle menu"
      >
        {isMobileOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Sidebar */}
      <aside 
        ref={sidebarRef}
        className={`${styles.sidebar} ${isExpanded ? styles.expanded : styles.collapsed} ${isMobileOpen ? styles.mobileOpen : ''}`}
      >
        {/* Header */}
        <div className={styles.sidebarHeader}>
          <Link 
            href={
              user.role === 'analyst' || user.role === 'tax' 
                ? '/profile-analyst' 
                : user.role === 'quality'
                  ? '/dashboard-quality'
                  : '/profile'
            } 
            className={styles.logo}
          >
            <img 
              src={theme === 'dark' ? '/images/logos/olist_helper_logo.png' : '/images/logos/olist_helper_dark_logo.png'}
              alt="Olist Helper"
              className={styles.logoImage}
            />
            {isExpanded && <span className={styles.logoText}>Olist Helper</span>}
          </Link>
          
          {typeof window !== 'undefined' && window.innerWidth > 768 && (
            <button 
              className={styles.toggleButton}
              onClick={() => setIsExpanded(!isExpanded)}
              aria-label="Toggle sidebar"
            >
              {isExpanded ? <FaChevronLeft /> : <FaChevronRight />}
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className={styles.sidebarNav}>
          <div className={styles.navSection}>
            <div className={styles.navGroup}>
              {getMenuItems().map((item, index) => (
                <NavLink 
                  key={index}
                  href={item.href} 
                  icon={item.icon}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className={styles.sidebarFooter}>
          {/* Notifications */}
          {['analyst', 'tax', 'super', 'support+', 'dev', 'quality'].includes(user.role) && (
            <div className={styles.footerItem}>
              <button 
                className={styles.footerButton} 
                onClick={toggleNotifications}
                title={!isExpanded ? 'Notificações' : ''}
              >
                <FaBell className={styles.footerIcon} />
                {unreadNotificationsCount > 0 && (
                  <span className={styles.notificationBadge}>
                    {unreadNotificationsCount}
                  </span>
                )}
                {isExpanded && <span>Notificações</span>}
              </button>

              {showNotifications && (
                <div ref={notificationRef} className={styles.notificationsPanel}>
                  <div className={styles.notificationsPanelHeader}>
                    <h3>Notificações</h3>
                    {unreadNotificationsCount > 0 && (
                      <button onClick={markAllAsRead} className={styles.markAllRead}>
                        Marcar todas como lidas
                      </button>
                    )}
                  </div>
                  
                  {sortedNotifications.length === 0 ? (
                    <p className={styles.noNotifications}>Nenhuma notificação disponível</p>
                  ) : (
                    <div className={styles.notificationsList}>
                      {sortedNotifications.map((notification) => (
                        <div
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
                          <div className={styles.notificationActions}>
                            {notification.read ? (
                              <FaCheckDouble className={styles.readIcon} title="Lido" />
                            ) : (
                              <button 
                                onClick={() => handleMarkAsRead(notification.id)}
                                className={styles.markReadButton}
                                title="Marcar como lido"
                              >
                                <FaCheck />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {lastVisible && (
                        <button
                          onClick={loadMoreNotifications}
                          disabled={isLoadingMore}
                          className={styles.loadMoreButton}
                        >
                          {isLoadingMore ? 'Carregando...' : 'Carregar mais'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Theme Toggle */}
          <div className={styles.footerItem}>
            <button 
              onClick={toggleTheme} 
              className={styles.footerButton}
              title={!isExpanded ? 'Alternar tema' : ''}
            >
              {theme === 'dark' ? <FaMoon className={styles.footerIcon} /> : <FaSun className={styles.footerIcon} />}
              {isExpanded && <span>Tema {theme === 'dark' ? 'Escuro' : 'Claro'}</span>}
            </button>
          </div>

          {/* User Profile */}
          <div className={styles.userProfile}>
            <img src={user.image} alt={user.name} className={styles.userAvatar} />
            {isExpanded && (
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user.name.split(' ')[0]}</span>
                <span className={styles.userRole}>
                  {user.role === 'analyst' ? 'Analista' : 
                   user.role === 'tax' ? 'Fiscal' :
                   user.role === 'support' ? 'Suporte' :
                   user.role === 'support+' ? 'Suporte+' :
                   user.role === 'quality' ? 'Qualidade' :
                   user.role === 'super' ? 'Super' : 'Dev'}
                </span>
              </div>
            )}
          </div>

          {/* Logout */}
          <div className={styles.footerItem}>
            <button 
              onClick={() => signOut({ callbackUrl: '/' })} 
              className={`${styles.footerButton} ${styles.logoutButton}`}
              title={!isExpanded ? 'Logout' : ''}
            >
              <FaSignOutAlt className={styles.footerIcon} />
              {isExpanded && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content offset */}
      <div className={`${styles.mainContent} ${isExpanded ? styles.expanded : styles.collapsed}`}>
        {/* Content will be rendered here by pages */}
      </div>
    </>
  );
} 