// components/Navbar.js
import Link from 'next/link';
import styles from '../styles/Navbar.module.css';
import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session } = useSession();
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    if (session?.user?.role) {
      setUserRole(session.user.role);
    }
  }, [session]);

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>
        <Link href={userRole === 'analyst' ? "/profile-analyst" : "/profile"}>Olist Helper</Link>
      </div>
      <button onClick={() => setMenuOpen(!menuOpen)} className={styles.menuToggle}>
        ☰
      </button>
      {menuOpen && (
        <div className={styles.menu}>
          <Link href="/profile" className={styles.menuButton}>
            Meu Perfil
          </Link>
          {userRole === 'analyst' && (
            <>
              <Link href="/profile-analyst" className={styles.menuButton}>
                Meu Perfil Analista
              </Link>
              <Link href="/registro" className={styles.menuButton}>
                Registrar Ajuda
              </Link>
              <Link href="/dashboard-analyst" className={styles.menuButton}>
                Dashboard Analista
              </Link>
            </>
          )}
          {userRole === 'super' && (
            <>
              <Link href="/dashboard-super" className={styles.menuButton}>
                Dashboard Super
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
