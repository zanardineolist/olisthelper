import { getAuthenticatedGoogleSheets, getSheetMetaData, appendValuesToSheet } from '../../utils/googleSheets';

export default async function handler(req, res) {
  const { type } = req.query;

  if (!type) {
    return res.status(400).json({ error: 'O tipo de solicitação é obrigatório' });
  }

  switch (req.method) {
    case 'POST':
      await handlePost(req, res, type);
      break;
    case 'PUT':
      await handlePut(req, res, type);
      break;
    case 'DELETE':
      await handleDelete(req, res, type);
      break;
    default:
      res.status(405).json({ error: 'Method Not Allowed' });
      break;
  }
}

async function handlePost(req, res, type) {
  const { userName, userEmail, category, description, analystId } = req.body;

  if (!userName || !userEmail || !category || !description || !analystId) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetMeta = await getSheetMetaData();

    if (type === 'help' || type === 'doubt') {
      // Obter a aba correspondente ao analista
      const sheetName = sheetMeta.data.sheets.find(sheet => sheet.properties.title.startsWith(`#${analystId}`))?.properties.title;

      if (!sheetName) {
        return res.status(400).json({ error: `A aba correspondente ao ID '${analystId}' não existe na planilha.` });
      }

      // Formatar a data e hora atuais para o horário de Brasília (UTC-3)
      const date = new Date();
      const brtDate = new Date(date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      const formattedDate = brtDate.toLocaleDateString('pt-BR');
      const formattedTime = brtDate.toLocaleTimeString('pt-BR');

      // Adicionar os dados na aba do analista
      await appendValuesToSheet(sheetName, [[formattedDate, formattedTime, userName, userEmail, category, description]]);

      res.status(200).json({ message: `${type === 'help' ? 'Ajuda' : 'Dúvida'} registrada com sucesso.` });
    } else if (type === 'user') {
      // Adicionar novo usuário à planilha
      const { name, email, profile, squad, chamado, telefone, chat } = req.body;

      if (!name || !email || !profile) {
        return res.status(400).json({ error: 'Nome, e-mail e perfil são obrigatórios' });
      }

      const userId = Math.floor(1000 + Math.random() * 9000); // Gerar ID aleatório de 4 dígitos

      await appendValuesToSheet('Usuários', [[userId, name, email, profile, squad, chamado, telefone, chat]]);

      res.status(200).json({ message: 'Usuário adicionado com sucesso.' });
    } else {
      res.status(400).json({ error: 'Tipo de solicitação inválido.' });
    }
  } catch (error) {
    console.error('Erro ao processar a solicitação:', error);
    res.status(500).json({ error: 'Erro ao processar a solicitação.' });
  }
}

async function handlePut(req, res, type) {
  if (type !== 'user') {
    return res.status(400).json({ error: 'Operação PUT apenas para gerenciamento de usuários.' });
  }

  const { id, name, email, profile, squad, chamado, telefone, chat } = req.body;

  if (!id || !name || !email || !profile) {
    return res.status(400).json({ error: 'ID, nome, e-mail e perfil são obrigatórios' });
  }

  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetMeta = await getSheetMetaData();

    const rows = await getSheetValues('Usuários', 'A:H');
    const rowIndex = rows.findIndex(row => row[0] === id.toString());

    if (rowIndex === -1) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Atualizar usuário na planilha
    const range = `Usuários!A${rowIndex + 1}:H${rowIndex + 1}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[id, name, email, profile, squad, chamado, telefone, chat]],
      },
    });

    res.status(200).json({ message: 'Usuário atualizado com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar o usuário:', error);
    res.status(500).json({ error: 'Erro ao atualizar o usuário.' });
  }
}

async function handleDelete(req, res, type) {
  if (type !== 'user') {
    return res.status(400).json({ error: 'Operação DELETE apenas para gerenciamento de usuários.' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'ID do usuário é obrigatório' });
  }

  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const rows = await getSheetValues('Usuários', 'A:H');
    const rowIndex = rows.findIndex(row => row[0] === id.toString());

    if (rowIndex === -1) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Deletar usuário na planilha
    const range = `Usuários!A${rowIndex + 1}:H${rowIndex + 1}`;
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.SHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetMeta.data.sheets.find(sheet => sheet.properties.title === 'Usuários').properties.sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          },
        ],
      },
    });

    res.status(200).json({ message: 'Usuário deletado com sucesso.' });
  } catch (error) {
    console.error('Erro ao deletar o usuário:', error);
    res.status(500).json({ error: 'Erro ao deletar o usuário.' });
  }
}
