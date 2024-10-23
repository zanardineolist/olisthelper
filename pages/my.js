import Head from 'next/head';
import { getSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import commonStyles from '../styles/commonStyles.module.css';
import styles from '../styles/MyPage.module.css';

export default function MyPage({ user }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const currentHour = new Date().getHours();
    let greetingMessage = '';

    if (currentHour >= 5 && currentHour < 12) {
      greetingMessage = 'Bom dia';
    } else if (currentHour >= 12 && currentHour < 18) {
      greetingMessage = 'Boa tarde';
    } else {
      greetingMessage = 'Boa noite';
    }

    setGreeting(greetingMessage);
  }, []);

  const handleNavigation = (path) => {
    router.push(path);
  };

  if (!user) {
    return (
      <div className="loaderOverlay">
        <div className="loader"></div>
      </div>
    );
  }  

  return (
    <>
      <Head>
        <title>Meus Dados</title>
      </Head>

      <div className={styles.container}>
      <nav className={commonStyles.navbar}>
        <div className={commonStyles.logo}>
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
            <>
              <button onClick={() => handleNavigation('/dashboard-analyst')} className={commonStyles.menuButton}>
                Dashboard Analista
              </button>
              <a
                href="https://docs.google.com/spreadsheets/d/1U6M-un3ozKnQXa2LZEzGIYibYBXRuoWBDkiEaMBrU34/edit?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className={commonStyles.menuButton}
              >
                Database
              </a>
            </>
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
        <h1>Olá, {greeting} {user.name}!</h1>
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