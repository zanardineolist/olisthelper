import { getAuthenticatedGoogleSheets, getSheetValues } from '../../utils/googleSheets';
import { supabase } from '../../utils/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userEmail, filterByMonth } = req.query;

  try {
    // 1. Se fornecido email, verificar usuário no Supabase
    let userData = null;
    if (userEmail) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', userEmail)
        .single();

      if (error) {
        console.error('Erro ao verificar usuário:', error);
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      userData = data;
    }

    // 2. Obter registros do Google Sheets
    const records = await getSheetValues('Remoto', 'A:G');
    if (!records || records.length === 0) {
      return res.status(200).json({ 
        allRecords: [],
        monthRecords: [],
        totalCount: 0 
      });
    }

    // 3. Remover cabeçalho e processar registros
    const dataWithoutHeader = records.slice(1);
    
    // 4. Filtrar por usuário se necessário
    let filteredRecords = dataWithoutHeader;
    if (userEmail) {
      filteredRecords = dataWithoutHeader.filter(record => record[3] === userEmail);
    }

    // 5. Processar filtro por mês se solicitado
    let monthRecords = [];
    if (filterByMonth === 'true') {
      const today = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
      const currentDate = new Date(today);
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      monthRecords = filteredRecords.filter(record => {
        const [day, month, year] = record[0].split('/').map(Number);
        const recordDate = new Date(year, month - 1, day);
        return (
          recordDate.getMonth() === currentMonth &&
          recordDate.getFullYear() === currentYear
        );
      });
    }

    // 6. Preparar estatísticas
    const stats = {
      total: filteredRecords.length,
      currentMonth: monthRecords.length,
      byTheme: filteredRecords.reduce((acc, record) => {
        const theme = record[5];
        acc[theme] = (acc[theme] || 0) + 1;
        return acc;
      }, {}),
      byUser: filteredRecords.reduce((acc, record) => {
        const user = record[2];
        acc[user] = (acc[user] || 0) + 1;
        return acc;
      }, {})
    };

    // 7. Formatar registros para resposta
    const formattedRecords = filteredRecords.map(record => ({
      date: record[0],
      time: record[1],
      userName: record[2],
      userEmail: record[3],
      ticket: record[4],
      theme: record[5],
      description: record[6]
    }));

    // 8. Formatar registros do mês atual
    const formattedMonthRecords = monthRecords.map(record => ({
      date: record[0],
      time: record[1],
      userName: record[2],
      userEmail: record[3],
      ticket: record[4],
      theme: record[5],
      description: record[6]
    }));

    // 9. Preparar resposta
    const response = {
      allRecords: formattedRecords,
      monthRecords: formattedMonthRecords,
      stats,
      metadata: {
        totalCount: filteredRecords.length,
        monthCount: monthRecords.length,
        userInfo: userData ? {
          name: userData.name,
          role: userData.role,
          permissions: {
            canEdit: ['super', 'support+'].includes(userData.role),
            canView: true
          }
        } : null,
        lastUpdate: new Date().toISOString(),
        timezone: 'America/Sao_Paulo'
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Erro ao buscar registros:', error);
    return res.status(500).json({ 
      error: 'Erro ao buscar registros. Tente novamente.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}