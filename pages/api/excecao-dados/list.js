// pages/api/excecao-dados/list.js
import { getSheetValuesFromSpecificSheet, EXCECAO_DADOS_SHEET_NAME } from '../../../utils/googleSheets';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.id) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const spreadsheetId = process.env.EXCECAO_DADOS_SHEET_ID;
    if (!spreadsheetId) {
      return res.status(500).json({ error: 'EXCECAO_DADOS_SHEET_ID não configurado' });
    }

    // A:F conforme especificação
    const values = await getSheetValuesFromSpecificSheet(spreadsheetId, EXCECAO_DADOS_SHEET_NAME, 'A:F');

    // Converter para objetos legíveis
    const items = (values || []).slice(1).map((row, idx) => ({
      id: idx + 1, // índice relativo (não persistente)
      linkChamado: row[0] || '',
      responsavel: row[1] || '',
      espacoAtual: row[2] || '',
      espacoAdicional: row[3] || '',
      dataRemocao: row[4] || '',
      situacao: row[5] || '',
    }));

    return res.status(200).json({ items });
  } catch (error) {
    console.error('Erro ao listar Exceção de Dados:', error);
    return res.status(500).json({ error: 'Erro interno ao listar' });
  }
}


