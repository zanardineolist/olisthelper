// pages/api/validador-ml/pesquisar-categoria.js
import { supabase } from '../../../utils/supabase/supabaseClient';
import { getSession } from 'next-auth/react';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  // Verificar autenticação
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  const { categoriaId } = req.query;

  if (!categoriaId) {
    return res.status(400).json({
      mensagemErro: 'ID da categoria é obrigatório',
      tipoErro: 'ParametroInvalido'
    });
  }

  try {
    // Buscar dados da categoria no Supabase
    const { data: categoriaData, error: categoriaError } = await supabase
      .from('ml_categories')
      .select('*')
      .eq('id', categoriaId)
      .single();

    if (categoriaError) {
      throw new Error(`Erro ao buscar categoria: ${categoriaError.message}`);
    }

    if (!categoriaData) {
      return res.status(404).json({
        mensagemErro: `Categoria ${categoriaId} não encontrada.`,
        tipoErro: 'NenhumResultado'
      });
    }

    // Buscar especificações técnicas da API do ML
    try {
      const mlResponse = await fetch(
        `https://api.mercadolibre.com/categories/${categoriaId}/technical_specs/input`
      );

      if (!mlResponse.ok) {
        throw new Error(`Erro API ML: ${mlResponse.status} ${mlResponse.statusText}`);
      }

      const apiData = await mlResponse.json();

      // Processar atributos obrigatórios e variações
      let atributosRequeridos = [];
      let allowVariations = false;
      let atributosVariacoes = [];

      for (const group of apiData.groups) {
        for (const component of group.components) {
          if (component.attributes) {
            for (const atributo of component.attributes) {
              if (atributo.tags && atributo.tags.includes("required")) {
                atributosRequeridos.push(atributo);
              }
              if (atributo.tags && atributo.tags.includes("allow_variations")) {
                allowVariations = true;
                atributosVariacoes.push({
                  id: atributo.id,
                  name: atributo.name,
                  values: atributo.values || []
                });
              }
            }
          }
        }
      }

      // Gerar HTML para os cards de atributos
      let cardsHtml = '';
      if (atributosRequeridos.length > 0) {
        for (const atributo of atributosRequeridos) {
          const jsonFormatado = JSON.stringify(atributo, null, 2);
          cardsHtml += `
            <div class="card">
              <h2>${atributo.name} (ID: ${atributo.id})</h2>
              <p><strong>Obrigatório:</strong> Sim</p>
              <button class="detalhes-button">Detalhes</button>
              <div class="details" style="display: none;">
                <pre>${jsonFormatado}</pre>
              </div>
            </div>
          `;
        }
      } else {
        cardsHtml = `<p>Esta categoria não possui atributos obrigatórios.</p>`;
      }

      // Retornar resposta combinada
      return res.status(200).json({
        ...categoriaData,
        cardsHtml,
        allowVariations: allowVariations ? `Sim (${atributosVariacoes.length} variações)` : "Não",
        variacoes: atributosVariacoes,
        mensagemErro: null
      });

    } catch (mlError) {
      console.error('Erro ao buscar dados da API ML:', mlError);
      return res.status(500).json({
        mensagemErro: 'Erro ao buscar especificações técnicas da categoria.',
        tipoErro: 'ErroAPIML',
        detalhes: mlError.message
      });
    }

  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      mensagemErro: 'Erro interno do servidor.',
      tipoErro: 'ErroServidor',
      detalhes: error.message
    });
  }
}