// pages/api/category-validator/details.js
import { supabase } from '../../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { categoryId } = req.query;

  if (!categoryId) {
    return res.status(400).json({ message: 'ID da categoria é obrigatório' });
  }

  try {
    // Busca dados da categoria no Supabase
    const { data: categoryData, error: categoryError } = await supabase
      .from('ml_categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (categoryError) {
      console.error('Erro ao buscar categoria:', categoryError);
      return res.status(500).json({
        message: 'Erro ao buscar categoria no banco de dados'
      });
    }

    if (!categoryData) {
      return res.status(404).json({
        message: `Categoria ${categoryId} não encontrada.`
      });
    }

    // Busca dados técnicos da API do Mercado Livre
    const mlUrl = `https://api.mercadolibre.com/categories/${categoryId}/technical_specs/input`;
    const mlResponse = await fetch(mlUrl);
    
    if (!mlResponse.ok) {
      return res.status(mlResponse.status).json({
        message: `Erro ao consultar API do Mercado Livre: ${mlResponse.statusText}`
      });
    }

    const mlData = await mlResponse.json();

    // Processa atributos e variações
    const { attributes, variations } = processMLData(mlData);

    // Retorna dados combinados
    return res.status(200).json({
      ...categoryData,
      attributes,
      variations
    });

  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({
      message: 'Erro interno ao processar requisição',
      error: error.message
    });
  }
}

function processMLData(mlData) {
  const attributes = [];
  const variations = [];

  mlData.groups?.forEach(group => {
    group.components?.forEach(component => {
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