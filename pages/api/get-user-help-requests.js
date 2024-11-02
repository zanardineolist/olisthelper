import { getAuthenticatedGoogleSheets, getSheetMetaData, getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userEmail } = req.query;

  if (!userEmail) {
    return res.status(400).json({ error: 'E-mail do usuário é obrigatório' });
  }

  try {
    const sheets = await getAuthenticatedGoogleSheets();
    if (!sheets) {
      return res.status(500).json({ error: 'Erro ao autenticar com Google Sheets. Verifique as credenciais.' });
    }
    const sheetId = process.env.SHEET_ID;

    // Obter metadados da planilha
    const sheetMeta = await getSheetMetaData();
    if (!sheetMeta || !sheetMeta.length) {
      return res.status(500).json({ error: 'Nenhuma aba encontrada na planilha. Verifique o Google Sheets.' });
    }
    const sheetNames = sheetMeta.data.sheets.map(sheet => sheet.properties.title);

    // Filtrar apenas as abas que representam analistas
    const analystSheetNames = sheetNames.filter(name => name.startsWith('#'));

    let currentMonthCount = 0;
    let lastMonthCount = 0;

    // Data atual
    const today = new Date();
    const brtDate = new Date(today.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentMonth = brtDate.getMonth();
    const currentYear = brtDate.getFullYear();

    // Iterar sobre todas as abas de analistas para obter os registros de ajuda
    for (const sheetName of analystSheetNames) {
      const rows = await getSheetValues(sheetName, 'A:F');

      if (rows.length > 0) {
        // Ignorar o cabeçalho
        rows.shift();

        for (const row of rows) {
          const [dateString, , , email] = row;

          if (email === userEmail) {
            const [day, month, year] = dateString.split('/').map(Number);
            const recordDate = new Date(year, month - 1, day);

            // Verificar se o registro pertence ao mês atual ou ao anterior
            if (recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear) {
              currentMonthCount++;
            } else if (
              (recordDate.getMonth() === currentMonth - 1 && recordDate.getFullYear() === currentYear) ||
              (currentMonth === 0 && recordDate.getMonth() === 11 && recordDate.getFullYear() === currentYear - 1)
            ) {
              lastMonthCount++;
            }
          }
        }
      }
    }

    res.status(200).json({
      currentMonth: currentMonthCount,
      lastMonth: lastMonthCount,
    });
  } catch (error) {
    console.error('Erro ao obter ajudas solicitadas:', error);
    res.status(500).json({ error: 'Erro ao obter as ajudas solicitadas. Verifique suas credenciais e a configuração do Google Sheets.' });
  }
}
