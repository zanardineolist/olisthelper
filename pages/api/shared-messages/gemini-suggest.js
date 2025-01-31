// pages/api/shared-messages/gemini-suggest.js
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const PROMPT_TEMPLATES = {
  formal: "Reescreva o seguinte texto em um tom mais formal e profissional, mantendo todas as informações importantes:",
  informal: "Reescreva o seguinte texto em um tom mais casual e amigável, mantendo todas as informações importantes:",
  shorter: "Resuma o seguinte texto de forma concisa, mantendo os pontos principais:",
  detailed: "Expanda o seguinte texto adicionando mais detalhes e exemplos relevantes:",
  clarity: "Reescreva o seguinte texto para melhorar a clareza e compreensão, evitando ambiguidades:",
  fix: "Corrija a gramática, pontuação e melhore a estrutura do seguinte texto:"
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { content, promptType } = req.body;
    const prompt = PROMPT_TEMPLATES[promptType];
    
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt + '\n\n' + content);
    const response = result.response.text();

    return res.status(200).json({ suggestion: response });
  } catch (error) {
    console.error('Erro ao gerar sugestão:', error);
    return res.status(500).json({ error: 'Erro ao gerar sugestão' });
  }
}