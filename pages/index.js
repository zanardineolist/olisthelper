// pages/index.js
import Head from 'next/head';
import { getSession, signIn } from 'next-auth/react';
import Image from 'next/image';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Login.module.css';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        if (session.role === 'analyst' || session.role === 'tax') {
          router.push('/profile-analyst');
        } else if (session.role === 'super') {
          router.push('/dashboard-super');
        } else if (session.role === 'quality') {
          router.push('/dashboard-quality');
        } else if (session.role === 'dev') {
          router.push('/admin-notifications');
        } else {
          router.push('/profile');
        }
      }
    };
    checkSession();
  }, [router]);

  return (
    <>
      <Head>
        <title>Olist Helper - Acesse sua conta</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div className={styles.loginContainer}>
        <main className={styles.loginCard}>
          <aside className={styles.leftSection}>
            <header className={styles.logoContainer}>
              <Image
                src="/images/logos/olist_helper_blue_logo.png"
                alt="Olist Helper Logo"
                width={200}
                height={55}
              />
            </header>
            <h3 className={styles.accessTitle}>acesse sua conta</h3>
            
            <button onClick={() => signIn('google')} className={styles.loginButton}>
              Acessar
            </button>
          </aside>
          
          <aside className={styles.rightSection}>
            <h2 className={styles.welcomeTitle}>Que bom ter você aqui!</h2>
            <p className={styles.welcomeDescription}>
              Entre com sua conta google para acessar o Olist Helper, uma ferramenta que transforma seu dia a dia.
            </p>
          </aside>
        </main>
        
        <footer className={styles.footer}>
          <p className={styles.credits}>Desenvolvido por Rafael Zanardine</p>
        </footer>
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (session) {
    let destination = '/profile';
    
    if (session.role === 'analyst' || session.role === 'tax') {
      destination = '/profile-analyst';
    } else if (session.role === 'super') {
      destination = '/dashboard-super';
    } else if (session.role === 'quality') {
      destination = '/dashboard-quality';
    } else if (session.role === 'dev') {
      destination = '/admin-notifications';
    }
    
    return {
      redirect: {
        destination,
        permanent: false,
      },
    };
  }
  return {
    props: {},
  };
}
