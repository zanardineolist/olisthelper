// pages/index.js
import Head from 'next/head';
import { getSession, signIn } from 'next-auth/react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        if (session.role === 'analyst' || session.role === 'tax') {
          router.push('/profile-analyst');
        } else if (session.role === 'super') {
          router.push('/dashboard-super');
        } else if (session.role === 'dev') {
          router.push('/admin-notifications');
        } else {
          router.push('/profile');
        }
      }
    };
    checkSession();
  }, [router]);  

  // Recuperar tema do localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  return (
    <>
      <Head>
        <title>Olist Helper</title>
      </Head>

      <div className={styles.loginContainer}>
        <div className={styles.loginBox}>
          <div className={styles.logoContainer}>
            <Image
              src={theme === 'dark' ? '/images/logos/olist_helper_logo.png' : '/images/logos/olist_helper_dark_logo.png'}
              alt="Olist Helper Logo"
              width={270}
              height={75}
            />
          </div>
          <h1 className={styles.welcomeText}>Seja bem-vindo(a)</h1>
          <p className={styles.description}>
            O Olist Helper é uma ferramenta para ajudar você a registrar e gerenciar suas dúvidas tiradas com os analistas no dia a dia.
          </p>
          <button onClick={() => signIn('google')} className={styles.loginButton}>
            Login com Google
          </button>
          <p className={styles.description}>
            Acesse com seu e-mail <br />
            @tiny.com.br ou @olist.com
          </p>
        </div>
        <p className={styles.credits}>Desenvolvido por Rafael Zanardine</p>
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (session) {
    return {
      redirect: {
        destination: (session.role === 'analyst' || session.role === 'tax') ? '/profile-analyst' : session.role === 'super' ? '/dashboard-super' : session.role === 'dev' ? '/admin-notifications' : '/profile',
        permanent: false,
      },
    };
  }
  return {
    props: {},
  };
}
