// components/Layout.js
import Navbar from './Navbar';
import styles from '../styles/Layout.module.css';

export default function Layout({ children }) {
  const hasBanner = true;

  return (
    <div className={`${styles.layout} ${hasBanner ? styles.withBanner : ''}`}>
      <Navbar />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}