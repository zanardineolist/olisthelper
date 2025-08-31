// pages/_app.js
import '../styles/globals.css';
import 'sweetalert2/dist/sweetalert2.min.css';
import '../styles/swal-overrides.css';
import '../styles/shared-messages/variables.css';
import { SessionProvider, useSession } from 'next-auth/react';
import ToastProvider from '../components/ToastProvider';
import { LoadingProvider } from '../components/LoadingIndicator';
import { NotificationProvider } from '../contexts/NotificationContext';
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
        <NotificationProvider>
          <ToastProvider position="top-right">
            <Component {...pageProps} />
          </ToastProvider>
        </NotificationProvider>
      </LoadingProvider>
    </SessionProvider>
  );
}

export default MyApp;
