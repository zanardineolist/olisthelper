import { getSheetValues, addSheetRow, updateSheetRow, deleteSheetRow, getAuthenticatedGoogleSheets } from '../../utils/googleSheets';
import { logAction } from '../../utils/firebase/firebaseLogging';

// Função para ordenar categorias em ordem alfabética pelo nome
async function sortCategoriesByName(sheetName) {
  const sheets = await getAuthenticatedGoogleSheets();
  const sheetId = process.env.SHEET_ID;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    resource: {
      requests: [
        {
          sortRange: {
            range: {
              sheetId: 0, // Atualize conforme necessário
              startRowIndex: 1, // Ignorar a linha de cabeçalho
              endRowIndex: null, // Até o final
              startColumnIndex: 0,
              endColumnIndex: 1, // Apenas a coluna A para categorias
            },
            sortSpecs: [
              {
                dimensionIndex: 0, // Índice da coluna A (nome)
                sortOrder: 'ASCENDING',
              },
            ],
          },
        },
      ],
    },
  });
}

export default async function handler(req, res) {
  const { method } = req;
  const sheetName = 'Categorias';

  // Extraindo informações do usuário dos headers
  const userId = req.headers['x-user-id'];
  const userName = req.headers['x-user-name'];
  const userRole = req.headers['x-user-role'];

  req.user = {
    id: userId,
    name: userName,
    role: userRole,
  };

  console.log('Detalhes do usuário extraídos dos headers:', req.user);

  // Verificar se req.user está completo
  const isUserValid = req.user && req.user.id && req.user.name && req.user.role;

  console.log('Usuário é válido:', isUserValid);

  try {
    switch (method) {
      case 'POST':
        const newCategoryName = req.body.name;
        if (!newCategoryName) {
          return res.status(400).json({ error: 'Nome da categoria não fornecido.' });
        }

        await addSheetRow(sheetName, [newCategoryName]);
        await sortCategoriesByName(sheetName); // Ordenar categorias após adicionar

        if (isUserValid) {
          console.log('Tentando registrar ação de criar categoria.');
          await logAction(req.user.id, req.user.name, req.user.role, 'create_category', 'Categoria', null, { categoryName: newCategoryName });
          console.log('Ação de criar categoria registrada com sucesso.');
        }

        return res.status(201).json({ message: 'Categoria adicionada com sucesso.' });

      // (Casos PUT e DELETE também podem incluir os mesmos logs para depuração)

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Método ${method} não permitido.`);
    }
  } catch (error) {
    console.error('Erro ao processar requisição de categoria:', error);
    return res.status(500).json({ error: 'Erro ao processar requisição.' });
  }
}
