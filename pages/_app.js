// pages/_app.js
import '../styles/globals.css';
import '../styles/shared-messages/variables.css';
import { SessionProvider, useSession } from 'next-auth/react';
import { LoadingProvider } from '../components/LoadingIndicator';
import { NotificationProvider } from '../contexts/NotificationContext';
import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';

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

// Componente de tracking interno moderno com coleta em batch
function TrackingWrapper({ children }) {
  const { data: session } = useSession();
  const router = useRouter();
  const analyticsCollectorRef = useRef(null);

  // Inicializar o collector de analytics
  useEffect(() => {
    if (session?.id && !analyticsCollectorRef.current) {
      // Importação dinâmica para evitar SSR issues
      import('../utils/analytics/AnalyticsCollector').then(({ getAnalyticsCollector }) => {
        analyticsCollectorRef.current = getAnalyticsCollector();
        
        // Registrar primeira visita
        analyticsCollectorRef.current.trackPageVisit(
          router.asPath, 
          document.title, 
          document.referrer
        );
      });
    }
  }, [session, router.asPath]);

  // Tracking de mudança de página
  useEffect(() => {
    if (!session?.id || !analyticsCollectorRef.current) return;

    const handleRouteChangeComplete = (url) => {
      analyticsCollectorRef.current.trackPageVisit(
        url, 
        document.title, 
        document.referrer
      );
    };

    router.events.on('routeChangeComplete', handleRouteChangeComplete);

    // Cleanup
    return () => {
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, [session, router]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (analyticsCollectorRef.current) {
        analyticsCollectorRef.current.reset();
        analyticsCollectorRef.current = null;
      }
    };
  }, []);

  return children;
}

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
          <TrackingWrapper>
            <Component {...pageProps} />
          </TrackingWrapper>
        </NotificationProvider>
      </LoadingProvider>
    </SessionProvider>
  );
}

export default MyApp;
