// utils/hooks/useToast.js
import { toast } from 'react-hot-toast';

/**
 * Hook personalizado para notificações toast padronizadas
 * Centraliza e padroniza o uso de notificações em todo o projeto
 */
export const useToast = () => {
  const showToast = {
    /**
     * Exibe uma notificação de sucesso
     * @param {string} message - Mensagem a ser exibida
     * @param {Object} options - Opções adicionais do toast
     */
    success: (message, options = {}) => {
      return toast.success(message, {
        duration: 3000,
        position: 'top-right',
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
          borderLeft: '4px solid var(--excellent-color, #4caf50)',
        },
        iconTheme: {
          primary: 'var(--excellent-color, #4caf50)',
          secondary: 'var(--bg-secondary, #ffffff)',
        },
        ...options,
      });
    },

    /**
     * Exibe uma notificação de erro
     * @param {string} message - Mensagem a ser exibida
     * @param {Object} options - Opções adicionais do toast
     */
    error: (message, options = {}) => {
      return toast.error(message, {
        duration: 4000,
        position: 'top-right',
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
          borderLeft: '4px solid var(--poor-color, #f44336)',
        },
        iconTheme: {
          primary: 'var(--poor-color, #f44336)',
          secondary: 'var(--bg-secondary, #ffffff)',
        },
        ...options,
      });
    },

    /**
     * Exibe uma notificação de aviso
     * @param {string} message - Mensagem a ser exibida
     * @param {Object} options - Opções adicionais do toast
     */
    warning: (message, options = {}) => {
      return toast(message, {
        duration: 3500,
        position: 'top-right',
        icon: '⚠️',
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
          borderLeft: '4px solid var(--warning-color, #ff9800)',
        },
        ...options,
      });
    },

    /**
     * Exibe uma notificação informativa
     * @param {string} message - Mensagem a ser exibida
     * @param {Object} options - Opções adicionais do toast
     */
    info: (message, options = {}) => {
      return toast(message, {
        duration: 3000,
        position: 'top-right',
        icon: 'ℹ️',
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
          borderLeft: '4px solid var(--info-color, #2196f3)',
        },
        ...options,
      });
    },

    /**
     * Exibe uma notificação de carregamento
     * @param {string} message - Mensagem a ser exibida
     * @param {Object} options - Opções adicionais do toast
     */
    loading: (message, options = {}) => {
      return toast.loading(message, {
        position: 'top-right',
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
          borderLeft: '4px solid var(--primary-color, #1976d2)',
        },
        ...options,
      });
    },

    /**
     * Exibe uma notificação personalizada
     * @param {string} message - Mensagem a ser exibida
     * @param {Object} options - Opções adicionais do toast
     */
    custom: (message, options = {}) => {
      return toast(message, {
        duration: 3000,
        position: 'top-right',
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
        },
        ...options,
      });
    },

    /**
     * Promessa que exibe loading e resolve com sucesso/erro
     * @param {Promise} promise - Promessa a ser executada
     * @param {Object} messages - Mensagens para cada estado
     * @param {Object} options - Opções adicionais
     */
    promise: (promise, messages, options = {}) => {
      return toast.promise(
        promise,
        {
          loading: messages.loading || 'Carregando...',
          success: messages.success || 'Sucesso!',
          error: messages.error || 'Erro!',
        },
        {
          position: 'top-right',
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
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: 'var(--excellent-color, #4caf50)',
              secondary: 'var(--bg-secondary, #ffffff)',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: 'var(--poor-color, #f44336)',
              secondary: 'var(--bg-secondary, #ffffff)',
            },
          },
          ...options,
        }
      );
    },

    /**
     * Remove um toast específico
     * @param {string} toastId - ID do toast a ser removido
     */
    dismiss: (toastId) => {
      return toast.dismiss(toastId);
    },

    /**
     * Remove todos os toasts
     */
    dismissAll: () => {
      return toast.dismiss();
    },
  };

  return showToast;
};

// Exportação direta para compatibilidade
export default useToast;