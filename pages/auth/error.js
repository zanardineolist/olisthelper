// pages/auth/error.js
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Head from 'next/head';

export default function AuthError() {
  const router = useRouter();
  const { error } = router.query;

  useEffect(() => {
    // Redirecionar para login após 5 segundos
    const timer = setTimeout(() => {
      router.push('/');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'AccessDenied':
        return 'Acesso negado. Verifique se seu email pertence ao domínio autorizado (olist.com ou tiny.com.br).';
      case 'Configuration':
        return 'Erro de configuração do servidor. Entre em contato com o administrador.';
      case 'Verification':
        return 'Erro na verificação da conta. Tente novamente.';
      default:
        return 'Ocorreu um erro durante a autenticação. Tente novamente.';
    }
  };

  return (
    <>
      <Head>
        <title>Erro de Autenticação - Olist Helper</title>
      </Head>
      
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          maxWidth: '500px',
          padding: '2rem',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          backgroundColor: '#fff',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <h1 style={{ color: '#dc2626', marginBottom: '1rem' }}>
            ❌ Erro de Autenticação
          </h1>
          
          <p style={{ color: '#374151', marginBottom: '1.5rem', lineHeight: '1.6' }}>
            {getErrorMessage(error)}
          </p>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              <strong>Possíveis causas:</strong>
            </p>
            <ul style={{ textAlign: 'left', fontSize: '0.875rem', color: '#6b7280' }}>
              <li>Email não pertence ao domínio autorizado</li>
              <li>Conta Google não configurada corretamente</li>
              <li>Problemas temporários de conectividade</li>
            </ul>
          </div>
          
          <button
            onClick={() => router.push('/')}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500'
            }}
          >
            Tentar Novamente
          </button>
          
          <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: '1rem' }}>
            Redirecionando automaticamente em 5 segundos...
          </p>
        </div>
      </div>
    </>
  );
}
