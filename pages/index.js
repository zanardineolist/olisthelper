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
              <h1 className={styles.logoText}>olist</h1>
            </div>
            <h2 className={styles.accessTitle}>acesse sua conta</h2>
            
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>usuário</label>
              <div className={styles.inputContainer}>
                <svg className={styles.inputIcon} width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="#9CA3AF"/>
                  <path d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" fill="#9CA3AF"/>
                </svg>
                <input 
                  type="email" 
                  placeholder="email@email.com"
                  className={styles.emailInput}
                  disabled
                />
              </div>
            </div>
            
            <button onClick={() => signIn('google')} className={styles.loginButton}>
              Avançar
            </button>
          </div>
          
          <div className={styles.rightSection}>
            <h1 className={styles.welcomeTitle}>Que bom ter você aqui!</h1>
            <p className={styles.welcomeDescription}>
              Entre com seus dados para acessar a Olist, um ecossistema que 
              transforma negócios em gigantes do e-commerce.
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
