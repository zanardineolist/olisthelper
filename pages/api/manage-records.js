import { getAnalystSheetDetails, getAnalystRecords, updateAnalystRecord, deleteAnalystRecord } from '../../utils/getAnalystSheetDetails';

export default async function handler(req, res) {
  const { method } = req;
  const { userId } = req.query;

  // Verificação do ID do usuário
  if (!userId) {
    return res.status(400).json({ error: 'User ID não fornecido ou inválido.' });
  }

  try {
    // Obtém detalhes da aba do analista (nome da aba e mapeamento de colunas)
    const { sheetName } = await getAnalystSheetDetails(userId);

    switch (method) {
      case 'GET':
        // Obtém todos os registros do analista
        try {
          const records = await getAnalystRecords(userId);
          return res.status(200).json({ records });
        } catch (error) {
          console.error('Erro ao buscar registros:', error);
          return res.status(500).json({ error: 'Erro ao buscar registros.' });
        }

      case 'PUT':
        // Atualiza um registro existente
        try {
          const { record } = req.body;
          const { index } = req.query;

          if (!record) {
            return res.status(400).json({ error: 'Dados do registro não fornecidos.' });
          }
          if (!index) {
            return res.status(400).json({ error: 'Índice do registro não fornecido.' });
          }

          await updateAnalystRecord(userId, parseInt(index, 10), record);
          return res.status(200).json({ message: 'Registro atualizado com sucesso.' });
        } catch (error) {
          console.error('Erro ao atualizar registro:', error);
          return res.status(500).json({ error: 'Erro ao atualizar registro.' });
        }

      case 'DELETE':
        // Exclui um registro existente
        try {
          const { index } = req.query;

          if (!index) {
            return res.status(400).json({ error: 'Índice do registro não fornecido.' });
          }

          await deleteAnalystRecord(userId, parseInt(index, 10));
          return res.status(200).json({ message: 'Registro excluído com sucesso.' });
        } catch (error) {
          console.error('Erro ao excluir registro:', error);
          return res.status(500).json({ error: 'Erro ao excluir registro.' });
        }

      default:
        // Método não permitido
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).end(`Método ${method} não permitido.`);
    }
  } catch (error) {
    console.error('Erro ao processar requisição de registros:', error);
    return res.status(500).json({ error: 'Erro ao processar requisição.' });
  }
}
