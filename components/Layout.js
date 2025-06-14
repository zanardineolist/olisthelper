// components/Layout.js
import { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import Footer from './Footer';
import styles from '../styles/Layout.module.css';

export default function Layout({ children, user }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className={styles.layoutContainer}>
      <Sidebar 
        user={user} 
        isCollapsed={isSidebarCollapsed} 
        setIsCollapsed={setIsSidebarCollapsed} 
      />
      <div className={`${styles.mainContent} ${isSidebarCollapsed ? styles.sidebarCollapsed : styles.sidebarExpanded}`}>
        <Navbar 
          user={user} 
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