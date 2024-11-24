// components/Layout.js
import Navbar from './Navbar';
import styles from '../styles/Layout.module.css';
import { useState, useEffect } from 'react';

export default function Layout({ children }) {
  const [hasBanner, setHasBanner] = useState(false);

  useEffect(() => {
    const bannerElement = document.querySelector('.notificationBanner');
    setHasBanner(!!bannerElement);
  }, []);

  return (
    <div className={`${styles.layout} ${hasBanner ? styles.withBanner : ''}`}>
      <Navbar hasBanner={hasBanner} />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
