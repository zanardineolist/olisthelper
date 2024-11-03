import { getSheetValues, updateSheetRow, deleteSheetRow, getSheetMetaData } from '../../utils/googleSheets';
import { logAction } from '../../utils/firebase/firebaseLogging';

export default async function handler(req, res) {
  const { method } = req;
  const { userId } = req.query;

  // Extraindo informações do usuário dos cookies (passados pelo middleware)
  const requesterId = req.cookies['user-id'];
  const requesterName = req.cookies['user-name'];
  const requesterRole = req.cookies['user-role'];

  req.user = {
    id: requesterId,
    name: requesterName,
    role: requesterRole,
  };

  console.log('Detalhes do usuário extraídos dos cookies:', req.user);

  const isUserValid = req.user && req.user.id && req.user.name && req.user.role;
  console.log('Usuário é válido:', isUserValid);

  if (!userId) {
    return res.status(400).json({ error: 'User ID não fornecido ou inválido.' });
  }

  try {
    // Obtém os metadados de todas as abas disponíveis na planilha
    const sheetsMetaData = await getSheetMetaData();
    if (!sheetsMetaData || !sheetsMetaData.data || !Array.isArray(sheetsMetaData.data.sheets)) {
      return res.status(500).json({ error: 'Nenhuma aba encontrada nos metadados da planilha.' });
    }

    // Buscar a aba que começa com o ID do analista (por exemplo, "#8487")
    const matchingSheet = sheetsMetaData.data.sheets.find(sheet => 
      sheet.properties.title.startsWith(`#${userId}`)
    );

    if (!matchingSheet) {
      return res.status(404).json({ error: `Aba correspondente ao ID "${userId}" não encontrada.` });
    }

    const sheetName = matchingSheet.properties.title;

    switch (method) {
      case 'GET':
        console.log('Método GET chamado - Carregando registros...');
        try {
          const records = await getSheetValues(sheetName, 'A:F');
          if (records && records.length > 1) {
            const formattedRecords = records.slice(1).map((row, index) => ({
              index,
              date: row[0],
              time: row[1],
              name: row[2],
              email: row[3],
              category: row[4],
              description: row[5],
            }));
            return res.status(200).json({ records: formattedRecords });
          }
          return res.status(404).json({ error: 'Nenhum registro encontrado.' });
        } catch (error) {
          console.error('Erro ao buscar registros:', error);
          return res.status(500).json({ error: 'Erro ao buscar registros.' });
        }

      case 'PUT':
        console.log('Método PUT chamado - Atualizando registro...');
        try {
          const { record } = req.body;
          if (!record) {
            return res.status(400).json({ error: 'Dados do registro não fornecidos.' });
          }

          // Obter valores atuais antes da atualização
          const allRows = await getSheetValues(sheetName, 'A:F');
          const rowIndex = parseInt(req.query.index, 10);
          if (rowIndex < 0 || rowIndex >= allRows.length - 1) {
            return res.status(404).json({ error: 'Registro não encontrado.' });
          }

          const previousData = allRows[rowIndex + 1]; // Obter linha anterior (índice ajustado)

          // Atualizar o registro na planilha
          await updateSheetRow(sheetName, rowIndex + 2, [
            record.date,
            record.time,
            record.name,
            record.email,
            record.category,
            record.description,
          ]);

          if (isUserValid) {
            console.log('Registrando ação de atualização no Firebase...');
            await logAction(req.user.id, req.user.name, req.user.role, 'update_record', 'Registro', {
              date: previousData[0],
              time: previousData[1],
              name: previousData[2],
              email: previousData[3],
              category: previousData[4],
              description: previousData[5],
            }, {
              date: record.date,
              time: record.time,
              name: record.name,
              email: record.email,
              category: record.category,
              description: record.description,
            }, 'manage-records');
            console.log('Ação de atualização registrada com sucesso.');
          }

          return res.status(200).json({ message: 'Registro atualizado com sucesso.' });
        } catch (error) {
          console.error('Erro ao atualizar registro:', error);
          return res.status(500).json({ error: 'Erro ao atualizar registro.' });
        }

      case 'DELETE':
        console.log('Método DELETE chamado - Excluindo registro...');
        try {
          const index = req.query.index;
          if (!index) {
            return res.status(400).json({ error: 'Índice do registro não fornecido.' });
          }

          // Obter valores antes da exclusão
          const allRows = await getSheetValues(sheetName, 'A:F');
          const deleteIndex = parseInt(index, 10);
          if (deleteIndex < 0 || deleteIndex >= allRows.length - 1) {
            return res.status(404).json({ error: 'Registro não encontrado.' });
          }

          const deletedData = allRows[deleteIndex + 1]; // Obter linha a ser excluída

          // Excluir a linha na planilha
          await deleteSheetRow(sheetName, deleteIndex + 2);

          if (isUserValid) {
            console.log('Registrando ação de exclusão no Firebase...');
            await logAction(req.user.id, req.user.name, req.user.role, 'delete_record', 'Registro', {
              date: deletedData[0],
              time: deletedData[1],
              name: deletedData[2],
              email: deletedData[3],
              category: deletedData[4],
              description: deletedData[5],
            }, null, 'manage-records');
            console.log('Ação de exclusão registrada com sucesso.');
          }

          return res.status(200).json({ message: 'Registro excluído com sucesso.' });
        } catch (error) {
          console.error('Erro ao excluir registro:', error);
          return res.status(500).json({ error: 'Erro ao excluir registro.' });
        }

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).end(`Método ${method} não permitido.`);
    }
  } catch (error) {
    console.error('Erro ao processar requisição de registros:', error);
    return res.status(500).json({ error: 'Erro ao processar requisição.' });
  }
}
