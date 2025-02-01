// Cache duration in milliseconds (24 hours)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

export const mlUtils = {
  // Cache management
  getCache(key) {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_DURATION) {
        localStorage.removeItem(key);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting cache:', error);
      return null;
    }
  },

  setCache(key, data) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  },

  // Format currency values
  formatCurrency(value, currency = 'BRL') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency
    }).format(value);
  },

  // Parse ML technical specs
  parseTechnicalSpecs(specs) {
    const requiredAttributes = [];
    const variationAttributes = [];

    specs.groups?.forEach(group => {
      group.components?.forEach(component => {
        component.attributes?.forEach(attr => {
          if (attr.tags?.includes('required')) {
            requiredAttributes.push({
              id: attr.id,
              name: attr.name,
              type: attr.type,
              values: attr.values || [],
              group: group.name
            });
          }
          if (attr.tags?.includes('allow_variations')) {
            variationAttributes.push({
              id: attr.id,
              name: attr.name,
              type: attr.type,
              values: attr.values || [],
              group: group.name
            });
          }
        });
      });
    });

    return {
      requiredAttributes,
      variationAttributes
    };
  },

  // Format category status
  formatStatus(status) {
    const statusMap = {
      enabled: {
        label: 'Ativa',
        color: 'success'
      },
      disabled: {
        label: 'Desativada',
        color: 'error'
      }
    };

    return statusMap[status] || { label: 'Desconhecido', color: 'warning' };
  }
};