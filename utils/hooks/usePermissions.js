import { useState, useEffect } from 'react';

/**
 * Hook para verificar permissões do usuário de forma robusta
 * Inclui fallbacks e verificações defensivas
 */
export function usePermissions(user = {}) {
  const [permissions, setPermissions] = useState({
    isLoading: true,
    hasError: false,
    data: null
  });

  useEffect(() => {
    try {
      // Verificação defensiva dos dados do usuário
      if (!user || typeof user !== 'object') {
        console.warn('usePermissions: Dados do usuário inválidos:', user);
        setPermissions({
          isLoading: false,
          hasError: true,
          data: getDefaultPermissions()
        });
        return;
      }

      // Extrair permissões com fallbacks seguros
      const userPermissions = {
        // Dados básicos
        id: user.id || null,
        name: user.name || 'Usuário',
        email: user.email || '',
        role: user.role || 'support',
        
        // Permissões tradicionais
        admin: Boolean(user.admin),
        can_ticket: Boolean(user.can_ticket),
        can_phone: Boolean(user.can_phone),
        can_chat: Boolean(user.can_chat),
        
        // NOVAS PERMISSÕES MODULARES
        can_register_help: Boolean(user.can_register_help),
        can_remote_access: Boolean(user.can_remote_access),
        
        // Permissões derivadas (para compatibilidade)
        canAccessManager: canAccessManager(user),
        canAccessDashboard: canAccessDashboard(user),
        canAccessAnalytics: Boolean(user.admin),
        canAccessTools: canAccessTools(user),
        canAccessRemote: Boolean(user.can_remote_access), // SISTEMA MODULAR
        
        // Métodos de verificação
        hasRole: (roleToCheck) => hasRole(user, roleToCheck),
        hasAnyRole: (rolesToCheck) => hasAnyRole(user, rolesToCheck),
        hasPermission: (permission) => hasPermission(user, permission)
      };

      setPermissions({
        isLoading: false,
        hasError: false,
        data: userPermissions
      });

    } catch (error) {
      console.error('Erro no usePermissions:', error);
      setPermissions({
        isLoading: false,
        hasError: true,
        data: getDefaultPermissions()
      });
    }
  }, [user]);

  return permissions;
}

/**
 * Permissões padrão para casos de erro
 */
function getDefaultPermissions() {
  return {
    id: null,
    name: 'Usuário',
    email: '',
    role: 'support',
    admin: false,
    can_ticket: false,
    can_phone: false,
    can_chat: false,
    can_register_help: false,
    can_remote_access: false,
    canAccessManager: false,
    canAccessDashboard: false,
    canAccessAnalytics: false,
    canAccessTools: true,
    canAccessRemote: false,
    hasRole: () => false,
    hasAnyRole: () => false,
    hasPermission: () => false
  };
}

/**
 * Verifica se o usuário pode acessar o manager
 */
function canAccessManager(user) {
  const allowedRoles = ['analyst', 'tax', 'super'];
  return allowedRoles.includes(user?.role?.toLowerCase());
}

/**
 * Verifica se o usuário pode acessar dashboard
 */
function canAccessDashboard(user) {
  const allowedRoles = ['analyst', 'tax', 'super', 'quality'];
  return allowedRoles.includes(user?.role?.toLowerCase());
}

/**
 * Verifica se o usuário pode acessar ferramentas
 */
function canAccessTools(user) {
  const allowedRoles = ['support', 'analyst', 'super', 'tax', 'quality'];
  return allowedRoles.includes(user?.role?.toLowerCase());
}

/**
 * Verifica se o usuário possui um role específico
 */
function hasRole(user, roleToCheck) {
  if (!user?.role || !roleToCheck) return false;
  return user.role.toLowerCase() === roleToCheck.toLowerCase();
}

/**
 * Verifica se o usuário possui qualquer um dos roles especificados
 */
function hasAnyRole(user, rolesToCheck) {
  if (!user?.role || !Array.isArray(rolesToCheck)) return false;
  return rolesToCheck.some(role => 
    user.role.toLowerCase() === role.toLowerCase()
  );
}

/**
 * Verifica se o usuário possui uma permissão específica
 */
function hasPermission(user, permission) {
  if (!user || !permission) return false;
  
  // Verificações especiais
  switch (permission) {
    case 'admin':
      return Boolean(user.admin);
    case 'can_register_help':
      return Boolean(user.can_register_help);
    case 'can_remote_access':
      return Boolean(user.can_remote_access);
    case 'can_ticket':
      return Boolean(user.can_ticket);
    case 'can_phone':
      return Boolean(user.can_phone);
    case 'can_chat':
      return Boolean(user.can_chat);
    default:
      return Boolean(user[permission]);
  }
}

/**
 * Utilitário para debug de permissões (apenas desenvolvimento)
 */
export function debugPermissions(user, context = '') {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🔍 Debug Permissões ${context}`);
    console.log('Usuário completo:', user);
    console.log('Role:', user?.role);
    console.log('Admin:', user?.admin);
    console.log('Can Remote Access:', user?.can_remote_access);
    console.log('Can Register Help:', user?.can_register_help);
    console.groupEnd();
  }
}

/**
 * Hook para verificar se o usuário pode acessar uma rota específica
 * @param {string} route - A rota a ser verificada
 * @returns {boolean} Se o usuário pode acessar a rota
 */
export function useCanAccessRoute(route) {
  const permissions = usePermissions();
  
  const routePermissions = {
    // Rotas baseadas em perfil
    '/profile-analyst': permissions.isAnalystOrTax,
    '/dashboard-analyst': permissions.isElevatedUser,
    '/dashboard-super': permissions.isSuper,
    '/dashboard-quality': permissions.isQuality,
    '/registro': permissions.isElevatedUser,
    '/manager': permissions.isElevatedUser,
    '/admin-notifications': permissions.isDev,
    '/tools': permissions.isElevatedUser || permissions.isSupport,
    
    // Rotas baseadas em permissões específicas
    '/analytics': permissions.isAdmin,
    '/register-help': permissions.canRegisterHelp,
    '/remote': permissions.canRemoteAccess
  };
  
  return routePermissions[route] || false;
}

/**
 * Hook para verificar múltiplas permissões de uma vez
 * @param {Array} requiredPermissions - Array de permissões necessárias
 * @param {string} operator - 'AND' ou 'OR' para determinar se todas ou apenas uma permissão é necessária
 * @returns {boolean} Se o usuário atende aos critérios
 */
export function useHasPermissions(requiredPermissions, operator = 'AND') {
  const permissions = usePermissions();
  
  if (operator === 'OR') {
    return requiredPermissions.some(permission => permissions[permission]);
  }
  
  return requiredPermissions.every(permission => permissions[permission]);
}

export default usePermissions; 