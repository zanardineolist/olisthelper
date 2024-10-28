// components/Navbar.js
import Link from 'next/link';
import styles from '../styles/Navbar.module.css';
import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session } = useSession();
  const [isAnalyst, setIsAnalyst] = useState(false);

  useEffect(() => {
    if (session?.user?.role === 'analyst') {
      setIsAnalyst(true);
    }
  }, [session]);

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>
        <Link href={isAnalyst ? "/profile-analyst" : "/profile"}>Olist Helper</Link>
      </div>
      <button onClick={() => setMenuOpen(!menuOpen)} className={styles.menuToggle}>
        ☰
      </button>
      {menuOpen && (
        <div className={styles.menu}>
          <Link href="/profile" className={styles.menuButton}>
            Meu Perfil
          </Link>
          {isAnalyst && (
            <Link href="/profile-analyst" className={styles.menuButton}>
              Meu Perfil
            </Link>
          )}
          <Link href="/registrar" className={styles.menuButton}>
            Registrar Dúvida
          </Link>
          {isAnalyst && (
            <>
              <Link href="/registro" className={styles.menuButton}>
                Registrar Ajuda
              </Link>
              <Link href="/dashboard-analyst" className={styles.menuButton}>
                Dashboard Analista
              </Link>
              <a
                href="https://docs.google.com/spreadsheets/d/1U6M-un3ozKnQXa2LZEzGIYibYBXRuoWBDkiEaMBrU34/edit?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.menuButton}
              >
                Database
              </a>
            </>
          )}
          <button onClick={() => signOut()} className={styles.menuButton}>
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}