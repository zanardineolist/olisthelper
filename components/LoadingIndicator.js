import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/LoadingIndicator.module.css';

export default function LoadingIndicator() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleStart = (url) => {
      // Só mostrar o loading se estiver mudando para uma página diferente
      if (url !== router.asPath) {
        setLoading(true);
      }
    };

    const handleComplete = () => {
      setLoading(false);
    };

    const handleError = () => {
      setLoading(false);
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleError);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleError);
    };
  }, [router]);

  if (!loading) return null;

  return (
    <div className={styles.loadingOverlay}>
      <div className={styles.loadingContent}>
        <div className={styles.spinner}></div>
        <p>Carregando página...</p>
      </div>
    </div>
  );
} 