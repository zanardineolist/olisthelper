// pages/api/excecao-dados/mark-removed.js
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { EXCECAO_DADOS_SHEET_NAME, getSheetValuesFromSpecificSheet, updateSpecificSheetRange } from '../../../utils/googleSheets';
import { removeExcecaoDadosEventByMatch } from '../../../utils/googleCalendar';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.id) return res.status(401).json({ error: 'Não autorizado' });

  const { criadoEm, linkChamado, responsavel, dataRemocao, espacoAdicional } = req.body || {};
  if (!linkChamado || !responsavel || !dataRemocao) return res.status(400).json({ error: 'Dados insuficientes' });

  const spreadsheetId = process.env.EXCECAO_DADOS_SHEET_ID;
  if (!spreadsheetId) return res.status(500).json({ error: 'EXCECAO_DADOS_SHEET_ID não configurado' });

  try {
    // 1) Encontrar a linha correspondente
    const rows = await getSheetValuesFromSpecificSheet(spreadsheetId, EXCECAO_DADOS_SHEET_NAME, 'A:G');
    // rows[0] é o header. Dados a partir da linha 2
    const idx = rows.findIndex((row, i) => {
      if (i === 0) return false;
      const matchCriado = criadoEm ? (row[0] || '') === criadoEm : true;
      return (
        (row[1] || '') === linkChamado &&
        (row[2] || '') === responsavel &&
        (row[5] || '') === dataRemocao &&
        matchCriado
      );
    });

    if (idx === -1) return res.status(404).json({ error: 'Registro não encontrado na planilha' });
    const rowNumber = idx + 1; // índice base-1

    // 2) Atualizar situação para Removido (coluna G)
    await updateSpecificSheetRange(
      spreadsheetId,
      `${EXCECAO_DADOS_SHEET_NAME}!G${rowNumber}:G${rowNumber}`,
      [[ 'Removido' ]]
    );

    // 3) Remover evento do calendário (se existir)
    const summary = espacoAdicional
      ? `Remover ${espacoAdicional} espaço adicional + ${responsavel}`
      : `Remover dados + ${responsavel}`;
    await removeExcecaoDadosEventByMatch({ date: normalizeToISODate(dataRemocao), summary, description: linkChamado });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Erro ao marcar como removido:', e);
    return res.status(500).json({ error: 'Erro ao marcar como removido' });
  }
}

function normalizeToISODate(brDate) {
  // brDate dd/MM/yyyy -> yyyy-MM-dd
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(brDate)) {
    const [dd, mm, yyyy] = brDate.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(brDate)) return brDate;
  return new Date(brDate).toISOString().slice(0, 10);
}


