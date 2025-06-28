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
  FaSun,
  FaChartLine,
  FaHandsHelping
} from 'react-icons/fa';

export default function Sidebar({ user, isCollapsed, setIsCollapsed, theme, toggleTheme }) {
  const [clickedLinks, setClickedLinks] = useState({});
  const [isMobileMenuActive, setIsMobileMenuActive] = useState(false);
  const [togglerTooltipStyle, setTogglerTooltipStyle] = useState({});
  const router = useRouter();
  const sidebarRef = useRef(null);
  const togglerRef = useRef(null);

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

  // Handle toggler tooltip positioning
  const handleTogglerMouseEnter = () => {
    if (togglerRef.current) {
      const rect = togglerRef.current.getBoundingClientRect();
      setTogglerTooltipStyle({
        position: 'fixed',
        top: `${rect.top + rect.height / 2}px`,
        left: `${rect.right + 12}px`,
        transform: 'translateY(-50%)'
      });
    }
  };

  // Componente NavLink personalizado
  const NavLink = ({ href, icon: Icon, label, tooltip }) => {
    const isActive = router.pathname === href;
    const isClicked = clickedLinks[href];
    const [tooltipStyle, setTooltipStyle] = useState({});
    
    const handleMouseEnter = (e) => {
      if (isCollapsed) {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltipStyle({
          position: 'fixed',
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.right + 12}px`,
          transform: 'translateY(-50%)'
        });
      }
    };
    
    return (
      <li className={styles.navItem}>
        <Link 
          href={href} 
          className={`${styles.navLink} ${isActive ? styles.active : ''} ${isClicked ? styles.clicked : ''}`}
          onClick={(e) => handleNavLinkClick(e, href)}
          onMouseEnter={handleMouseEnter}
          tabIndex={isClicked ? -1 : 0}
          aria-disabled={isClicked}
        >
          <span className={styles.navIcon}>
            {isClicked ? <FaSpinner className={styles.spinnerIcon} /> : <Icon />}
          </span>
          <span className={styles.navLabel}>{label}</span>
        </Link>
        <span 
          className={styles.navTooltip} 
          style={isCollapsed ? tooltipStyle : {}}
        >
          {tooltip}
        </span>
      </li>
    );
  };

  // Obter opções de menu baseadas no role do usuário
  const getMenuItems = () => {
    const menuItems = {
      primary: [],
      secondary: []
    };

    // Verificação defensiva dos dados do usuário
    if (!user || !user.role) {
      console.warn('Dados do usuário incompletos no Sidebar:', user);
      return menuItems;
    }

    // DEFINIR MENUS BASE POR ROLE (sem duplicatas)
    switch (user.role.toLowerCase()) {
      case 'support':
        menuItems.primary = [
          { href: '/profile', icon: FaUser, label: 'Meu Perfil', tooltip: 'Meu Perfil' },
          { href: '/tools', icon: FaTools, label: 'Ferramentas', tooltip: 'Ferramentas' }
        ];
        break;

      case 'analyst':
      case 'tax':
        menuItems.primary = [
          { href: '/profile-analyst', icon: FaUser, label: 'Meu Perfil', tooltip: 'Meu Perfil' },
          { href: '/registro', icon: FaClipboardList, label: 'Registrar Ajuda', tooltip: 'Registrar Ajuda' },
          { href: '/dashboard-analyst', icon: FaTachometerAlt, label: 'Dashboard', tooltip: 'Dashboard' },
          { href: '/tools', icon: FaTools, label: 'Ferramentas', tooltip: 'Ferramentas' },
          { href: '/manager', icon: FaCogs, label: 'Gerenciador', tooltip: 'Gerenciador' }
        ];
        break;

      case 'super':
        menuItems.primary = [
          { href: '/dashboard-super', icon: FaTachometerAlt, label: 'Dashboard', tooltip: 'Dashboard' },
          { href: '/tools', icon: FaTools, label: 'Ferramentas', tooltip: 'Ferramentas' },
          { href: '/manager', icon: FaCogs, label: 'Gerenciador', tooltip: 'Gerenciador' }
        ];
        break;

      case 'quality':
        menuItems.primary = [
          { href: '/dashboard-quality', icon: FaTachometerAlt, label: 'Dashboard Qualidade', tooltip: 'Dashboard Qualidade' },
          { href: '/tools', icon: FaTools, label: 'Ferramentas', tooltip: 'Ferramentas' }
        ];
        break;

      case 'dev':
        menuItems.primary = [
          { href: '/admin-notifications', icon: FaBell, label: 'Admin Notificações', tooltip: 'Admin Notificações' }
        ];
        break;

      default:
        // Fallback para roles desconhecidos
        menuItems.primary = [
          { href: '/profile', icon: FaUser, label: 'Meu Perfil', tooltip: 'Meu Perfil' },
          { href: '/tools', icon: FaTools, label: 'Ferramentas', tooltip: 'Ferramentas' }
        ];
        console.warn('Role desconhecido no Sidebar:', user.role);
        break;
    }

    // ADICIONAR PERMISSÕES MODULARES (sem duplicatas)
    const addMenuItemIfNotExists = (menuItem) => {
      if (!menuItems.primary.some(item => item.href === menuItem.href)) {
        menuItems.primary.push(menuItem);
      }
    };

    // Menu de Acesso Remoto (SISTEMA MODULAR)
    if (user.can_remote_access === true) {
      addMenuItemIfNotExists({
        href: '/remote',
        icon: FaDesktop,
        label: 'Acesso Remoto',
        tooltip: 'Acesso Remoto'
      });
    }

    // Menu de Registrar Ajudas (FUTURO - quando implementado)
    if (user.can_register_help === true) {
      addMenuItemIfNotExists({
        href: '/register-help',
        icon: FaHandsHelping,
        label: 'Registrar Ajudas',
        tooltip: 'Registrar Ajudas'
      });
    }

    // Menu de Analytics (para admins)
    if (user.admin === true) {
      // Inserir Analytics após Gerenciador se existir, ou no final
      const managerIndex = menuItems.primary.findIndex(item => item.href === '/manager');
      const analyticsMenu = {
        href: '/analytics',
        icon: FaChartLine,
        label: 'Analytics',
        tooltip: 'Analytics & Métricas'
      };

      if (managerIndex !== -1) {
        // Inserir após o Gerenciador
        if (!menuItems.primary.some(item => item.href === '/analytics')) {
          menuItems.primary.splice(managerIndex + 1, 0, analyticsMenu);
        }
      } else {
        // Adicionar no final se não há Gerenciador
        addMenuItemIfNotExists(analyticsMenu);
      }
    }

    // DEBUG: Log para desenvolvimento (remover em produção)
    if (process.env.NODE_ENV === 'development') {
      console.log('Sidebar - Dados do usuário:', {
        role: user.role,
        can_remote_access: user.can_remote_access,
        can_register_help: user.can_register_help,
        admin: user.admin,
        menus_gerados: menuItems.primary.length
      });
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
          ref={togglerRef}
          className={`${styles.toggler} ${styles.sidebarToggler}`}
          onClick={toggleSidebar}
          onMouseEnter={handleTogglerMouseEnter}
          aria-label={isCollapsed ? "Expandir Sidebar" : "Recolher Sidebar"}
        >
          <FaChevronLeft />
        </button>
        <span 
          className={styles.togglerTooltip}
          style={togglerTooltipStyle}
        >
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
          {/* Secondary Menu Items (Admin features) */}
          {menuItems.secondary.map((item, index) => (
            <NavLink
              key={index}
              href={item.href}
              icon={item.icon}
              label={item.label}
              tooltip={item.tooltip}
            />
          ))}
          
          {/* Theme Toggle */}
          <li className={styles.navItem}>
            <button 
              onClick={toggleTheme} 
              className={`${styles.navLink} ${styles.themeToggle}`}
              onMouseEnter={(e) => {
                if (isCollapsed) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  // Atualiza tooltip para theme toggle especificamente
                  const tooltipEl = e.currentTarget.nextElementSibling;
                  if (tooltipEl) {
                    tooltipEl.style.position = 'fixed';
                    tooltipEl.style.top = `${rect.top + rect.height / 2}px`;
                    tooltipEl.style.left = `${rect.right + 12}px`;
                    tooltipEl.style.transform = 'translateY(-50%)';
                  }
                }
              }}
              aria-label="Alternar tema"
            >
              <span className={styles.themeToggleContainer}>
                <span className={styles.themeToggleTrack}>
                  <span className={`${styles.themeToggleThumb} ${theme === 'dark' ? styles.dark : ''}`}>
                    {theme === 'dark' ? <FaMoon className={styles.moonIcon} /> : <FaSun className={styles.sunIcon} />}
                  </span>
                </span>
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
              onMouseEnter={(e) => {
                if (isCollapsed) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  // Atualiza tooltip para logout especificamente
                  const tooltipEl = e.currentTarget.nextElementSibling;
                  if (tooltipEl) {
                    tooltipEl.style.position = 'fixed';
                    tooltipEl.style.top = `${rect.top + rect.height / 2}px`;
                    tooltipEl.style.left = `${rect.right + 12}px`;
                    tooltipEl.style.transform = 'translateY(-50%)';
                  }
                }
              }}
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