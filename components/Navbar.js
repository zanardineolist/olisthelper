import Link from 'next/link';
import styles from '../styles/Navbar.module.css';
import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const sessionData = useSession(); // Pega todo o objeto de retorno do useSession()

  if (!sessionData || typeof sessionData !== 'object' || !sessionData.data) {
    return null; // Não renderiza nada se sessionData for indefinido ou se não tiver a estrutura esperada
  }

  const { data: session, status } = sessionData;

  // Caso o status seja "loading", não renderizar o menu até que a sessão seja conhecida
  if (status === 'loading') {
    return null; // Ou pode exibir um placeholder de carregamento, dependendo do que desejar
  }

  // Se não estiver autenticado, não renderizar a barra de navegação
  if (status !== 'authenticated' || !session?.user) {
    return null;
  }

  // Corrigindo acesso ao role do usuário
  const userRole = session.role;

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
