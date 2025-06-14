import Link from 'next/link';
import styles from '../styles/Sidebar.module.css';
import { useState, useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { 
  FaSignOutAlt, 
  FaUser, 
  FaTools, 
  FaTachometerAlt, 
  FaClipboardList, 
  FaCogs, 
  FaDesktop, 
  FaBell, 
  FaChevronLeft, 
  FaBars,
  FaSpinner,
  FaMoon,
  FaSun
} from 'react-icons/fa';

export default function Sidebar({ user, isCollapsed, setIsCollapsed, theme, toggleTheme }) {
  const [clickedLinks, setClickedLinks] = useState({});
  const [isMobileMenuActive, setIsMobileMenuActive] = useState(false);
  const router = useRouter();
  const sidebarRef = useRef(null);

  // Resetar estado de clique quando a navegação for concluída
  useEffect(() => {
    const handleRouteComplete = () => {
      setClickedLinks({});
      setIsMobileMenuActive(false);
    };

    router.events.on('routeChangeComplete', handleRouteComplete);
    return () => {
      router.events.off('routeChangeComplete', handleRouteComplete);
    };
  }, [router]);

  // Função para lidar com o clique em links de navegação
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

  // Toggle sidebar collapsed state
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setIsMobileMenuActive(!isMobileMenuActive);
  };

  // Componente NavLink personalizado
  const NavLink = ({ href, icon: Icon, label, tooltip }) => {
    const isActive = router.pathname === href;
    const isClicked = clickedLinks[href];
    
    return (
      <li className={styles.navItem}>
        <Link 
          href={href} 
          className={`${styles.navLink} ${isActive ? styles.active : ''} ${isClicked ? styles.clicked : ''}`}
          onClick={(e) => handleNavLinkClick(e, href)}
          tabIndex={isClicked ? -1 : 0}
          aria-disabled={isClicked}
        >
          <span className={styles.navIcon}>
            {isClicked ? <FaSpinner className={styles.spinnerIcon} /> : <Icon />}
          </span>
          <span className={styles.navLabel}>{label}</span>
        </Link>
        <span className={styles.navTooltip}>{tooltip}</span>
      </li>
    );
  };

  // Obter opções de menu baseadas no role do usuário
  const getMenuItems = () => {
    const menuItems = {
      primary: [],
      secondary: []
    };

    // Menu baseado no role
    if (user.role === 'support' || user.role === 'support+') {
      menuItems.primary = [
        { href: '/profile', icon: FaUser, label: 'Meu Perfil', tooltip: 'Meu Perfil' },
        { href: '/tools', icon: FaTools, label: 'Ferramentas', tooltip: 'Ferramentas' }
      ];
    }

    if (user.role === 'analyst' || user.role === 'tax') {
      menuItems.primary = [
        { href: '/profile-analyst', icon: FaUser, label: 'Meu Perfil', tooltip: 'Meu Perfil' },
        { href: '/registro', icon: FaClipboardList, label: 'Registrar Ajuda', tooltip: 'Registrar Ajuda' },
        { href: '/dashboard-analyst', icon: FaTachometerAlt, label: 'Dashboard', tooltip: 'Dashboard' },
        { href: '/tools', icon: FaTools, label: 'Ferramentas', tooltip: 'Ferramentas' },
        { href: '/manager', icon: FaCogs, label: 'Gerenciador', tooltip: 'Gerenciador' }
      ];
    }

    if (user.role === 'super') {
      menuItems.primary = [
        { href: '/dashboard-super', icon: FaTachometerAlt, label: 'Dashboard', tooltip: 'Dashboard' },
        { href: '/tools', icon: FaTools, label: 'Ferramentas', tooltip: 'Ferramentas' },
        { href: '/manager', icon: FaCogs, label: 'Gerenciador', tooltip: 'Gerenciador' },
        { href: '/remote', icon: FaDesktop, label: 'Acesso Remoto', tooltip: 'Acesso Remoto' }
      ];
    }

    if (user.role === 'quality') {
      menuItems.primary = [
        { href: '/dashboard-quality', icon: FaTachometerAlt, label: 'Dashboard Qualidade', tooltip: 'Dashboard Qualidade' },
        { href: '/tools', icon: FaTools, label: 'Ferramentas', tooltip: 'Ferramentas' }
      ];
    }

    if (user.role === 'support+' && !menuItems.primary.some(item => item.href === '/remote')) {
      menuItems.primary.push({ href: '/remote', icon: FaDesktop, label: 'Acesso Remoto', tooltip: 'Acesso Remoto' });
    }

    if (user.role === 'dev') {
      menuItems.primary = [
        { href: '/admin-notifications', icon: FaBell, label: 'Admin Notificações', tooltip: 'Admin Notificações' }
      ];
    }

    return menuItems;
  };

  const menuItems = getMenuItems();

  return (
    <aside 
      ref={sidebarRef}
      className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''} ${isMobileMenuActive ? styles.menuActive : ''}`}
    >
      {/* Sidebar Header */}
      <header className={styles.sidebarHeader}>
        <Link href={
          user.role === 'analyst' || user.role === 'tax' 
            ? '/profile-analyst' 
            : user.role === 'quality'
              ? '/dashboard-quality'
              : '/profile'
        } className={styles.headerLogo}>
          <img 
            src={isCollapsed 
              ? '/images/icons/olist_helper_favicon.png'
              : theme === 'dark' 
                ? '/images/logos/olist_helper_logo.png' 
                : '/images/logos/olist_helper_dark_logo.png'
            }
            alt="OlistHelper"
            className={isCollapsed ? styles.faviconLogo : styles.fullLogo}
          />
        </Link>

        {/* Mobile Toggler */}
        <button 
          className={`${styles.toggler} ${styles.menuToggler}`}
          onClick={toggleMobileMenu}
          aria-label="Toggle Menu"
        >
          <FaBars />
        </button>
      </header>

      {/* Desktop Toggler - Positioned separately */}
      <div className={styles.togglerContainer}>
        <button 
          className={`${styles.toggler} ${styles.sidebarToggler}`}
          onClick={toggleSidebar}
          aria-label={isCollapsed ? "Expandir Sidebar" : "Recolher Sidebar"}
        >
          <FaChevronLeft />
        </button>
        <span className={styles.togglerTooltip}>
          {isCollapsed ? "Expandir Menu" : "Recolher Menu"}
        </span>
      </div>

      {/* Sidebar Navigation */}
      <nav className={styles.sidebarNav}>
        {/* Primary Navigation */}
        <ul className={`${styles.navList} ${styles.primaryNav}`}>
          {menuItems.primary.map((item, index) => (
            <NavLink
              key={index}
              href={item.href}
              icon={item.icon}
              label={item.label}
              tooltip={item.tooltip}
            />
          ))}
        </ul>

        {/* Secondary Navigation */}
        <ul className={`${styles.navList} ${styles.secondaryNav}`}>
          {/* Theme Toggle */}
          <li className={styles.navItem}>
            <button 
              onClick={toggleTheme} 
              className={`${styles.navLink} ${styles.themeToggle}`}
              aria-label="Alternar tema"
            >
              <span className={styles.themeToggleContainer}>
                <span className={styles.themeToggleTrack}>
                  <span className={`${styles.themeToggleThumb} ${theme === 'dark' ? styles.dark : styles.light}`}>
                    {theme === 'dark' ? <FaMoon /> : <FaSun />}
                  </span>
                </span>
              </span>
              <span className={styles.navLabel}>
                {theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
              </span>
            </button>
            <span className={styles.navTooltip}>
              {theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
            </span>
          </li>

          {/* Logout */}
          <li className={styles.navItem}>
            <button 
              onClick={() => signOut({ callbackUrl: '/' })} 
              className={`${styles.navLink} ${styles.logoutButton}`}
            >
              <span className={styles.navIcon}>
                <FaSignOutAlt />
              </span>
              <span className={styles.navLabel}>Logout</span>
            </button>
            <span className={styles.navTooltip}>Logout</span>
          </li>
        </ul>
      </nav>
    </aside>
  );
} 