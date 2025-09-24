// pages/api/daily-counters.js
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { supabaseAdmin } from '../../utils/supabase/supabaseClient';

function isValidDateStr(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.id) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const { method } = req;

  try {
    switch (method) {
      case 'GET': {
        const { analystId, date, startDate, endDate } = req.query;

        if (!analystId) {
          return res.status(400).json({ error: 'analystId é obrigatório' });
        }

        const isSuper = session.role === 'super';
        if (!isSuper && analystId !== session.id) {
          return res.status(403).json({ error: 'Proibido' });
        }

        if (date && !isValidDateStr(date)) {
          return res.status(400).json({ error: 'date inválido. Use YYYY-MM-DD' });
        }

        if ((startDate && !endDate) || (!startDate && endDate)) {
          return res.status(400).json({ error: 'Forneça startDate e endDate juntos' });
        }

        if (startDate && (!isValidDateStr(startDate) || !isValidDateStr(endDate))) {
          return res.status(400).json({ error: 'Datas inválidas. Use YYYY-MM-DD' });
        }

        if (startDate && endDate) {
          // Range de datas
          const { data, error } = await supabaseAdmin
            .from('daily_counters')
            .select('*')
            .eq('analyst_id', analystId)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false });

          if (error) {
            console.error('Erro ao buscar histórico:', error);
            return res.status(500).json({ error: 'Erro ao buscar histórico' });
          }

          const records = data || [];
          const totals = records.reduce(
            (acc, r) => {
              acc.calls += r.calls_count || 0;
              acc.rfcs += r.rfcs_count || 0;
              acc.helps += r.helps_count || 0;
              return acc;
            },
            { calls: 0, rfcs: 0, helps: 0 }
          );

          return res.status(200).json({ records, totals });
        }

        // Dia único (padrão: hoje se nenhum date for enviado)
        const targetDate = date || new Date().toISOString().slice(0, 10);
        const { data, error } = await supabaseAdmin
          .from('daily_counters')
          .select('*')
          .eq('analyst_id', analystId)
          .eq('date', targetDate)
          .maybeSingle();

        if (error) {
          console.error('Erro ao buscar contador diário:', error);
          return res.status(500).json({ error: 'Erro ao buscar contador diário' });
        }

        // Se não existe registro ainda, inicializar helps_count com base em help_records do dia (TZ America/Sao_Paulo)
        if (!data) {
          try {
            // Convertendo a data YYYY-MM-DD (São Paulo) para janela UTC
            const startUTC = new Date(`${targetDate}T03:00:00.000Z`); // 00:00 SP = 03:00Z
            const endUTC = new Date(startUTC.getTime() + (24 * 60 * 60 * 1000) - 1); // 23:59:59.999 SP

            // Usar view São Paulo se existir; fallback para created_at
            let helpsCount = 0;
            const { data: spView, error: spErr } = await supabaseAdmin
              .from('help_records_sao_paulo')
              .select('id')
              .eq('analyst_id', analystId)
              .eq('created_date', targetDate);

            if (!spErr && Array.isArray(spView)) {
              helpsCount = spView.length;
            } else {
              const { data: helpsData, error: helpsErr } = await supabaseAdmin
                .from('help_records')
                .select('id')
                .eq('analyst_id', analystId)
                .gte('created_at', startUTC.toISOString())
                .lte('created_at', endUTC.toISOString());
              if (helpsErr) throw helpsErr;
              helpsCount = helpsData?.length || 0;
            }
            // Persistir inicialização via upsert para manter histórico consistente
            const payload = {
              analyst_id: analystId,
              date: targetDate,
              calls_count: 0,
              rfcs_count: 0,
              helps_count: helpsCount,
            };
            const { data: upserted, error: upsertErr } = await supabaseAdmin
              .from('daily_counters')
              .upsert(payload, { onConflict: 'analyst_id,date' })
              .select()
              .single();

            if (upsertErr) {
              console.error('Erro ao inicializar contadores diários:', upsertErr);
              return res.status(200).json({ record: payload });
            }

            return res.status(200).json({ record: upserted });
          } catch (initErr) {
            console.error('Erro na inicialização dos contadores:', initErr);
            return res.status(200).json({
              record: {
                analyst_id: analystId,
                date: targetDate,
                calls_count: 0,
                rfcs_count: 0,
                helps_count: 0,
              },
            });
          }
        }

        return res.status(200).json({ record: data });
      }

      case 'POST': {
        // Define valores absolutos (upsert)
        const { analystId, date, callsCount = 0, rfcsCount = 0, helpsCount = 0 } = req.body || {};
        if (!analystId || !isValidDateStr(date)) {
          return res.status(400).json({ error: 'analystId e date (YYYY-MM-DD) são obrigatórios' });
        }
        const isSuperPost = session.role === 'super';
        if (!isSuperPost && analystId !== session.id) {
          return res.status(403).json({ error: 'Proibido' });
        }
        if (callsCount < 0 || rfcsCount < 0 || helpsCount < 0) {
          return res.status(400).json({ error: 'Os contadores não podem ser negativos' });
        }

        const payload = {
          analyst_id: analystId,
          date,
          calls_count: Math.floor(callsCount),
          rfcs_count: Math.floor(rfcsCount),
          helps_count: Math.floor(helpsCount),
        };

        const { data, error } = await supabaseAdmin
          .from('daily_counters')
          .upsert(payload, { onConflict: 'analyst_id,date' })
          .select()
          .single();

        if (error) {
          console.error('Erro ao salvar contadores:', error);
          return res.status(500).json({ error: 'Erro ao salvar contadores' });
        }

        return res.status(200).json({ record: data });
      }

      case 'PATCH': {
        // Aplica deltas (incrementos/decrementos)
        const { analystId, date, callsDelta = 0, rfcsDelta = 0, helpsDelta = 0 } = req.body || {};
        if (!analystId || !isValidDateStr(date)) {
          return res.status(400).json({ error: 'analystId e date (YYYY-MM-DD) são obrigatórios' });
        }
        const isSuperPatch = session.role === 'super';
        if (!isSuperPatch && analystId !== session.id) {
          return res.status(403).json({ error: 'Proibido' });
        }
        if ([callsDelta, rfcsDelta, helpsDelta].every((n) => !n)) {
          return res.status(400).json({ error: 'Nenhum delta informado' });
        }

        // Buscar registro existente
        const { data: existing, error: fetchError } = await supabaseAdmin
          .from('daily_counters')
          .select('*')
          .eq('analyst_id', analystId)
          .eq('date', date)
          .maybeSingle();

        if (fetchError) {
          console.error('Erro ao buscar registro existente:', fetchError);
          return res.status(500).json({ error: 'Erro ao atualizar contadores' });
        }

        const current = existing || { calls_count: 0, rfcs_count: 0, helps_count: 0 };
        const next = {
          calls_count: Math.max(0, (current.calls_count || 0) + Math.floor(callsDelta)),
          rfcs_count: Math.max(0, (current.rfcs_count || 0) + Math.floor(rfcsDelta)),
          helps_count: Math.max(0, (current.helps_count || 0) + Math.floor(helpsDelta)),
        };

        const payload = {
          analyst_id: analystId,
          date,
          ...next,
        };

        const { data, error } = await supabaseAdmin
          .from('daily_counters')
          .upsert(payload, { onConflict: 'analyst_id,date' })
          .select()
          .single();

        if (error) {
          console.error('Erro ao aplicar deltas:', error);
          return res.status(500).json({ error: 'Erro ao atualizar contadores' });
        }

        return res.status(200).json({ record: data });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
        return res.status(405).json({ error: `Método ${method} não permitido` });
    }
  } catch (error) {
    console.error('Erro não tratado na API daily-counters:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}


