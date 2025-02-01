import { supabaseAdmin } from '../utils/supabase/supabaseClient';

export const mlServices = {
  async searchCategories(query) {
    try {
      const { data, error } = await supabaseAdmin
        .from('ml_categories')
        .select('*')
        .or(`id.ilike.%${query}%,hierarchy_complete.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error searching categories:', error);
      throw error;
    }
  },

  async getCategoryDetails(categoryId) {
    try {
      // First get category from Supabase
      const { data: categoryData, error: categoryError } = await supabaseAdmin
        .from('ml_categories')
        .select('*')
        .eq('id', categoryId)
        .single();

      if (categoryError) throw categoryError;

      // Then fetch technical specs from ML API
      const response = await fetch(
        `https://api.mercadolibre.com/categories/${categoryId}/technical_specs/input`
      );
      
      if (!response.ok) {
        throw new Error('Error fetching ML technical specs');
      }

      const technicalSpecs = await response.json();

      return {
        category: categoryData,
        technicalSpecs
      };
    } catch (error) {
      console.error('Error getting category details:', error);
      throw error;
    }
  },

  async getCategoryVariations(categoryId) {
    try {
      const response = await fetch(
        `https://api.mercadolibre.com/categories/${categoryId}/attributes`
      );

      if (!response.ok) {
        throw new Error('Error fetching category variations');
      }

      const data = await response.json();
      return data.filter(attr => attr.tags.includes('allow_variations'));
    } catch (error) {
      console.error('Error getting category variations:', error);
      throw error;
    }
  }
};