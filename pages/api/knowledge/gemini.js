// pages/api/knowledge/gemini.js
import { getUserKnowledgeItems } from '../../../utils/supabase/knowledgeQueries';

export default async function handler(req, res) {
  // Verificar método
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }

  // Extrair informações do usuário dos cookies
  const userId = req.cookies['user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Consulta não fornecida' });
    }

    // Buscar itens de conhecimento do usuário
    const knowledgeItems = await getUserKnowledgeItems(userId);
    
    if (!knowledgeItems || knowledgeItems.length === 0) {
      return res.status(200).json({ 
        response: 'Não encontrei informações relevantes na sua base de conhecimento. Tente adicionar mais itens ou reformular sua pergunta.'
      });
    }

    // Preparar o contexto para o Gemini
    const context = knowledgeItems.map(item => {
      return `Título: ${item.title}\nDescrição: ${item.description}\nTags: ${item.tags.join(', ')}\n---\n`;
    }).join('\n');

    // Construir o prompt para o Gemini
    const prompt = `
    Você é um assistente de conhecimento que ajuda a responder perguntas com base na base de conhecimento do usuário.
    
    BASE DE CONHECIMENTO:\n${context}\n
    PERGUNTA DO USUÁRIO: ${query}
    
    Responda à pergunta do usuário usando APENAS as informações fornecidas na base de conhecimento acima.
    Se a resposta não puder ser encontrada na base de conhecimento, diga que não encontrou informações suficientes e sugira que o usuário adicione mais conhecimento sobre o assunto.
    Formate sua resposta de maneira clara e concisa, usando parágrafos quando apropriado.
    `;

    // Simular resposta do Gemini (em produção, aqui seria a chamada real para a API do Gemini)
    // Esta é uma simulação básica para desenvolvimento
    const simulatedResponse = simulateGeminiResponse(query, knowledgeItems);

    return res.status(200).json({ response: simulatedResponse });
  } catch (error) {
    console.error('Erro ao processar consulta Gemini:', error);
    return res.status(500).json({ error: 'Erro ao processar sua consulta' });
  }
}

// Função para simular resposta do Gemini durante desenvolvimento
function simulateGeminiResponse(query, knowledgeItems) {
  // Converter query e itens para minúsculas para facilitar a comparação
  const lowerQuery = query.toLowerCase();
  
  // Encontrar itens relevantes baseados em palavras-chave da consulta
  const queryWords = lowerQuery.split(/\s+/).filter(word => word.length > 3);
  
  const relevantItems = knowledgeItems.filter(item => {
    const itemText = `${item.title} ${item.description} ${item.tags.join(' ')}`.toLowerCase();
    return queryWords.some(word => itemText.includes(word));
  });

  if (relevantItems.length === 0) {
    return 'Não encontrei informações específicas sobre sua pergunta na base de conhecimento. Considere adicionar mais informações relacionadas a este tópico.';
  }

  // Construir uma resposta baseada nos itens relevantes
  const mostRelevantItem = relevantItems[0];
  
  let response = `Com base na sua base de conhecimento, encontrei as seguintes informações sobre "${query}":\n\n`;
  
  response += `${mostRelevantItem.description}\n\n`;
  
  if (relevantItems.length > 1) {
    response += 'Também encontrei outras informações relacionadas:\n\n';
    
    relevantItems.slice(1, 3).forEach(item => {
      response += `- ${item.title}: ${item.description.substring(0, 100)}${item.description.length > 100 ? '...' : ''}\n`;
    });
  }
  
  return response;
}