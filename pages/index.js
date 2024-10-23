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
        router.push('/my');
      }
    };
    checkSession();
  }, [router]);

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginBox}>
        <div className={styles.logoContainer}>
          <Image
            src="/images/logos/olist_helper_logo.png"
            alt="Olist Helper Logo"
            width={270}
            height={75}
            onError={(e) => (e.target.style.display = 'none')}
          />
        </div>
        <h1 className={styles.welcomeText}>Bem-vindo ao Olist Helper</h1>
        <p className={styles.description}>
          O Olist Helper é uma ferramenta para ajudar você a gerenciar dúvidas e acompanhar o progresso do seu time com facilidade.
        </p>
        <h2 className={styles.loginTitle}>Login</h2>
        <button onClick={() => signIn('google')} className={styles.loginButton}>
          Login com Google
        </button>
      </div>
      <p className={styles.credits}>Desenvolvido por Rafael Zanardine</p>
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (session) {
    return {
      redirect: {
        destination: '/my',
        permanent: false,
      },
    };
  }
  return {
    props: {},
  };
}
