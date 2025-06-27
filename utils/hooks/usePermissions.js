import { useSession } from 'next-auth/react';

/**
 * Hook personalizado para verificações de permissão modulares
 * @returns {Object} Objeto com todas as permissões do usuário atual
 */
export function usePermissions() {
  const { data: session } = useSession();
  
  const permissions = {
    // Permissões básicas (sistema legado)
    canTicket: session?.user?.can_ticket || false,
    canPhone: session?.user?.can_phone || false,
    canChat: session?.user?.can_chat || false,
    
    // Novas permissões modulares
    canRegisterHelp: session?.user?.can_register_help || false,
    canRemoteAccess: session?.user?.can_remote_access || false,
    
    // Permissão administrativa
    isAdmin: session?.user?.admin || false,
    
    // Perfil do usuário
    profile: session?.user?.profile || 'support',
    
    // Verificações de perfil específicas
    isSupport: session?.user?.profile === 'support',
    isAnalyst: session?.user?.profile === 'analyst',
    isTax: session?.user?.profile === 'tax',
    isSuper: session?.user?.profile === 'super',
    isQuality: session?.user?.profile === 'quality',
    isDev: session?.user?.profile === 'dev',
    
    // Verificações de grupos
    isAnalystOrTax: ['analyst', 'tax'].includes(session?.user?.profile),
    isElevatedUser: ['analyst', 'tax', 'super', 'quality', 'dev'].includes(session?.user?.profile),
    
    // Dados básicos do usuário
    userId: session?.user?.id,
    userName: session?.user?.name,
    userEmail: session?.user?.email
  };
  
  return permissions;
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