// components/ToastProvider.js
import React from 'react';
import { Toaster } from 'react-hot-toast';

/**
 * Componente ToastProvider que configura o Toaster globalmente
 * com estilos consistentes para todo o projeto Olist Helper
 */
const ToastProvider = ({ children, position = 'top-right' }) => {
  return (
    <>
      {children}
      <Toaster
        position={position}
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{
          top: 20,
          left: 20,
          bottom: 20,
          right: 20,
        }}
        toastOptions={{
          // Configurações padrão para todos os toasts
          duration: 3000,
          style: {
            background: 'var(--bg-secondary, #ffffff)',
            color: 'var(--text-color, #333333)',
            border: '1px solid var(--color-border, #e0e0e0)',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            padding: '16px 20px',
            boxShadow: 'var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1))',
            maxWidth: '400px',
            wordWrap: 'break-word',
          },
          
          // Configurações específicas por tipo
          success: {
            duration: 3000,
            style: {
              borderLeft: '4px solid var(--excellent-color, #4caf50)',
            },
            iconTheme: {
              primary: 'var(--excellent-color, #4caf50)',
              secondary: 'var(--bg-secondary, #ffffff)',
            },
          },
          
          error: {
            duration: 4000,
            style: {
              borderLeft: '4px solid var(--poor-color, #f44336)',
            },
            iconTheme: {
              primary: 'var(--poor-color, #f44336)',
              secondary: 'var(--bg-secondary, #ffffff)',
            },
          },
          
          loading: {
            style: {
              borderLeft: '4px solid var(--primary-color, #1976d2)',
            },
            iconTheme: {
              primary: 'var(--primary-color, #1976d2)',
              secondary: 'var(--bg-secondary, #ffffff)',
            },
          },
        }}
      />
      
      {/* Estilos CSS customizados para melhor integração com o tema */}
      <style jsx global>{`
        /* Animações personalizadas para os toasts */
        .toast-enter {
          transform: translateX(100%);
          opacity: 0;
        }
        
        .toast-enter-active {
          transform: translateX(0);
          opacity: 1;
          transition: transform 0.3s ease-out, opacity 0.3s ease-out;
        }
        
        .toast-exit {
          transform: translateX(0);
          opacity: 1;
        }
        
        .toast-exit-active {
          transform: translateX(100%);
          opacity: 0;
          transition: transform 0.3s ease-in, opacity 0.3s ease-in;
        }
        
        /* Hover effects para os toasts */
        [data-sonner-toast] {
          transition: all 0.2s ease;
        }
        
        [data-sonner-toast]:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1)) !important;
        }
        
        /* Responsividade para dispositivos móveis */
        @media (max-width: 640px) {
          [data-sonner-toaster] {
            left: 16px !important;
            right: 16px !important;
            width: auto !important;
          }
          
          [data-sonner-toast] {
            max-width: none !important;
            width: 100% !important;
            margin: 0 !important;
          }
        }
        
        /* Integração com tema escuro */
        [data-theme="dark"] [data-sonner-toast] {
          background: var(--bg-secondary-dark, #2d3748) !important;
          color: var(--text-color-dark, #e2e8f0) !important;
          border-color: var(--color-border-dark, #4a5568) !important;
        }
        
        /* Melhor contraste para ícones no tema escuro */
        [data-theme="dark"] [data-sonner-toast] svg {
          filter: brightness(1.2);
        }
        
        /* Animação suave para o progress bar */
        [data-sonner-toast] [data-progress] {
          transition: width 0.1s ease-out;
        }
        
        /* Estilo para toasts de loading */
        [data-sonner-toast][data-type="loading"] {
          pointer-events: none;
        }
        
        /* Estilo para toasts dismissíveis */
        [data-sonner-toast][data-dismissible="true"] {
          cursor: pointer;
        }
        
        [data-sonner-toast][data-dismissible="true"]:hover {
          opacity: 0.9;
        }
        
        /* Melhor espaçamento entre múltiplos toasts */
        [data-sonner-toaster] {
          gap: 8px;
        }
        
        /* Estilo para o botão de fechar quando presente */
        [data-sonner-toast] button[data-close-button] {
          background: transparent;
          border: none;
          color: inherit;
          opacity: 0.7;
          transition: opacity 0.2s ease;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }
        
        [data-sonner-toast] button[data-close-button]:hover {
          opacity: 1;
          background: rgba(0, 0, 0, 0.1);
        }
        
        [data-theme="dark"] [data-sonner-toast] button[data-close-button]:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </>
  );
};

export default ToastProvider;