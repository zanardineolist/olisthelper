// components/Layout.js
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import Footer from './Footer';
import styles from '../styles/Layout.module.css';
import { normalizeUserData, validateUserDataForSidebar, useUserDataMonitor } from '../utils/userDataHelpers';

export default function Layout({ children, user }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [validatedUser, setValidatedUser] = useState(null);

  // Monitor dados do usuário em desenvolvimento
  useUserDataMonitor(user, 'Layout');

  // Validar e normalizar dados do usuário
  useEffect(() => {
    const validation = validateUserDataForSidebar(user);
    
    if (process.env.NODE_ENV === 'development' && !validation.isValid) {
      console.warn('🚨 Layout: Dados de usuário inconsistentes detectados:', {
        issues: validation.issues,
        originalData: user,
        normalizedData: validation.normalizedData
      });
    }
    
    // Sempre usar dados normalizados para garantir consistência
    setValidatedUser(validation.normalizedData);
  }, [user]);

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

  // Garantir que não renderize até ter dados válidos
  if (!validatedUser) {
    return (
      <div className={styles.layoutContainer}>
        <div className={styles.loadingState}>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layoutContainer}>
      <Sidebar 
        user={validatedUser} 
        isCollapsed={isSidebarCollapsed} 
        setIsCollapsed={setIsSidebarCollapsed}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <div className={`${styles.mainContent} ${isSidebarCollapsed ? styles.sidebarCollapsed : styles.sidebarExpanded}`}>
        <Navbar 
          user={validatedUser} 
          isSidebarCollapsed={isSidebarCollapsed} 
        />
        <main className={styles.content}>
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}