// components/Navbar.js
import Link from 'next/link';
import styles from '../styles/Navbar.module.css';
import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { FaSignOutAlt, FaMoon, FaSun } from 'react-icons/fa';

export default function Navbar({ user }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
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

  const handleNavigation = (path) => {
    router.push(path);
    setMenuOpen(false);
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>
        <Link href={user.role === 'analyst' || user.role === 'tax' ? '/profile-analyst' : '/profile'}>
          <img src="/images/logos/olist_helper_logo.png" alt="Olist Helper Logo" />
        </Link>
      </div>
      <button onClick={toggleTheme} className={styles.themeToggle}>
        {theme === 'dark' ? <FaSun /> : <FaMoon />}
      </button>
      <button onClick={() => setMenuOpen(!menuOpen)} className={styles.menuToggle}>
        ☰
      </button>
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
          <button onClick={() => signOut({ callbackUrl: '/' })} className={`${styles.menuButton} ${styles.logoutButton}`}>
            <FaSignOutAlt style={{ marginRight: '8px', fontSize: '20px' }} /> Logout
          </button>
        </div>
      )}
    </nav>
  );
}
