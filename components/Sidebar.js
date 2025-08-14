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
  FaHandsHelping,
  FaFileAlt,
  FaDatabase,
  FaSearch,
  FaMapMarkerAlt,
  FaFileExcel,
  FaVideo,
  FaTag,
  FaExclamationTriangle
} from 'react-icons/fa';
import { FaComments } from 'react-icons/fa';
import { FaChevronDown } from 'react-icons/fa';

export default function Sidebar({ user, isCollapsed, setIsCollapsed, theme, toggleTheme }) {
  const [clickedLinks, setClickedLinks] = useState({});
  const [isMobileMenuActive, setIsMobileMenuActive] = useState(false);
  const [togglerTooltipStyle, setTogglerTooltipStyle] = useState({});
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [toolsMenuStyle, setToolsMenuStyle] = useState({});
  const router = useRouter();
  const sidebarRef = useRef(null);
  const togglerRef = useRef(null);
  const toolsButtonRef = useRef(null);

  // Resetar estado de clique quando a navegação for concluída
  useEffect(() => {
    const handleRouteComplete = () => {
      setClickedLinks({});
      setIsMobileMenuActive(false);
      setIsToolsOpen(false);
    };

    router.events.on('routeChangeComplete', handleRouteComplete);
    router.events.on('hashChangeComplete', handleRouteComplete);
    return () => {
      router.events.off('routeChangeComplete', handleRouteComplete);
      router.events.off('hashChangeComplete', handleRouteComplete);
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

  // Config das ferramentas (mesma origem do Tools)
  const ROLES_WITH_TICKET_ACCESS = ['support', 'analyst', 'super', 'tax'];
  const TOOLS_TABS = [
    { id: 'MyBase', label: 'Minha Base', icon: FaDatabase, hash: '#MyBase', requiresTicketAccess: false },
    { id: 'ErrosComuns', label: 'Base de Erros', icon: FaSearch, hash: '#ErrosComuns', requiresTicketAccess: false },
    { id: 'Ocorrencias', label: 'Ocorrências', icon: FaExclamationTriangle, hash: '#Ocorrencias', requiresTicketAccess: false },
    { id: 'TicketCounter', label: 'Contador de Chamados', icon: FaChartLine, hash: '#TicketCounter', requiresTicketAccess: true },
    { id: 'TicketLogger', label: 'Registro de Chamados', icon: FaChartLine, hash: '#TicketLogger', requiresTicketAccess: true },
    { id: 'SharedMessages', label: 'Respostas Compartilhadas', icon: FaComments, hash: '#SharedMessages', requiresTicketAccess: false },
    { id: 'BibliotecaVideos', label: 'Biblioteca de Vídeos', icon: FaVideo, hash: '#BibliotecaVideos', requiresTicketAccess: false },
    { id: 'CepIbgeValidator', label: 'Validador CEP', icon: FaMapMarkerAlt, hash: '#CepIbgeValidator', requiresTicketAccess: false },
    { id: 'SheetSplitter', label: 'Divisor de Planilhas', icon: FaFileExcel, hash: '#SheetSplitter', requiresTicketAccess: false },
    { id: 'ValidadorML', label: 'Validador ML', icon: FaTag, hash: '#ValidadorML', requiresTicketAccess: false }
  ];

  const hasTicketCounterAccess = user?.role ? ROLES_WITH_TICKET_ACCESS.includes(user.role) : false;
  const availableToolsTabs = TOOLS_TABS.filter(tab => !tab.requiresTicketAccess || hasTicketCounterAccess);

  const ToolsMenu = () => {
    const isToolsActive = router.pathname === '/tools';
    return (
      <li className={`${styles.navItem} ${isToolsOpen ? styles.open : ''}`} onMouseLeave={() => setIsToolsOpen(false)}>
        <button 
          className={`${styles.navLink} ${isToolsActive ? styles.active : ''}`}
          ref={toolsButtonRef}
          onClick={() => {
            const next = !isToolsOpen;
            setIsToolsOpen(next);
            if (next) {
              if (isCollapsed && toolsButtonRef.current) {
                const rect = toolsButtonRef.current.getBoundingClientRect();
                setToolsMenuStyle({
                  position: 'fixed',
                  top: `${rect.top}px`,
                  left: `${rect.right + 12}px`,
                  maxHeight: '70vh',
                  overflowY: 'auto',
                  overflowX: 'hidden'
                });
              } else {
                setToolsMenuStyle({});
              }
            }
          }}
          aria-expanded={isToolsOpen}
          aria-haspopup="true"
        >
          <span className={styles.navIcon}><FaTools /></span>
          <span className={styles.navLabel}>Ferramentas</span>
          <span className={styles.dropdownArrow}><FaChevronDown /></span>
        </button>
        <span className={styles.navTooltip}>Ferramentas</span>
        {isToolsOpen && (
          <ul className={`${styles.submenu} ${isCollapsed ? styles.submenuOpen : ''}`} role="menu" style={toolsMenuStyle}
              onMouseEnter={() => setIsToolsOpen(true)}
              onMouseLeave={() => setIsToolsOpen(false)}
          >
            {availableToolsTabs.map((tab) => {
              const asPath = router.asPath || '';
              const hashIndex = asPath.indexOf('#');
              const currentHash = hashIndex >= 0 ? asPath.substring(hashIndex) : '';
              const isActiveTool = isToolsActive && currentHash === tab.hash;
              return (
                <li key={tab.id} className={styles.submenuItem} role="none">
                  <Link 
                    href={`/tools${tab.hash}`}
                    className={`${styles.submenuLink} ${isActiveTool ? styles.active : ''}`}
                    role="menuitem"
                    onClick={() => setIsToolsOpen(false)}
                  >
                    <span className={styles.navIcon}><tab.icon /></span>
                    <span className={styles.navLabel}>{tab.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
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
          { href: '/tools', icon: FaTools, label: 'Ferramentas', tooltip: 'Ferramentas' }
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

    // Menu de Registrar Ajuda entre Agentes (SISTEMA MODULAR)
    if (user.can_register_help === true) {
      addMenuItemIfNotExists({
        href: '/registrar-ajuda',
        icon: FaHandsHelping,
        label: 'Registrar Ajuda',
        tooltip: 'Registrar Ajuda entre Agentes'
      });
    }

    // Menu de Admin Notificações (para admins)
    if (user.admin === true) {
      addMenuItemIfNotExists({
        href: '/admin-notifications',
        icon: FaBell,
        label: 'Admin Notificações',
        tooltip: 'Gerenciar Notificações'
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
          {menuItems.primary.map((item, index) => {
            if (item.href === '/tools') {
              return <ToolsMenu key={`tools-menu-${index}`} />;
            }
            return (
              <NavLink
                key={index}
                href={item.href}
                icon={item.icon}
                label={item.label}
                tooltip={item.tooltip}
              />
            );
          })}
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

          {/* Patch Notes */}
          <li className={styles.navItem}>
            <Link 
              href="/patch-notes" 
              className={`${styles.navLink} ${router.pathname === '/patch-notes' ? styles.active : ''}`}
              onMouseEnter={(e) => {
                if (isCollapsed) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  // Atualiza tooltip para patch notes especificamente
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
                <FaFileAlt />
              </span>
              <span className={styles.navLabel}>Patch Notes</span>
            </Link>
            <span className={styles.navTooltip}>Atualizações do Sistema</span>
          </li>
        </ul>
      </nav>
    </aside>
  );
}