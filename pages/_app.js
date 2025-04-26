// pages/_app.js
import '../styles/globals.css';
import '../styles/shared-messages/variables.css';
// PrimeReact CSS
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

import { SessionProvider } from 'next-auth/react';
import { LoadingProvider } from '../components/LoadingIndicator';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

// Lista de rotas comuns para prefetch
const commonRoutes = [
  '/',
  '/profile',
  '/registro',
  '/manager',
  '/dashboard-analyst',
  '/dashboard-super',
  '/dashboard-quality'
];

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  const router = useRouter();

  // Implementar prefetching para rotas comuns
  useEffect(() => {
    // Prefetch todas as rotas comuns exceto a atual
    commonRoutes.forEach(route => {
      if (router.pathname !== route) {
        router.prefetch(route);
      }
    });
  }, [router.pathname]);

  return (
    <SessionProvider session={session}>
      <LoadingProvider>
        <Component {...pageProps} />
      </LoadingProvider>
    </SessionProvider>
  );
}

export default MyApp;
