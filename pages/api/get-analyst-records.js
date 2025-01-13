import { supabase } from '../../utils/supabaseClient';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Configurar o timezone corretamente
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Sao_Paulo");

export default async function handler(req, res) {
  const { analystId, mode, filter } = req.query;

  if (!analystId || analystId === 'undefined') {
    console.log('Erro: ID do analista não fornecido ou inválido.');
    return res.status(400).json({ error: 'ID do analista é obrigatório e deve ser válido.' });
  }

  try {
    console.log(`Buscando registros no Supabase para o analista: ${analystId}`);

    // Buscar registros de ajuda relacionados ao analista
    const { data: helpRequests, error } = await supabase
      .from('help_requests')
      .select(`
        *,
        categories (
          name
        )
      `)
      .eq('analyst_id', analystId.trim())
      .order('request_date', { ascending: false });

    if (error) {
      console.error('Erro na consulta ao Supabase:', error);
      throw error;
    }

    if (!helpRequests || helpRequests.length === 0) {
      console.log('Nenhum registro encontrado.');
      return res.status(200).json({ count: 0, rows: [] });
    }

    console.log(`Total de registros encontrados: ${helpRequests.length}`);

    // Lógica para o modo "profile" (mês atual e mês anterior)
    if (mode === 'profile') {
      const now = dayjs();
      const currentMonth = now.month() + 1; // Mês atual (0-11)
      const currentYear = now.year();

      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      let currentMonthCount = 0;
      let lastMonthCount = 0;

      helpRequests.forEach(({ request_date }) => {
        if (!request_date) return;

        const [year, month] = request_date.split('-').map(Number);

        if (year === currentYear && month === currentMonth) {
          currentMonthCount++;
        } else if (year === lastMonthYear && month === lastMonth) {
          lastMonthCount++;
        }
      });

      return res.status(200).json({
        currentMonth: currentMonthCount,
        lastMonth: lastMonthCount,
        rows: helpRequests.map(request => ({
          ...request,
          category_name: request.categories?.name || 'Categoria não encontrada'
        })),
      });
    }

    // Lógica padrão com filtro de data
    const currentDate = dayjs();
    const filteredRows = helpRequests.filter(({ request_date }) => {
      if (!request_date) return false;

      const diffDays = currentDate.diff(dayjs(request_date), 'day');
      return diffDays <= (filter ? parseInt(filter, 10) : 30);
    });

    if (!filteredRows || filteredRows.length === 0) {
      console.log('Nenhum registro encontrado após o filtro.');
      return res.status(200).json({ count: 0, dates: [], counts: [], rows: [] });
    }

    console.log(`Total de registros após o filtro: ${filteredRows.length}`);

    const dates = filteredRows.map(({ request_date }) => request_date);
    const countsObj = dates.reduce((acc, date) => {
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    return res.status(200).json({
      count: filteredRows.length,
      dates: Object.keys(countsObj),
      counts: Object.values(countsObj),
      rows: filteredRows.map(request => ({
        ...request,
        category_name: request.categories?.name || 'Categoria não encontrada'
      })),
    });

  } catch (error) {
    console.error('Erro ao obter registros do analista:', error);
    return res.status(500).json({ error: 'Erro ao obter registros.' });
  }
}
