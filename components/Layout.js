// components/Layout.js
import Navbar from './Navbar';
import styles from '../styles/Layout.module.css';
import { useState, useEffect } from 'react';

export default function Layout({ children }) {
  const [hasBanner, setHasBanner] = useState(false);

  useEffect(() => {
    // Atualiza o estado para saber se o banner está ativo
    const bannerElement = document.querySelector('.notificationBanner');
    setHasBanner(!!bannerElement);
  }, [hasBanner]);

  return (
    <div className={`${styles.layout} ${hasBanner ? 'hasBanner' : ''}`}>
      <Navbar />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
