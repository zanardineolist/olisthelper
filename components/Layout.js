// components/Layout.js
import Navbar from './Navbar';
import styles from '../styles/Layout.module.css';
import { useSession } from 'next-auth/react';

export default function Layout({ children }) {
  const hasBanner = true;
  const { data: session } = useSession();
  const user = session?.user || {};

  return (
    <div className={`${styles.layout} ${hasBanner ? styles.withBanner : ''}`}>
      <Navbar user={user} />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}