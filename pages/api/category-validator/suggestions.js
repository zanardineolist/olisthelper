// pages/api/category-validator/suggestions.js
import { supabase } from '../../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { query } = req.query;

  try {
    const { data, error } = await supabase
      .from('ml_categories')
      .select('id, hierarquia_completa')
      .or(`id.ilike.%${query}%,hierarquia_completa.ilike.%${query}%`)
      .limit(20);

    if (error) {
      throw error;
    }

    return res.status(200).json({ suggestions: data });
  } catch (error) {
    console.error('Erro ao buscar sugestões:', error);
    return res.status(500).json({
      message: 'Erro ao buscar sugestões',
      error: error.message
    });
  }
}

// pages/api/category-validator/details.js
import fetch from 'node-fetch';
import { supabase } from '../../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { categoryId } = req.query;

  try {
    // Buscar dados do Supabase
    const { data: categoryData, error: categoryError } = await supabase
      .from('ml_categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (categoryError) throw categoryError;
    if (!categoryData) {
      return res.status(404).json({ message: 'Categoria não encontrada' });
    }

    // Buscar dados da API do Mercado Livre
    const mlApiUrl = `https://api.mercadolibre.com/categories/${categoryId}/technical_specs/input`;
    const mlResponse = await fetch(mlApiUrl);
    
    if (!mlResponse.ok) {
      throw new Error(`Erro na API do ML: ${mlResponse.status}`);
    }

    const mlData = await mlResponse.json();

    // Processar atributos
    const { attributes, variations } = processMLData(mlData);

    return res.status(200).json({
      ...categoryData,
      attributes,
      variations,
    });
  } catch (error) {
    console.error('Erro ao buscar detalhes:', error);
    return res.status(500).json({
      message: 'Erro ao buscar detalhes da categoria',
      error: error.message
    });
  }
}

function processMLData(mlData) {
  const attributes = [];
  const variations = [];

  mlData.groups.forEach(group => {
    group.components.forEach(component => {
      if (component.attributes) {
        component.attributes.forEach(attr => {
          if (attr.tags?.includes('required')) {
            attributes.push(attr);
          }
          if (attr.tags?.includes('allow_variations')) {
            variations.push({
              id: attr.id,
              name: attr.name,
              values: attr.values || []
            });
          }
        });
      }
    });
  });

  return { attributes, variations };
}