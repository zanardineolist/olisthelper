// pages/api/cep-ibge.js
import { supabaseAdmin } from '../../utils/supabase/supabaseClient';

// Cache para armazenar consultas anteriores e reduzir chamadas à API
const cepCache = new Map();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { cep } = req.query;

  // Validação básica do CEP
  if (!cep || !/^\d{5}-?\d{3}$/.test(cep)) {
    return res.status(400).json({ error: 'CEP inválido. Formato esperado: 00000-000 ou 00000000' });
  }

  // Remover hífens e outros caracteres não numéricos
  const cepNumerico = cep.replace(/\D/g, '');

  try {
    // Verificar se o resultado está em cache
    if (cepCache.has(cepNumerico)) {
      console.log(`Usando cache para o CEP ${cepNumerico}`);
      return res.status(200).json(cepCache.get(cepNumerico));
    }

    // Verificar se existe no Supabase (se você decidir implementar o cache persistente)
    const { data: cepCacheData, error: cepCacheError } = await supabaseAdmin
      .from('cep_ibge_cache')
      .select('*')
      .eq('cep', cepNumerico)
      .single();

    if (!cepCacheError && cepCacheData) {
      console.log(`Usando cache do banco para o CEP ${cepNumerico}`);
      
      // Atualizar o cache em memória
      cepCache.set(cepNumerico, cepCacheData.data);
      
      return res.status(200).json(cepCacheData.data);
    }

    // Consultar API do ViaCEP
    console.log(`Consultando ViaCEP para o CEP ${cepNumerico}`);
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
    console.log(`Consultando IBGE para o código ${codigoIBGE}`);
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
          updated_at: new Date()
        });
    } catch (cacheError) {
      // Apenas registrar erro de cache, não interromper a resposta
      console.error('Erro ao armazenar no cache:', cacheError);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Erro ao processar solicitação:', error);
    return res.status(500).json({ error: 'Erro ao processar solicitação', message: error.message });
  }
}