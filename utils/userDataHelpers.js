/**
 * Utilitários para garantir dados de usuário consistentes
 * Evita problemas de menus desaparecendo no Sidebar
 */

/**
 * Normaliza os dados do usuário garantindo que todas as propriedades necessárias existam
 * @param {Object} userData - Dados brutos do usuário
 * @returns {Object} Dados normalizados e seguros
 */
export function normalizeUserData(userData) {
  if (!userData || typeof userData !== 'object') {
    console.warn('normalizeUserData: Dados de usuário inválidos:', userData);
    return getDefaultUserData();
  }

  return {
    // Dados básicos obrigatórios
    id: userData.id || null,
    name: userData.name || 'Usuário',
    email: userData.email || '',
    role: userData.role || 'support',
    
    // Permissões tradicionais com fallbacks
    admin: Boolean(userData.admin),
    can_ticket: Boolean(userData.can_ticket),
    can_phone: Boolean(userData.can_phone),
    can_chat: Boolean(userData.can_chat),
    
    // NOVAS PERMISSÕES MODULARES (sempre incluídas)
    can_register_help: Boolean(userData.can_register_help),
    can_remote_access: Boolean(userData.can_remote_access),
    
    // Metadados úteis
    created_at: userData.created_at || null,
    updated_at: userData.updated_at || null,
    last_login: userData.last_login || null
  };
}

/**
 * Dados padrão seguros para fallback
 */
function getDefaultUserData() {
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
    created_at: null,
    updated_at: null,
    last_login: null
  };
}

/**
 * Prepara props de usuário para getServerSideProps
 * Garante que todas as propriedades necessárias estejam presentes
 * @param {Object} supabaseUserData - Dados vindos do Supabase
 * @param {Object} sessionData - Dados da sessão NextAuth
 * @returns {Object} Props formatadas para a página
 */
export function prepareUserPropsForPage(supabaseUserData, sessionData) {
  const userData = normalizeUserData(supabaseUserData);
  
  return {
    user: {
      ...userData,
      // Adicionar dados da sessão se disponíveis
      ...(sessionData?.user && {
        name: sessionData.user.name || userData.name,
        email: sessionData.user.email || userData.email
      })
    }
  };
}

/**
 * Valida se os dados do usuário estão completos para o Sidebar
 * @param {Object} userData - Dados do usuário
 * @returns {Object} Resultado da validação
 */
export function validateUserDataForSidebar(userData) {
  const issues = [];
  
  if (!userData) {
    issues.push('userData é null/undefined');
  } else {
    if (!userData.role) issues.push('role ausente');
    if (userData.can_remote_access === undefined) issues.push('can_remote_access ausente');
    if (userData.can_register_help === undefined) issues.push('can_register_help ausente');
    if (userData.admin === undefined) issues.push('admin ausente');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    normalizedData: normalizeUserData(userData)
  };
}

/**
 * Middleware para páginas - garante dados consistentes
 * Use em getServerSideProps para garantir que sempre haja dados válidos
 */
export async function ensureUserDataConsistency(context, getUserDataFunction) {
  try {
    // Buscar dados do usuário
    const userData = await getUserDataFunction(context);
    
    // Validar e normalizar
    const validation = validateUserDataForSidebar(userData);
    
    if (process.env.NODE_ENV === 'development' && !validation.isValid) {
      console.warn('⚠️ Dados de usuário incompletos detectados:', {
        page: context.resolvedUrl,
        issues: validation.issues,
        originalData: userData
      });
    }
    
    // Retornar dados normalizados
    return {
      props: prepareUserPropsForPage(validation.normalizedData)
    };
    
  } catch (error) {
    console.error('Erro ao garantir consistência dos dados do usuário:', error);
    
    // Fallback seguro
    return {
      props: prepareUserPropsForPage(getDefaultUserData())
    };
  }
}

/**
 * Debug helper para desenvolvimento
 */
export function debugUserData(userData, context = '') {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🔍 Debug UserData ${context}`);
    const validation = validateUserDataForSidebar(userData);
    
    console.log('Dados originais:', userData);
    console.log('Validação:', validation);
    console.log('Dados normalizados:', validation.normalizedData);
    
    if (!validation.isValid) {
      console.warn('❌ PROBLEMAS ENCONTRADOS:', validation.issues);
    } else {
      console.log('✅ Dados válidos');
    }
    
    console.groupEnd();
  }
}

/**
 * Hook React para monitorar mudanças nos dados do usuário
 */
export function useUserDataMonitor(userData, componentName = 'Componente') {
  if (process.env.NODE_ENV === 'development') {
    const { useEffect } = require('react');
    
    useEffect(() => {
      debugUserData(userData, `${componentName} - useEffect`);
    }, [userData]);
  }
} 