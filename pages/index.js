// pages/index.js
import Head from 'next/head';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import commonStyles from '../styles/commonStyles.module.css';
import styles from '../styles/Login.module.css';
import Footer from '../components/Footer';

export default function IndexPage({ session }) {
  const router = useRouter();

  // Se o usuário já está autenticado, redireciona para a página apropriada
  if (session) {
    if (session.role === 'analyst') {
      router.push('/dashboard-analyst');
    } else if (session.role === 'supervisor') {
      router.push('/dashboard-super');
    } else if (session.role === 'support') {
      router.push('/profile');
    }
  }

  return (
    <>
      <Head>
        <title>Olist Helper - Login</title>
      </Head>

      <div className={styles.container}>
        <div className={commonStyles.navbar}>
          <div className={commonStyles.logo}>
            <img src="/images/logos/olist_helper_logo.png" alt="Olist Helper Logo" />
          </div>
        </div>

        <div className={styles.mainContent}>
          <h1>Bem-vindo ao Olist Helper</h1>
          <p>Por favor, faça login para acessar suas informações.</p>
          <button
            className={styles.loginButton}
            onClick={() => signIn('auth0')}
          >
            Entrar com Auth0
          </button>
        </div>

        <Footer />
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (session) {
    // Se o usuário já está autenticado, redirecionar diretamente
    if (session.role === 'analyst') {
      return {
        redirect: {
          destination: '/dashboard-analyst',
          permanent: false,
        },
      };
    } else if (session.role === 'supervisor') {
      return {
        redirect: {
          destination: '/dashboard-super',
          permanent: false,
        },
      };
    } else if (session.role === 'support') {
      return {
        redirect: {
          destination: '/profile',
          permanent: false,
        },
      };
    }
  }

  return {
    props: { session },
  };
}
