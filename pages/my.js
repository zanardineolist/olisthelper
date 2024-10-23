import { getSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState } from 'react';
import styles from '../styles/MyPage.module.css';

export default function MyPage({ user }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNavigation = (path) => {
    router.push(path);
  };

  return (
    <div className={styles.container}>
      <nav className={styles.navbar}>
        <div className={styles.logo}>Olist Helper</div>
        <button onClick={() => setMenuOpen(!menuOpen)} className={styles.menuToggle}>
          ☰
        </button>
      </nav>
      {menuOpen && (
        <div className={styles.menu}>
          <button onClick={() => handleNavigation('/my')} className={styles.menuButton}>
            Página Inicial
          </button>
          <button onClick={() => handleNavigation('/registrar')} className={styles.menuButton}>
            Registrar Dúvida
          </button>
          {user.role === 'analyst' && (
            <button onClick={() => handleNavigation('/dashboard-analyst')} className={styles.menuButton}>
              Dashboard do Analista
            </button>
          )}
          <button onClick={() => signOut()} className={styles.menuButton}>
            Logout
          </button>
        </div>
      )}
      <main className={styles.main}>
        <h1>Bem-vindo, {user.name}!</h1>
      </main>
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }
  return {
    props: {
      user: {
        ...session.user,
        role: session.role,
      },
    },
  };
}
