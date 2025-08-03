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

// Componente de tracking interno
function TrackingWrapper({ children }) {
  const { data: session } = useSession();
  const router = useRouter();
  const sessionIdRef = useRef(null);
  const pageStartTime = useRef(null);

  // Gerar session ID único para este usuário
  useEffect(() => {
    if (session?.id && !sessionIdRef.current) {
      sessionIdRef.current = `${session.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  }, [session]);

  // Tracking de mudança de página
  useEffect(() => {
    if (!session?.id || !sessionIdRef.current) return;

    const handleRouteChangeStart = () => {
      // Registrar duração da página anterior se existir
      if (pageStartTime.current) {
        const duration = Math.floor((Date.now() - pageStartTime.current) / 1000);
        // Não enviar se duração for muito pequena (< 1 segundo)
        if (duration >= 1) {
          trackPageVisit(router.asPath, duration);
        }
      }
      pageStartTime.current = Date.now();
    };

    const handleRouteChangeComplete = (url) => {
      pageStartTime.current = Date.now();
      trackPageVisit(url, 0); // Duração será atualizada na próxima mudança de página
    };

    // Registrar primeira visita
    if (!pageStartTime.current) {
      pageStartTime.current = Date.now();
      trackPageVisit(router.asPath, 0);
    }

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);

    // Cleanup
    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, [session, router]);

  // Heartbeat para manter sessão ativa
  useEffect(() => {
    if (!session?.id || !sessionIdRef.current) return;

    const heartbeat = setInterval(() => {
      updateSessionActivity();
    }, 60000); // A cada minuto

    // Cleanup
    return () => clearInterval(heartbeat);
  }, [session]);

  // Função para registrar visita de página
  const trackPageVisit = async (pagePath, duration = 0) => {
    if (!session?.id || !sessionIdRef.current) return;

    try {
      await fetch('/api/analytics/track-page-visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_path: pagePath,
          page_title: document.title,
          referrer: document.referrer,
          session_id: sessionIdRef.current,
          visit_duration: duration,
          user_agent: navigator.userAgent
        })
      });
    } catch (error) {
      console.error('Erro ao registrar visita:', error);
    }
  };

  // Função para atualizar atividade da sessão
  const updateSessionActivity = async () => {
    if (!session?.id || !sessionIdRef.current) return;

    try {
      await fetch('/api/analytics/update-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionIdRef.current
        })
      });
    } catch (error) {
      console.error('Erro ao atualizar sessão:', error);
    }
  };

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
