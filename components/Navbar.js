import Link from 'next/link';
import styles from '../styles/Navbar.module.css';
import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const sessionData = useSession(); // Recebe o objeto completo do useSession

  useEffect(() => {
    if (sessionData.status === 'loading') {
      // Se a sessão estiver carregando, não fazer nada
      return;
    }

    if (sessionData.status === 'authenticated') {
      // Se a sessão está autenticada, definir o papel do usuário
      setUserRole(sessionData.data?.user?.role || null);
    }
  }, [sessionData]);

  // Caso o status seja "loading", não renderizar o menu até que a sessão seja conhecida
  if (sessionData.status === 'loading') {
    return null; // Exibir um estado de carregamento ou nada enquanto carrega
  }

  // Se não estiver autenticado, exibir uma mensagem ou um link para login
  if (sessionData.status !== 'authenticated') {
    return null; // Ou qualquer outro conteúdo que faça sentido para usuários não autenticados
  }

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
          {(userRole === 'analyst' || userRole === 'tax') && (
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
          {(userRole === 'analyst' || userRole === 'super' || userRole === 'tax') && (
            <Link href="/manage-users" className={styles.menuButton}>
              Gerenciar Usuários
            </Link>
          )}
          <button onClick={() => signOut()} className={styles.menuButton}>
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
