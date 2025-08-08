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

    // A:G (A=criadoEm, B=link, C=responsavel, D=espacoAtual, E=espacoAdicional, F=dataRemocao, G=situacao)
    const values = await getSheetValuesFromSpecificSheet(spreadsheetId, EXCECAO_DADOS_SHEET_NAME, 'A:G');

    // Converter para objetos legíveis
    const items = (values || []).slice(1).map((row, idx) => ({
      id: idx + 2, // número da linha na planilha (considerando header na linha 1)
      criadoEm: row[0] || '',
      linkChamado: row[1] || '',
      responsavel: row[2] || '',
      espacoAtual: row[3] || '',
      espacoAdicional: row[4] || '',
      dataRemocao: row[5] || '',
      situacao: row[6] || '',
    }));

    return res.status(200).json({ items });
  } catch (error) {
    console.error('Erro ao listar Exceção de Dados:', error);
    return res.status(500).json({ error: 'Erro interno ao listar' });
  }
}


