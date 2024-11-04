// components/Navbar.js
import Link from 'next/link';
import styles from '../styles/Navbar.module.css';
import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { FaSignOutAlt, FaMoon, FaSun, FaBell, FaCheckDouble, FaCheck } from 'react-icons/fa';
import { markNotificationAsRead } from '../utils/firebase/firebaseNotifications';

// Função para converter o timestamp para um objeto Date
const convertTimestampToDate = (timestamp) => {
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate(); // Firestore Timestamp
  } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    return new Date(timestamp); // String ou número de milissegundos
  } else {
    return new Date(); // Caso não seja válido, retorna a data atual como fallback
  }
};

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
  const sortedNotifications = [...notifications]
    .sort((a, b) => convertTimestampToDate(b.timestamp) - convertTimestampToDate(a.timestamp))
    .slice(0, 5);

  // Função para formatar a data da notificação
  const getTimeAgo = (timestamp) => {
    const notificationTime = convertTimestampToDate(timestamp);

    if (isNaN(notificationTime)) {
      return 'Desconhecido';
    }

    const now = new Date();
    const diffInSeconds = Math.floor((now - notificationTime) / 1000);

    const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

    if (diffInSeconds < 60) {
      return rtf.format(-diffInSeconds, 'second');
    } else if (diffInSeconds < 3600) {
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      return rtf.format(-diffInMinutes, 'minute');
    } else if (diffInSeconds < 86400) {
      const diffInHours = Math.floor(diffInSeconds / 3600);
      return rtf.format(-diffInHours, 'hour');
    } else {
      const diffInDays = Math.floor(diffInSeconds / 86400);
      return rtf.format(-diffInDays, 'day');
    }
  };

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
                            {getTimeAgo(notification.timestamp)}
                          </span>
                        </div>
                        <div className={styles.markAsReadIndicator}>
                          {notification.read ? (
                            <FaCheckDouble className={styles.checkIcon} />
                          ) : (
                            <FaCheck className={styles.checkIcon} onClick={() => handleMarkAsRead(notification.id)} />
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
