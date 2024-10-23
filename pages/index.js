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
            width={150}
            height={150}
            onError={(e) => (e.target.style.display = 'none')}
          />
        </div>
        <h2 className={styles.loginTitle}>Login</h2>
        <button onClick={() => signIn('google')} className={styles.loginButton}>
          Login com Google
        </button>
      </div>
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
