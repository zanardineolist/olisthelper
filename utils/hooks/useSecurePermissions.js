// utils/hooks/useSecurePermissions.js
// Hook seguro para buscar permissões em tempo real

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useSecurePermissions() {
  const { data: session, status } = useSession();
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.id) {
      setPermissions(null);
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/auth/permissions', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Falha ao buscar permissões');
        }

        const data = await response.json();
        setPermissions(data);
      } catch (err) {
        console.error('Erro ao buscar permissões:', err);
        setError(err.message);
        setPermissions(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [session, status]);

  // Funções de verificação de permissão
  const hasPermission = (permission) => {
    if (!permissions) return false;
    return permissions[permission] === true;
  };

  const hasRole = (role) => {
    if (!permissions) return false;
    return permissions.profile === role;
  };

  const hasAnyRole = (roles) => {
    if (!permissions) return false;
    return Array.isArray(roles) ? roles.includes(permissions.profile) : roles === permissions.profile;
  };

  const isAdmin = () => {
    if (!permissions) return false;
    return permissions.admin === true;
  };

  return {
    permissions,
    loading,
    error,
    hasPermission,
    hasRole,
    hasAnyRole,
    isAdmin,
    // Recarregar permissões
    refresh: () => {
      if (session?.id) {
        setLoading(true);
        fetchPermissions();
      }
    }
  };
}
