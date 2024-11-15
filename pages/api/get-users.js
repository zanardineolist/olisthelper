// pages/api/get-users.js
import { getAuthenticatedGoogleSheets, getSheetValues } from '../../utils/googleSheets';
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.GOOGLE_SHEET_ID_MAIN;

    // Buscar dados dos usuários na aba 'Usuários'
    const rows = await getSheetValues(sheets, sheetId, 'Usuários', 'A2:H');

    if (rows && rows.length > 0) {
      // Buscar informações adicionais de cada usuário usando o endpoint consolidado 'get-user-details'
      const users = await Promise.all(
        rows.map(async row => {
          const userEmail = row[2];
          const basicInfo = {
            id: row[0],
            name: row[1],
            email: userEmail,
            role: row[3],
            squad: row[4],
            chamado: row[5] === 'TRUE',
            telefone: row[6] === 'TRUE',
            chat: row[7] === 'TRUE',
          };

          try {
            // Fazer uma chamada para o novo endpoint consolidado 'get-user-details'
            const userDetailsResponse = await axios.get(`${process.env.BASE_URL}/api/users/${userEmail}/details`);
            return {
              ...basicInfo,
              ...userDetailsResponse.data,
            };
          } catch (error) {
            console.error(`Erro ao obter dados adicionais para o usuário ${userEmail}:`, error);
            return { ...basicInfo, error: 'Erro ao obter dados adicionais.' };
          }
        })
      );

      return res.status(200).json({ users });
    }

    return res.status(404).json({ error: 'Nenhum usuário encontrado.' });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return res.status(500).json({ error: 'Erro ao buscar usuários. Verifique suas credenciais e a configuração do Google Sheets.' });
  }
}
