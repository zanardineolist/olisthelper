// utils/validador-ml/api.js
import { supabase } from '../supabase/supabaseClient';
import { sanitizeQuery } from './helpers';

export const categoryApi = {
  async searchCategories(query, page = 0, limit = 20) {
    const startIndex = page * limit;
    const endIndex = startIndex + limit - 1;
    const sanitizedQuery = sanitizeQuery(query);

    try {
      const { data, error, count } = await supabase
        .from('ml_categories')
        .select('*', { count: 'exact' })
        .or(
          sanitizedQuery 
            ? `id.ilike.%${sanitizedQuery}%,hierarquia_completa.ilike.%${sanitizedQuery}%`
            : 'is_ultimo_nivel.eq.true'
        )
        .range(startIndex, endIndex);

      if (error) throw error;

      return {
        categories: data || [],
        total: count || 0,
        hasMore: (data?.length || 0) === limit
      };
    } catch (error) {
      console.error('Erro na busca de categorias:', error);
      throw error;
    }
  },

  async getCategoryDetails(categoryId) {
    try {
      // 1. Buscar dados do Supabase
      const { data: categoryData, error: categoryError } = await supabase
        .from('ml_categories')
        .select('*')
        .eq('id', categoryId)
        .single();

      if (categoryError) throw categoryError;
      if (!categoryData) return null;

      // 2. Buscar especificações da API do ML
      const response = await fetch(
        `https://api.mercadolibre.com/categories/${categoryId}/technical_specs/input`
      );

      if (!response.ok) {
        throw new Error(`API ML retornou status ${response.status}`);
      }

      const apiData = await response.json();

      // 3. Processar dados da API
      const { requiredAttributes, variations } = this.processApiData(apiData);

      // 4. Combinar todos os dados
      return {
        ...categoryData,
        requiredAttributes,
        variations,
        allowVariations: variations.length > 0
      };

    } catch (error) {
      console.error('Erro ao buscar detalhes da categoria:', error);
      throw error;
    }
  },

  processApiData(apiData) {
    const requiredAttributes = [];
    const variations = [];

    for (const group of apiData.groups) {
      for (const component of group.components) {
        if (component.attributes) {
          for (const attribute of component.attributes) {
            if (attribute.tags?.includes("required")) {
              requiredAttributes.push(attribute);
            }
            if (attribute.tags?.includes("allow_variations")) {
              variations.push({
                id: attribute.id,
                name: attribute.name,
                values: attribute.values || []
              });
            }
          }
        }
      }
    }

    return { requiredAttributes, variations };
  }
};