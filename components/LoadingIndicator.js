import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/router';

// Criando o contexto de loading
export const LoadingContext = createContext({
  isLoading: false,
  message: '',
  startLoading: () => {},
  stopLoading: () => {},
  setLoadingMessage: () => {}
});

// Provider para o contexto de loading
export function LoadingProvider({ children }) {
  const [state, setState] = useState({
    isLoading: false,
    message: 'Carregando...',
    loadingType: 'local' // Apenas loading local, sem fullscreen
  });

  const startLoading = (options = {}) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      message: options.message || prev.message,
      loadingType: options.type || 'local'
    }));
  };

  const stopLoading = () => {
    setState(prev => ({
      ...prev,
      isLoading: false
    }));
  };

  const setLoadingMessage = (message) => {
    setState(prev => ({
      ...prev,
      message
    }));
  };

  // Gerenciar loading automático nas mudanças de rota (apenas para detectar estado)
  const router = useRouter();
  const [routerLoading, setRouterLoading] = useState(false);

  useEffect(() => {
    const handleStart = () => {
      setRouterLoading(true);
    };

    const handleComplete = () => {
      setRouterLoading(false);
    };

    const handleError = () => {
      setRouterLoading(false);
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

  return (
    <LoadingContext.Provider value={{ 
      isLoading: routerLoading, // Usar routerLoading para compatibilidade
      message: state.message,
      loadingType: state.loadingType,
      startLoading, 
      stopLoading, 
      setLoadingMessage 
    }}>
      {children}
      {/* Overlay fullscreen removido - usando apenas sidebar spinner + blur effect */}
    </LoadingContext.Provider>
  );
}

// Hook personalizado para usar o contexto de loading
export function useLoading() {
  const context = useContext(LoadingContext);
  return {
    ...context,
    loading: context.isLoading // Alias para compatibilidade
  };
}

// Componente de loading de três bolinhas, para uso em containers específicos
export function ThreeDotsLoader({ message, inline = false, size = 'medium' }) {
  const sizeMap = {
    small: { height: '20px', fontSize: '5px' },
    medium: { height: '30px', fontSize: '7px' },
    large: { height: '40px', fontSize: '9px' }
  };

  const calculatedSize = sizeMap[size] || sizeMap.medium;
  
  const containerStyle = inline 
    ? {
        display: 'inline-flex',
        alignItems: 'center',
        marginLeft: '10px',
        height: calculatedSize.height
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        width: '100%',
        minHeight: '100px'
      };

  return (
    <div style={containerStyle}>
      <div className="standardBoxLoader" style={{ fontSize: calculatedSize.fontSize }}></div>
      {message && (
        <p style={{ 
          marginTop: inline ? 0 : '40px', 
          marginLeft: inline ? '50px' : 0,
          color: 'var(--text-color)',
          fontSize: '14px'
        }}>
          {message}
        </p>
      )}
    </div>
  );
}

// Componente de loading local com spinner, para uso em áreas específicas
export function LocalLoader({ message, size = 'medium', inline = false }) {
  const sizeMap = {
    small: { width: '24px', height: '24px' },
    medium: { width: '36px', height: '36px' },
    large: { width: '48px', height: '48px' }
  };

  const containerStyle = inline ? {
    display: 'inline-flex',
    alignItems: 'center',
    margin: '0 10px'
  } : {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    width: '100%',
    height: '100%',
    minHeight: '100px'
  };

  const loaderStyle = {
    ...sizeMap[size],
    borderTop: '3px solid var(--text-color)',
    borderRight: '3px solid transparent',
    borderRadius: '50%',
    display: 'inline-block',
    boxSizing: 'border-box',
    animation: 'rotation 1s linear infinite',
    position: 'relative'
  };

  const afterStyle = {
    content: '""',
    boxSizing: 'border-box',
    position: 'absolute',
    left: '0',
    top: '0',
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    borderLeft: '3px solid var(--color-primary)',
    borderBottom: '3px solid transparent',
    animation: 'rotation 0.5s linear infinite reverse'
  };

  return (
    <div style={containerStyle}>
      <div style={loaderStyle}>
        <style jsx>{`
          @keyframes rotation {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
          div:after {
            content: '';
            box-sizing: border-box;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border-left: 3px solid var(--color-primary);
            border-bottom: 3px solid transparent;
            animation: rotation 0.5s linear infinite reverse;
          }
        `}</style>
      </div>
      {message && <p style={{ marginTop: inline ? 0 : '10px', marginLeft: inline ? '10px' : 0 }}>{message}</p>}
    </div>
  );
}

// Componente principal de loading para compatibilidade com o código existente
export default function LoadingIndicator() {
  const { isLoading } = useLoading();
  
  if (!isLoading) return null;
  
  return null; // O loading é renderizado pelo Provider
} 