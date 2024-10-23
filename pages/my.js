import { getSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState } from 'react';
import commonStyles from '../styles/commonStyles.module.css';
import styles from '../styles/MyPage.module.css';

export default function MyPage({ user }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNavigation = (path) => {
    router.push(path);
  };

  if (loading) {
    return (
      <div className="loaderOverlay">
        <div className="loader"></div>
      </div>
    );
  }  

  return (
    <>
      <div className={styles.container}>
        <nav className={commonStyles.navbar}>
          <div className={styles.logo}>
            <img src="/images/logos/olist_helper_logo.png" alt="Olist Helper Logo" />
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className={commonStyles.menuToggle}>
            ☰
          </button>
        </nav>
        {menuOpen && (
          <div className={commonStyles.menu}>
            <button onClick={() => handleNavigation('/my')} className={commonStyles.menuButton}>
              Página Inicial
            </button>
            <button onClick={() => handleNavigation('/registrar')} className={commonStyles.menuButton}>
              Registrar Dúvida
            </button>
            {user.role === 'analyst' && (
              <button onClick={() => handleNavigation('/dashboard-analyst')} className={commonStyles.menuButton}>
                Dashboard do Analista
              </button>
            )}
            <button onClick={() => signOut()} className={commonStyles.menuButton}>
              Logout
            </button>
          </div>
        )}
      </div>
      
      <div className={styles.profileContainer}>
        <img src={user.image} alt={user.name} className={styles.profileImage} />
        <div className={styles.profileInfo}>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
        </div>
      </div>

      <main className={styles.main}>
        <h1>Bem-vindo, {user.name}!</h1>
      </main>
    </>
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
