// components/Navbar.js
import Link from 'next/link';
import styles from '../styles/Navbar.module.css';
import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { FaSignOutAlt, FaMoon, FaSun, FaBell } from 'react-icons/fa';
import { markNotificationAsRead } from '../utils/firebase/firebaseNotifications';
import moment from 'moment';  // Importação do Moment.js para formatação de datas

export default function Navbar({ user }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const router = useRouter();

  // Fecha o menu ao clicar fora
  useEffect(() => {
    if (menuOpen) {
      const handleClickOutside = (event) => {
        if (!event.target.closest(`.${styles.navbar}`)) {
          setMenuOpen(false);
        }
      };
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [menuOpen]);

  // Inicializa o tema com base no localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Alterna o tema e salva no localStorage
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // Carregar notificações para o usuário
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        if (['analyst', 'tax', 'super'].includes(user.role)) {
          const res = await fetch(`/api/notifications?userId=${user.id}`);
          if (!res.ok) throw new Error('Erro ao carregar notificações');
          const data = await res.json();
          setNotifications(data.notifications);
        }
      } catch (err) {
        console.error('Erro ao carregar notificações:', err);
      }
    };
    loadNotifications();
  }, [user.id, user.role]);

  const handleNavigation = (path) => {
    router.push(path);
    setMenuOpen(false);
  };

  // Toggle para abrir/fechar a caixa de notificações
  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  // Marcar uma notificação como lida
  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) =>
          notification.id === notificationId ? { ...notification, read: true } : notification
        )
      );
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  // Quantidade de notificações não lidas
  const unreadNotificationsCount = notifications.filter(notification => !notification.read).length;

  // Ordenar as notificações para mostrar as mais recentes primeiro e limitar a 5 notificações
  const sortedNotifications = notifications
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5);

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>
        <Link href={user.role === 'analyst' || user.role === 'tax' ? '/profile-analyst' : '/profile'}>
          <img src="/images/logos/olist_helper_logo.png" alt="Olist Helper Logo" />
        </Link>
      </div>

      <div className={styles.rightSection}>
        <button onClick={toggleTheme} className={styles.themeToggle}>
          {theme === 'dark' ? <FaSun /> : <FaMoon />}
        </button>

        {/* Mostrar notificações apenas para os papéis "analyst", "tax" e "super" */}
        {['analyst', 'tax', 'super'].includes(user.role) && (
          <>
            <div className={styles.notificationToggle} onClick={toggleNotifications}>
              <FaBell />
              {unreadNotificationsCount > 0 && (
                <span className={styles.notificationCount}>{unreadNotificationsCount}</span>
              )}
            </div>

            {showNotifications && (
              <div className={styles.notificationsBox}>
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
                            {moment(notification.timestamp).fromNow()}
                          </span>
                        </div>
                        {!notification.read && (
                          <button onClick={() => handleMarkAsRead(notification.id)} className={styles.markAsReadButton}>
                            Marcar como lida
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}

        <button onClick={() => setMenuOpen(!menuOpen)} className={styles.menuToggle}>
          ☰
        </button>
      </div>

      {menuOpen && (
        <div className={styles.menu}>
          {user.role === 'support' && (
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
  );
}
