import Head from 'next/head';
import { getSession, signIn } from 'next-auth/react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [theme, setTheme] = useState('dark');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  useEffect(() => {
    async function checkAuthentication() {
      try {
        const session = await getSession();
        if (session?.user) {
          console.log('[AUTH] Sessão existente encontrada:', session.role);
          
          // Redirecionar baseado no role
          switch (session.role) {
            case 'analyst':
            case 'tax':
              router.replace('/profile-analyst');
              break;
            case 'super':
              router.replace('/dashboard-super');
              break;
            case 'dev':
              router.replace('/admin-notifications');
              break;
            default:
              router.replace('/profile');
          }
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[AUTH] Erro ao verificar sessão:', error);
        setIsLoading(false);
      }
    }

    checkAuthentication();
  }, [router]);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      await signIn('google', { callbackUrl: '/' });
    } catch (error) {
      console.error('[AUTH] Erro no login:', error);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loaderOverlay">
        <div className="loader"></div>
      </div>
    );
  }

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
              priority
            />
          </div>
          <h1 className={styles.welcomeText}>Seja bem-vindo(a)</h1>
          <p className={styles.description}>
            O Olist Helper é uma ferramenta para ajudar você a registrar e gerenciar suas dúvidas tiradas com os analistas no dia a dia.
          </p>
          <button 
            onClick={handleLogin} 
            className={styles.loginButton}
            disabled={isLoading}
          >
            {isLoading ? 'Carregando...' : 'Login com Google'}
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

// Server-side props para verificação inicial de autenticação
export async function getServerSideProps(context) {
  const session = await getSession(context);
  
  if (session) {
    const destination = (() => {
      switch (session.role) {
        case 'analyst':
        case 'tax':
          return '/profile-analyst';
        case 'super':
          return '/dashboard-super';
        case 'dev':
          return '/admin-notifications';
        default:
          return '/profile';
      }
    })();

    return {
      redirect: {
        destination,
        permanent: false,
      }
    };
  }

  return {
    props: {}
  };
}