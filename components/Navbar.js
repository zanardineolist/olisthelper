// components/Navbar.js
import Link from 'next/link';
import styles from '../styles/Navbar.module.css';
import { useState } from 'react';
import { signOut } from 'next-auth/react';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>
        <Link href="/my">Olist Helper</Link>
      </div>
      <button onClick={() => setMenuOpen(!menuOpen)} className={styles.menuToggle}>
        ☰
      </button>
      {menuOpen && (
        <div className={styles.menu}>
          <Link href="/my" className={styles.menuButton}>
            Página Inicial
          </Link>
          <Link href="/registrar" className={styles.menuButton}>
            Registrar Dúvida
          </Link>
          <Link href="/dashboard-analyst" className={styles.menuButton}>
            Dashboard do Analista
          </Link>
          <button onClick={() => signOut()} className={styles.menuButton}>
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
