// pages/api/cep-ibge.js
import { supabaseAdmin } from '../../utils/supabase/supabaseClient';
import rateLimiter from '../../utils/rateLimiter';
import { applyCors } from '../../utils/corsConfig';

// Cache para armazenar consultas anteriores e reduzir chamadas à API
const cepCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

export default async function handler(req, res) {
  // Aplicar configuração de CORS
  applyCors(req, res);
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Rate limiting - obter IP do cliente
  const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  
  if (!rateLimiter.isAllowed(clientIp)) {
    return res.status(429).json({ 
      error: 'Muitas requisições. Tente novamente em alguns minutos.',
      retryAfter: 900 // 15 minutos em segundos
    });
  }

  const { cep } = req.query;

  // Validação e sanitização robusta do CEP
  if (!cep || typeof cep !== 'string') {
    return res.status(400).json({ error: 'CEP é obrigatório e deve ser uma string.' });
  }

  // Limitar tamanho da entrada para evitar ataques
  if (cep.length > 20) {
    return res.status(400).json({ error: 'CEP muito longo.' });
  }

  // Sanitizar entrada removendo caracteres perigosos
  const cepSanitizado = cep.trim().replace(/[^0-9-]/g, '');
  
  // Validação do formato do CEP
  if (!/^\d{5}-?\d{3}$/.test(cepSanitizado)) {
    return res.status(400).json({ error: 'CEP inválido. Formato esperado: 00000-000 ou 00000000' });
  }

  // Remover hífens e outros caracteres não numéricos
  const cepNumerico = cepSanitizado.replace(/\D/g, '');
  
  // Validação adicional do CEP numérico
  if (cepNumerico.length !== 8 || !/^\d{8}$/.test(cepNumerico)) {
    return res.status(400).json({ error: 'CEP deve conter exatamente 8 dígitos.' });
  }

  try {
    // Verificar se o resultado está em cache
    if (cepCache.has(cepNumerico)) {

      
      // Incrementar contador de buscas no banco mesmo quando usar o cache em memória
      try {
        await supabaseAdmin
          .rpc('increment_cep_search_count', { cep_param: cepNumerico });
      } catch (counterError) {
        // Falha silenciosa no contador
      }
      
      return res.status(200).json(cepCache.get(cepNumerico));
    }

    // Verificar se existe no Supabase (se você decidir implementar o cache persistente)
    const { data: cepCacheData, error: cepCacheError } = await supabaseAdmin
      .from('cep_ibge_cache')
      .select('*')
      .eq('cep', cepNumerico)
      .single();

    if (!cepCacheError && cepCacheData) {
      
      
      // Incrementar contador de buscas no banco
      try {
        await supabaseAdmin
          .rpc('increment_cep_search_count', { cep_param: cepNumerico });
      } catch (counterError) {
        // Falha silenciosa no contador
      }
      
      // Atualizar o cache em memória
      cepCache.set(cepNumerico, cepCacheData.data);
      
      return res.status(200).json(cepCacheData.data);
    }

    // Consultar API do ViaCEP
    
    const viaCepResponse = await fetch(`https://viacep.com.br/ws/${cepNumerico}/json/`);
    
    if (!viaCepResponse.ok) {
      throw new Error(`Erro ao consultar ViaCEP: ${viaCepResponse.statusText}`);
    }
    
    const viaCepData = await viaCepResponse.json();
    
    if (viaCepData.erro) {
      return res.status(404).json({ error: 'CEP não encontrado na base dos Correios' });
    }

    // Extrair o código IBGE do município
    const codigoIBGE = viaCepData.ibge;
    
    if (!codigoIBGE) {
      return res.status(404).json({ 
        error: 'Código IBGE não encontrado para este CEP',
        correios: {
          cidade: viaCepData.localidade,
          uf: viaCepData.uf
        }
      });
    }

    // Consultar API do IBGE para obter a nomenclatura oficial
    
    const ibgeResponse = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${codigoIBGE}`);
    
    if (!ibgeResponse.ok) {
      throw new Error(`Erro ao consultar IBGE: ${ibgeResponse.statusText}`);
    }
    
    const ibgeData = await ibgeResponse.json();

    // Preparar o resultado
    const result = {
      cep: cepNumerico,
      correios: {
        logradouro: viaCepData.logradouro,
        complemento: viaCepData.complemento,
        bairro: viaCepData.bairro,
        cidade: viaCepData.localidade,
        uf: viaCepData.uf
      },
      ibge: {
        codigo: codigoIBGE,
        cidade: ibgeData.nome,
        uf: ibgeData.microrregiao?.mesorregiao?.UF?.sigla || viaCepData.uf
      },
      correspondencia: {
        igual: viaCepData.localidade.toUpperCase() === ibgeData.nome.toUpperCase(),
        observacao: viaCepData.localidade.toUpperCase() === ibgeData.nome.toUpperCase() 
          ? 'Nomenclatura idêntica entre Correios e IBGE' 
          : 'Divergência na nomenclatura: use o nome oficial do IBGE para emissão de NFe'
      }
    };

    // Armazenar no cache em memória
    cepCache.set(cepNumerico, result);

    // Armazenar no Supabase para cache persistente
    try {
      await supabaseAdmin
        .from('cep_ibge_cache')
        .upsert({
          cep: cepNumerico,
          data: result,
          created_at: new Date(),
          updated_at: new Date(),
          search_count: 1
        });
    } catch (cacheError) {
      // Falha silenciosa no cache
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao processar solicitação', message: error.message });
  }
}