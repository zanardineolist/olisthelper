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
        <title>Olist Helper</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <div className={styles.leftSection}>
            <div className={styles.logoContainer}>
              <Image
                src="/images/logos/olist_helper_blue_logo.png"
                alt="Olist Helper Logo"
                width={200}
                height={55}
              />
            </div>
            <h2 className={styles.accessTitle}>acesse sua conta</h2>
            
            <button onClick={() => signIn('google')} className={styles.loginButton}>
              Acessar
            </button>
          </div>
          
          <div className={styles.rightSection}>
            <h1 className={styles.welcomeTitle}>Que bom ter você aqui!</h1>
            <p className={styles.welcomeDescription}>
              Entre com sua conta google para acessar o Olist Helper, uma ferramenta que transforma seu dia a dia.
            </p>
          </div>
        </div>
        
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
